import { Prisma } from "@prisma/client";
import { db } from "../src/client";
import {
  buildDemoSeasonCatalog,
  demoFixtures,
  demoRatings,
  demoStandings,
  demoTeams,
  premierLeagueRules,
} from "../src/demo-catalog";
import {
  DEMO_COMPETITION_SLUG,
  DEMO_PROVIDER,
  DEMO_SEASON_KEY,
  DEMO_SEASON_LABEL,
  DEMO_SNAPSHOT_FINGERPRINT,
  deterministicUuid,
} from "../src/ids";

async function main() {
  const catalog = buildDemoSeasonCatalog();
  const countryId = deterministicUuid("country", "ENG");
  const competitionId = deterministicUuid("competition", DEMO_COMPETITION_SLUG);
  const seasonId = deterministicUuid("season", DEMO_SEASON_KEY);
  const ruleSetId = deterministicUuid("ruleset", DEMO_SEASON_KEY);
  const ratingSetId = deterministicUuid("ratingset", DEMO_SEASON_KEY);
  const snapshotId = deterministicUuid("basesnapshot", DEMO_SNAPSHOT_FINGERPRINT);
  const standingSnapshotId = deterministicUuid("standings", DEMO_SNAPSHOT_FINGERPRINT);
  const cutoffAt = new Date(catalog.lastUpdatedAt);

  await db.country.upsert({
    where: { code: "ENG" },
    create: { id: countryId, code: "ENG", name: "England" },
    update: { name: "England" },
  });

  await db.competition.upsert({
    where: { slug: DEMO_COMPETITION_SLUG },
    create: {
      id: competitionId,
      countryId,
      slug: DEMO_COMPETITION_SLUG,
      name: "Premier League",
      format: "LEAGUE",
      active: true,
    },
    update: { name: "Premier League", active: true, countryId },
  });

  await db.season.upsert({
    where: { competitionId_label: { competitionId, label: DEMO_SEASON_LABEL } },
    create: {
      id: seasonId,
      competitionId,
      label: DEMO_SEASON_LABEL,
      startsAt: new Date("2026-08-14T00:00:00.000Z"),
      endsAt: new Date("2027-05-23T23:59:59.000Z"),
      status: "UPCOMING",
      currentMatchweek: 1,
    },
    update: {
      startsAt: new Date("2026-08-14T00:00:00.000Z"),
      endsAt: new Date("2027-05-23T23:59:59.000Z"),
      status: "UPCOMING",
      currentMatchweek: 1,
    },
  });

  await db.competitionRuleSet.upsert({
    where: { seasonId },
    create: {
      id: ruleSetId,
      seasonId,
      version: "pl-2026-27-v1",
      teamCount: premierLeagueRules.teamCount,
      pointsForWin: premierLeagueRules.pointsForWin,
      pointsForDraw: premierLeagueRules.pointsForDraw,
      pointsForLoss: premierLeagueRules.pointsForLoss,
      fixturesPerPair: premierLeagueRules.fixturesPerPair,
      rankingCriteria: premierLeagueRules.rankingCriteria,
      zones: premierLeagueRules.zones,
    },
    update: {
      version: "pl-2026-27-v1",
      teamCount: premierLeagueRules.teamCount,
      rankingCriteria: premierLeagueRules.rankingCriteria,
      zones: premierLeagueRules.zones,
    },
  });

  const teamSeasonBySlug = new Map<string, string>();
  for (const team of demoTeams) {
    const teamId = deterministicUuid("team", team.id);
    const teamSeasonId = deterministicUuid("teamseason", `${DEMO_SEASON_KEY}:${team.id}`);
    await db.team.upsert({
      where: { slug: team.id },
      create: {
        id: teamId,
        countryId,
        slug: team.id,
        name: team.name,
        shortName: team.shortName,
        abbreviation: team.abbreviation,
      },
      update: {
        name: team.name,
        shortName: team.shortName,
        abbreviation: team.abbreviation,
        countryId,
      },
    });
    await db.teamSeason.upsert({
      where: { seasonId_teamId: { seasonId, teamId } },
      create: { id: teamSeasonId, seasonId, teamId },
      update: {},
    });
    teamSeasonBySlug.set(team.id, teamSeasonId);
  }

  for (const fixture of demoFixtures) {
    const fixtureId = deterministicUuid("fixture", fixture.id);
    const homeTeamSeasonId = teamSeasonBySlug.get(fixture.homeTeamId);
    const awayTeamSeasonId = teamSeasonBySlug.get(fixture.awayTeamId);
    if (!homeTeamSeasonId || !awayTeamSeasonId) {
      throw new Error(`Missing team season for fixture ${fixture.id}`);
    }
    await db.fixture.upsert({
      where: { id: fixtureId },
      create: {
        id: fixtureId,
        seasonId,
        homeTeamSeasonId,
        awayTeamSeasonId,
        kickoff: new Date(fixture.kickoff),
        matchweek: fixture.matchweek,
        venue: fixture.venue,
        status: fixture.status,
        lastSyncedAt: cutoffAt,
      },
      update: {
        homeTeamSeasonId,
        awayTeamSeasonId,
        kickoff: new Date(fixture.kickoff),
        matchweek: fixture.matchweek,
        venue: fixture.venue,
        status: fixture.status,
        lastSyncedAt: cutoffAt,
      },
    });
    await db.providerFixtureMap.upsert({
      where: {
        provider_externalId: { provider: DEMO_PROVIDER, externalId: fixture.id },
      },
      create: {
        id: deterministicUuid("fixturemap", fixture.id),
        provider: DEMO_PROVIDER,
        externalId: fixture.id,
        fixtureId,
      },
      update: { fixtureId },
    });
  }

  await db.teamRatingSet.upsert({
    where: { id: ratingSetId },
    create: {
      id: ratingSetId,
      seasonId,
      cutoffAt,
      modelVersion: demoRatings.modelVersion,
      leagueHomeGoals: new Prisma.Decimal(demoRatings.leagueHomeGoals),
      leagueAwayGoals: new Prisma.Decimal(demoRatings.leagueAwayGoals),
      priorEquivalentMatches: demoRatings.priorEquivalentMatches,
      recentWeight: new Prisma.Decimal(demoRatings.recentWeight),
    },
    update: {
      cutoffAt,
      modelVersion: demoRatings.modelVersion,
      leagueHomeGoals: new Prisma.Decimal(demoRatings.leagueHomeGoals),
      leagueAwayGoals: new Prisma.Decimal(demoRatings.leagueAwayGoals),
      priorEquivalentMatches: demoRatings.priorEquivalentMatches,
      recentWeight: new Prisma.Decimal(demoRatings.recentWeight),
    },
  });

  for (const rating of demoRatings.ratings) {
    const teamSeasonId = teamSeasonBySlug.get(rating.teamId);
    if (!teamSeasonId) throw new Error(`Missing team season for rating ${rating.teamId}`);
    await db.teamRatingSnapshot.upsert({
      where: { ratingSetId_teamSeasonId: { ratingSetId, teamSeasonId } },
      create: {
        id: deterministicUuid("rating", `${DEMO_SEASON_KEY}:${rating.teamId}`),
        ratingSetId,
        teamSeasonId,
        homeAttack: new Prisma.Decimal(rating.homeAttack),
        awayAttack: new Prisma.Decimal(rating.awayAttack),
        homeDefence: new Prisma.Decimal(rating.homeDefence),
        awayDefence: new Prisma.Decimal(rating.awayDefence),
        recentAttack: new Prisma.Decimal(rating.recentAttack),
        recentDefence: new Prisma.Decimal(rating.recentDefence),
        sample: {
          homeMatches: rating.homeMatches,
          awayMatches: rating.awayMatches,
          recentMatches: rating.recentMatches,
        },
      },
      update: {
        homeAttack: new Prisma.Decimal(rating.homeAttack),
        awayAttack: new Prisma.Decimal(rating.awayAttack),
        homeDefence: new Prisma.Decimal(rating.homeDefence),
        awayDefence: new Prisma.Decimal(rating.awayDefence),
        recentAttack: new Prisma.Decimal(rating.recentAttack),
        recentDefence: new Prisma.Decimal(rating.recentDefence),
        sample: {
          homeMatches: rating.homeMatches,
          awayMatches: rating.awayMatches,
          recentMatches: rating.recentMatches,
        },
      },
    });
  }

  await db.standingSnapshotRow.deleteMany({
    where: { snapshot: { seasonId, dataFingerprint: DEMO_SNAPSHOT_FINGERPRINT } },
  });
  await db.standingSnapshot.deleteMany({
    where: { seasonId, dataFingerprint: DEMO_SNAPSHOT_FINGERPRINT },
  });
  await db.standingSnapshot.create({
    data: {
      id: standingSnapshotId,
      seasonId,
      cutoffAt,
      matchweek: 0,
      ruleVersion: "pl-2026-27-v1",
      dataFingerprint: DEMO_SNAPSHOT_FINGERPRINT,
      rows: {
        create: demoStandings.map((row) => ({
          id: deterministicUuid("standingrow", `${DEMO_SEASON_KEY}:${row.teamId}`),
          teamSeasonId: teamSeasonBySlug.get(row.teamId) as string,
          position: row.position,
          played: row.played,
          wins: row.wins,
          draws: row.draws,
          losses: row.losses,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
          points: row.points,
          form: row.form,
          tieUnresolved: row.tieUnresolved,
        })),
      },
    },
  });

  await db.simulationBaseSnapshot.upsert({
    where: { fingerprint: DEMO_SNAPSHOT_FINGERPRINT },
    create: {
      id: snapshotId,
      seasonId,
      ruleSetId,
      ratingSetId,
      cutoffAt,
      modelVersion: "poisson-v1",
      fingerprint: DEMO_SNAPSHOT_FINGERPRINT,
      manifest: {
        logicalSeasonId: DEMO_SEASON_KEY,
        competitionSlug: DEMO_COMPETITION_SLUG,
        label: DEMO_SEASON_LABEL,
        fixtureCount: demoFixtures.length,
        teamCount: demoTeams.length,
        dataMode: "DEMO",
      },
    },
    update: {
      ruleSetId,
      ratingSetId,
      cutoffAt,
      modelVersion: "poisson-v1",
      manifest: {
        logicalSeasonId: DEMO_SEASON_KEY,
        competitionSlug: DEMO_COMPETITION_SLUG,
        label: DEMO_SEASON_LABEL,
        fixtureCount: demoFixtures.length,
        teamCount: demoTeams.length,
        dataMode: "DEMO",
      },
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      seasonId,
      baseSnapshotId: snapshotId,
      teams: demoTeams.length,
      fixtures: demoFixtures.length,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
