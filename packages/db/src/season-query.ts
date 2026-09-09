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
import {
  DEMO_COMPETITION_SLUG,
  DEMO_PROVIDER,
  DEMO_SEASON_KEY,
  DEMO_SEASON_LABEL,
  DEMO_SNAPSHOT_FINGERPRINT,
} from "./ids";

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
  const snapshot = await db.simulationBaseSnapshot.findUnique({
    where: { fingerprint: DEMO_SNAPSHOT_FINGERPRINT },
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
            orderBy: [{ matchweek: "asc" }, { kickoff: "asc" }],
          },
        },
      },
      ratingSet: {
        include: {
          ratings: { include: { teamSeason: { include: { team: true } } } },
        },
      },
    },
  });
  if (!snapshot?.season.ruleSet) return null;

  const teams: Team[] = snapshot.season.teamSeasons
    .map((membership) => ({
      id: membership.team.slug,
      name: membership.team.name,
      shortName: membership.team.shortName,
      abbreviation: membership.team.abbreviation,
    }))
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
    modelVersion: "poisson-v1",
    leagueHomeGoals: asNumber(snapshot.ratingSet.leagueHomeGoals),
    leagueAwayGoals: asNumber(snapshot.ratingSet.leagueAwayGoals),
    priorEquivalentMatches: snapshot.ratingSet.priorEquivalentMatches,
    recentWeight: asNumber(snapshot.ratingSet.recentWeight),
    ratings: snapshot.ratingSet.ratings.map((rating) => ({
      teamId: rating.teamSeason.team.slug,
      homeAttack: asNumber(rating.homeAttack),
      awayAttack: asNumber(rating.awayAttack),
      homeDefence: asNumber(rating.homeDefence),
      awayDefence: asNumber(rating.awayDefence),
      recentAttack: asNumber(rating.recentAttack),
      recentDefence: asNumber(rating.recentDefence),
      homeMatches: Number((rating.sample as { homeMatches?: number }).homeMatches ?? 0),
      awayMatches: Number((rating.sample as { awayMatches?: number }).awayMatches ?? 0),
      recentMatches: Number((rating.sample as { recentMatches?: number }).recentMatches ?? 0),
    })),
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

  const teams: Team[] = season.teamSeasons.map((membership) => ({
    id: membership.team.slug,
    name: membership.team.name,
    shortName: membership.team.shortName,
    abbreviation: membership.team.abbreviation,
  }));

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
