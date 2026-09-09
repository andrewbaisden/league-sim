import type {
  CompetitionData,
  FixtureData,
  FootballDataProvider,
  ProviderCapabilities,
  ProviderCompetitionRef,
  ProviderSeasonRef,
  StandingData,
  TeamData,
} from "./types";

const RETRIEVED_AT = "2026-09-07T18:00:00.000Z";

const teams: TeamData[] = [
  { externalId: "demo-ars", name: "Arsenal", shortName: "Arsenal", abbreviation: "ARS" },
  { externalId: "demo-avl", name: "Aston Villa", shortName: "Aston Villa", abbreviation: "AVL" },
  { externalId: "demo-bou", name: "Bournemouth", shortName: "Bournemouth", abbreviation: "BOU" },
  { externalId: "demo-bre", name: "Brentford", shortName: "Brentford", abbreviation: "BRE" },
];

const fixtures: FixtureData[] = [
  {
    externalId: "demo-match-1",
    kickoff: "2026-08-15T14:00:00.000Z",
    matchweek: 1,
    status: "FINISHED",
    homeTeamExternalId: "demo-ars",
    awayTeamExternalId: "demo-avl",
    score: { home: 2, away: 0, confirmed: true },
    providerUpdatedAt: RETRIEVED_AT,
  },
  {
    externalId: "demo-match-2",
    kickoff: "2026-08-15T14:00:00.000Z",
    matchweek: 1,
    status: "FINISHED",
    homeTeamExternalId: "demo-bou",
    awayTeamExternalId: "demo-bre",
    score: { home: 1, away: 1, confirmed: true },
    providerUpdatedAt: RETRIEVED_AT,
  },
  {
    externalId: "demo-match-3",
    kickoff: "2026-08-22T14:00:00.000Z",
    matchweek: 2,
    status: "SCHEDULED",
    homeTeamExternalId: "demo-avl",
    awayTeamExternalId: "demo-bou",
    providerUpdatedAt: RETRIEVED_AT,
  },
  {
    externalId: "demo-match-4",
    kickoff: "2026-08-22T16:30:00.000Z",
    matchweek: 2,
    status: "SCHEDULED",
    homeTeamExternalId: "demo-bre",
    awayTeamExternalId: "demo-ars",
    providerUpdatedAt: RETRIEVED_AT,
  },
];

const standings: StandingData[] = [
  {
    teamExternalId: "demo-ars",
    position: 1,
    played: 1,
    won: 1,
    drawn: 0,
    lost: 0,
    goalsFor: 2,
    goalsAgainst: 0,
    points: 3,
  },
  {
    teamExternalId: "demo-bou",
    position: 2,
    played: 1,
    won: 0,
    drawn: 1,
    lost: 0,
    goalsFor: 1,
    goalsAgainst: 1,
    points: 1,
  },
  {
    teamExternalId: "demo-bre",
    position: 2,
    played: 1,
    won: 0,
    drawn: 1,
    lost: 0,
    goalsFor: 1,
    goalsAgainst: 1,
    points: 1,
  },
  {
    teamExternalId: "demo-avl",
    position: 4,
    played: 1,
    won: 0,
    drawn: 0,
    lost: 1,
    goalsFor: 0,
    goalsAgainst: 2,
    points: 0,
  },
];

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** A fixed provider for setup, CI, screenshots, and deterministic contract tests. */
export class DemoFootballDataProvider implements FootballDataProvider {
  capabilities(): ProviderCapabilities {
    return { liveScores: false, standings: true, historicalSeasons: true, delayedScores: false };
  }

  async getCompetition(_ref: ProviderCompetitionRef): Promise<CompetitionData> {
    return {
      externalId: "demo-pl",
      name: "Premier League (demo)",
      code: "PL-DEMO",
      countryCode: "ENG",
      currentSeason: {
        externalId: "demo-pl-2026",
        startDate: "2026-08-15",
        endDate: "2027-05-23",
        matchweek: 2,
      },
    };
  }

  async getTeams(_ref: ProviderSeasonRef): Promise<TeamData[]> {
    return clone(teams);
  }

  async getFixtures(_ref: ProviderSeasonRef, since?: Date): Promise<FixtureData[]> {
    return clone(
      since ? fixtures.filter((fixture) => new Date(fixture.kickoff) >= since) : fixtures,
    );
  }

  async getStandings(_ref: ProviderSeasonRef): Promise<StandingData[]> {
    return clone(standings);
  }
}
