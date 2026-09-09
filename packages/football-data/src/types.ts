import type { FixtureStatus } from "@leaguesim/domain";

export interface ProviderCapabilities {
  liveScores: boolean;
  standings: boolean;
  historicalSeasons: boolean;
  delayedScores: boolean;
}

export interface ProviderCompetitionRef {
  externalId: string;
}
export interface ProviderSeasonRef {
  competitionExternalId: string;
  startYear: number;
}

export interface CompetitionData {
  externalId: string;
  name: string;
  code: string;
  countryCode: string;
  currentSeason?: { externalId: string; startDate: string; endDate: string; matchweek?: number };
}

export interface TeamData {
  externalId: string;
  name: string;
  shortName: string;
  abbreviation: string;
}

export interface FixtureData {
  externalId: string;
  kickoff: string;
  matchweek?: number;
  status: FixtureStatus;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  score?: { home: number; away: number; confirmed: boolean };
  providerUpdatedAt: string;
}

export interface StandingData {
  teamExternalId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface FootballDataProvider {
  capabilities(): ProviderCapabilities;
  getCompetition(ref: ProviderCompetitionRef): Promise<CompetitionData>;
  getTeams(ref: ProviderSeasonRef): Promise<TeamData[]>;
  getFixtures(ref: ProviderSeasonRef, since?: Date): Promise<FixtureData[]>;
  getStandings(ref: ProviderSeasonRef): Promise<StandingData[]>;
}
