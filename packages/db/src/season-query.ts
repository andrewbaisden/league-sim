import {
  type CompetitionRules,
  calculateStandings,
  type Fixture,
  type FixtureStatus,
  type RatingSet,
  type StandingRow,
  type Team,
} from "@leaguesim/domain";
import { db } from "./client";
import { demoTeams } from "./demo-catalog";
import {
  DEMO_COMPETITION_SLUG,
  DEMO_PROVIDER,
  DEMO_SEASON_KEY,
  DEMO_SEASON_LABEL,
  DEMO_SNAPSHOT_FINGERPRINT,
} from "./ids";

const demoStarsBySlug = new Map(
  demoTeams.map((team) => [team.id, team.stars] as const).filter((entry) => entry[1] !== undefined),
);

export interface PersistedSeasonView {
  id: string;
  logicalSeasonId: string;
  baseSnapshotId: string;
  competition: { id: string; name: string; slug: string };
  label: string;
  currentMatchweek: number;
  dataMode: "DEMO" | "PROVIDER";
  lastUpdatedAt: string;
  teams: Team[];
  fixtures: Fixture[];
  standings: StandingRow[];
  ratings: RatingSet;
  rules: CompetitionRules;
}

function asNumber(value: { toNumber(): number } | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

export async function loadPersistedDemoSeason(): Promise<PersistedSeasonView | null> {
  const snapshotInclude = {
    season: {
      include: {
        competition: true,
        ruleSet: true,
        teamSeasons: { include: { team: true } },
        fixtures: {
          include: {
            result: true,
            homeTeamSeason: { include: { team: true } },
            awayTeamSeason: { include: { team: true } },
            providerMaps: { where: { provider: DEMO_PROVIDER } },
          },
          orderBy: [{ matchweek: "asc" as const }, { kickoff: "asc" as const }],
        },
      },
    },
    ratingSet: {
      include: {
        ratings: { include: { teamSeason: { include: { team: true } } } },
      },
    },
  };

  let snapshot = await db.simulationBaseSnapshot.findUnique({
    where: { fingerprint: DEMO_SNAPSHOT_FINGERPRINT },
    include: snapshotInclude,
  });

  // Fall back to the latest demo-season snapshot if the fingerprint changed between seeds.
  if (!snapshot?.season.ruleSet) {
    snapshot = await db.simulationBaseSnapshot.findFirst({
      where: {
        season: {
          label: DEMO_SEASON_LABEL,
          competition: { slug: DEMO_COMPETITION_SLUG },
        },
      },
      orderBy: [{ cutoffAt: "desc" }, { createdAt: "desc" }],
      include: snapshotInclude,
    });
  }

  if (!snapshot?.season.ruleSet) return null;

  const teams: Team[] = snapshot.season.teamSeasons
    .map((membership) => {
      const stars = demoStarsBySlug.get(membership.team.slug);
      return {
        id: membership.team.slug,
        name: membership.team.name,
        shortName: membership.team.shortName,
        abbreviation: membership.team.abbreviation,
        ...(stars !== undefined ? { stars } : {}),
      };
    })
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const fixtures: Fixture[] = snapshot.season.fixtures.map((fixture) => {
    const externalId = fixture.providerMaps[0]?.externalId ?? fixture.id;
    return {
      id: externalId,
      homeTeamId: fixture.homeTeamSeason.team.slug,
      awayTeamId: fixture.awayTeamSeason.team.slug,
      kickoff: fixture.kickoff.toISOString(),
      matchweek: fixture.matchweek ?? 0,
      status: fixture.status as FixtureStatus,
      ...(fixture.venue ? { venue: fixture.venue } : {}),
      ...(fixture.result
        ? {
            score: {
              home: fixture.result.homeGoals,
              away: fixture.result.awayGoals,
              confirmed: fixture.result.confirmed,
            },
          }
        : {}),
    };
  });

  const rules: CompetitionRules = {
    teamCount: snapshot.season.ruleSet.teamCount,
    pointsForWin: snapshot.season.ruleSet.pointsForWin,
    pointsForDraw: snapshot.season.ruleSet.pointsForDraw,
    pointsForLoss: snapshot.season.ruleSet.pointsForLoss,
    fixturesPerPair: snapshot.season.ruleSet.fixturesPerPair,
    rankingCriteria: snapshot.season.ruleSet
      .rankingCriteria as unknown as CompetitionRules["rankingCriteria"],
    zones: snapshot.season.ruleSet.zones as unknown as CompetitionRules["zones"],
  };

  const ratings: RatingSet = {
    modelVersion: (snapshot.ratingSet.modelVersion === "poisson-stars-v1"
      ? "poisson-stars-v1"
      : "poisson-v1") as RatingSet["modelVersion"],
    leagueHomeGoals: asNumber(snapshot.ratingSet.leagueHomeGoals),
    leagueAwayGoals: asNumber(snapshot.ratingSet.leagueAwayGoals),
    priorEquivalentMatches: snapshot.ratingSet.priorEquivalentMatches,
    recentWeight: asNumber(snapshot.ratingSet.recentWeight),
    ratings: snapshot.ratingSet.ratings.map((rating) => {
      const sample = rating.sample as {
        homeMatches?: number;
        awayMatches?: number;
        recentMatches?: number;
        stars?: number;
        attackMultiplier?: number;
        defenceMultiplier?: number;
      };
      const stars = sample.stars ?? demoStarsBySlug.get(rating.teamSeason.team.slug);
      return {
        teamId: rating.teamSeason.team.slug,
        homeAttack: asNumber(rating.homeAttack),
        awayAttack: asNumber(rating.awayAttack),
        homeDefence: asNumber(rating.homeDefence),
        awayDefence: asNumber(rating.awayDefence),
        recentAttack: asNumber(rating.recentAttack),
        recentDefence: asNumber(rating.recentDefence),
        homeMatches: Number(sample.homeMatches ?? 0),
        awayMatches: Number(sample.awayMatches ?? 0),
        recentMatches: Number(sample.recentMatches ?? 0),
        ...(stars !== undefined ? { stars } : {}),
        ...(sample.attackMultiplier !== undefined
          ? { attackMultiplier: sample.attackMultiplier }
          : {}),
        ...(sample.defenceMultiplier !== undefined
          ? { defenceMultiplier: sample.defenceMultiplier }
          : {}),
      };
    }),
  };

  const standings = calculateStandings({ teams, fixtures, rules });

  return {
    id: snapshot.season.id,
    logicalSeasonId: DEMO_SEASON_KEY,
    baseSnapshotId: snapshot.id,
    competition: {
      id: snapshot.season.competition.id,
      name: snapshot.season.competition.name,
      slug: snapshot.season.competition.slug,
    },
    label: snapshot.season.label,
    currentMatchweek: snapshot.season.currentMatchweek ?? 1,
    dataMode: "DEMO",
    lastUpdatedAt: snapshot.cutoffAt.toISOString(),
    teams,
    fixtures,
    standings,
    ratings,
    rules,
  };
}

export async function loadSeasonBatchView(batchId: string) {
  const batch = await db.simulationBatch.findUnique({
    where: { id: batchId },
    include: {
      fixtures: {
        include: {
          fixture: {
            include: {
              homeTeamSeason: { include: { team: true } },
              awayTeamSeason: { include: { team: true } },
              providerMaps: { where: { provider: DEMO_PROVIDER } },
              result: true,
            },
          },
        },
      },
      baseSnapshot: {
        include: {
          season: {
            include: {
              competition: true,
              ruleSet: true,
              teamSeasons: { include: { team: true } },
              fixtures: {
                include: {
                  result: true,
                  homeTeamSeason: { include: { team: true } },
                  awayTeamSeason: { include: { team: true } },
                  providerMaps: { where: { provider: DEMO_PROVIDER } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (batch?.kind !== "SEASON") return null;
  const season = batch.baseSnapshot.season;
  if (!season.ruleSet) return null;

  const teams: Team[] = season.teamSeasons.map((membership) => {
    const stars = demoStarsBySlug.get(membership.team.slug);
    return {
      id: membership.team.slug,
      name: membership.team.name,
      shortName: membership.team.shortName,
      abbreviation: membership.team.abbreviation,
      ...(stars !== undefined ? { stars } : {}),
    };
  });

  const simulated = new Map(
    batch.fixtures.map((row) => [row.fixture.providerMaps[0]?.externalId ?? row.fixtureId, row]),
  );

  const fixtures: Fixture[] = season.fixtures.map((fixture) => {
    const externalId = fixture.providerMaps[0]?.externalId ?? fixture.id;
    const simulatedRow = simulated.get(externalId);
    if (simulatedRow) {
      return {
        id: externalId,
        homeTeamId: fixture.homeTeamSeason.team.slug,
        awayTeamId: fixture.awayTeamSeason.team.slug,
        kickoff: fixture.kickoff.toISOString(),
        matchweek: fixture.matchweek ?? 0,
        status: "FINISHED" as const,
        ...(fixture.venue ? { venue: fixture.venue } : {}),
        score: {
          home: simulatedRow.homeGoals,
          away: simulatedRow.awayGoals,
          confirmed: true,
        },
      };
    }
    return {
      id: externalId,
      homeTeamId: fixture.homeTeamSeason.team.slug,
      awayTeamId: fixture.awayTeamSeason.team.slug,
      kickoff: fixture.kickoff.toISOString(),
      matchweek: fixture.matchweek ?? 0,
      status: fixture.status as FixtureStatus,
      ...(fixture.venue ? { venue: fixture.venue } : {}),
      ...(fixture.result
        ? {
            score: {
              home: fixture.result.homeGoals,
              away: fixture.result.awayGoals,
              confirmed: fixture.result.confirmed,
            },
          }
        : {}),
    };
  });

  const rules: CompetitionRules = {
    teamCount: season.ruleSet.teamCount,
    pointsForWin: season.ruleSet.pointsForWin,
    pointsForDraw: season.ruleSet.pointsForDraw,
    pointsForLoss: season.ruleSet.pointsForLoss,
    fixturesPerPair: season.ruleSet.fixturesPerPair,
    rankingCriteria: season.ruleSet
      .rankingCriteria as unknown as CompetitionRules["rankingCriteria"],
    zones: season.ruleSet.zones as unknown as CompetitionRules["zones"],
  };

  return {
    batchId: batch.id,
    scenarioId: batch.scenarioId,
    seed: Number(batch.seed),
    modelVersion: batch.modelVersion,
    reality: "SIMULATION" as const,
    teams,
    fixtures,
    standings: calculateStandings({ teams, fixtures, rules }),
    competitionSlug: season.competition.slug,
    seasonLabel: season.label,
  };
}

export async function seasonIsSeeded(): Promise<boolean> {
  const competition = await db.competition.findUnique({
    where: { slug: DEMO_COMPETITION_SLUG },
    select: { id: true },
  });
  if (!competition) return false;
  const season = await db.season.findUnique({
    where: { competitionId_label: { competitionId: competition.id, label: DEMO_SEASON_LABEL } },
    select: { id: true },
  });
  return Boolean(season);
}
