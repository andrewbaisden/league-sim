import {
  buildDemoSeasonCatalog,
  DEMO_SEASON_KEY,
  databaseAvailable,
  demoFixtures,
  demoRatings,
  demoStandings,
  demoTeams,
  loadPersistedDemoSeason,
  premierLeagueRules,
} from "@leaguesim/db";

export const DEMO_SEASON_ID = DEMO_SEASON_KEY;
export { demoFixtures, demoRatings, demoStandings, demoTeams, premierLeagueRules };

export function getDemoSeason() {
  const catalog = buildDemoSeasonCatalog();
  return {
    id: catalog.logicalSeasonId,
    competition: catalog.competition,
    label: catalog.label,
    currentMatchweek: catalog.currentMatchweek,
    dataMode: catalog.dataMode,
    lastUpdatedAt: catalog.lastUpdatedAt,
    teams: catalog.teams,
    fixtures: catalog.fixtures,
    standings: catalog.standings,
    ratings: catalog.ratings,
    rules: catalog.rules,
    baseSnapshotId: undefined as string | undefined,
  };
}

export async function getActiveSeason() {
  if (await databaseAvailable()) {
    const persisted = await loadPersistedDemoSeason();
    if (persisted) {
      return {
        id: persisted.logicalSeasonId,
        seasonRecordId: persisted.id,
        baseSnapshotId: persisted.baseSnapshotId,
        competition: persisted.competition,
        label: persisted.label,
        currentMatchweek: persisted.currentMatchweek,
        dataMode: persisted.dataMode,
        lastUpdatedAt: persisted.lastUpdatedAt,
        teams: persisted.teams,
        fixtures: persisted.fixtures,
        standings: persisted.standings,
        ratings: persisted.ratings,
        rules: persisted.rules,
        persisted: true as const,
      };
    }
  }
  return { ...getDemoSeason(), seasonRecordId: undefined, persisted: false as const };
}

export function findTeam(teamId: string) {
  return demoTeams.find((team) => team.id === teamId);
}

export function findFixture(fixtureId: string) {
  return demoFixtures.find((fixture) => fixture.id === fixtureId);
}
