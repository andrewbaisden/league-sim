import { z } from "zod";
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

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().nullable().optional(),
  tla: z.string().nullable().optional(),
});

const competitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  area: z.object({ code: z.string().nullable().optional() }),
  currentSeason: z
    .object({
      id: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      currentMatchday: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const matchSchema = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: z.string(),
  matchday: z.number().nullable().optional(),
  lastUpdated: z.string(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: z.object({
    fullTime: z.object({ home: z.number().nullable(), away: z.number().nullable() }),
  }),
});

const standingRowSchema = z.object({
  position: z.number(),
  team: teamSchema,
  playedGames: z.number(),
  won: z.number(),
  draw: z.number(),
  lost: z.number(),
  points: z.number(),
  goalsFor: z.number(),
  goalsAgainst: z.number(),
});

const mapStatus = (status: string): FixtureData["status"] => {
  const statuses: Record<string, FixtureData["status"]> = {
    SCHEDULED: "SCHEDULED",
    TIMED: "SCHEDULED",
    IN_PLAY: "LIVE",
    PAUSED: "HALF_TIME",
    FINISHED: "FINISHED",
    POSTPONED: "POSTPONED",
    SUSPENDED: "SUSPENDED",
    CANCELLED: "CANCELLED",
  };
  return statuses[status] ?? "SCHEDULED";
};

export class FootballDataOrgProvider implements FootballDataProvider {
  readonly #token: string;
  readonly #baseUrl: string;

  constructor(token: string, baseUrl = "https://api.football-data.org/v4") {
    this.#token = token;
    this.#baseUrl = baseUrl;
  }

  capabilities(): ProviderCapabilities {
    return { liveScores: false, standings: true, historicalSeasons: false, delayedScores: true };
  }

  async #get(path: string): Promise<unknown> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      headers: { "X-Auth-Token": this.#token, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`football-data.org request failed with ${response.status}`);
    return response.json();
  }

  async getCompetition(ref: ProviderCompetitionRef): Promise<CompetitionData> {
    const value = competitionSchema.parse(await this.#get(`/competitions/${ref.externalId}`));
    const season = value.currentSeason;
    return {
      externalId: String(value.id),
      name: value.name,
      code: value.code,
      countryCode: value.area.code ?? "UNK",
      ...(season
        ? {
            currentSeason: {
              externalId: String(season.id),
              startDate: season.startDate,
              endDate: season.endDate,
              ...(season.currentMatchday ? { matchweek: season.currentMatchday } : {}),
            },
          }
        : {}),
    };
  }

  async getTeams(ref: ProviderSeasonRef): Promise<TeamData[]> {
    const response = z
      .object({ teams: z.array(teamSchema) })
      .parse(
        await this.#get(`/competitions/${ref.competitionExternalId}/teams?season=${ref.startYear}`),
      );
    return response.teams.map((team) => ({
      externalId: String(team.id),
      name: team.name,
      shortName: team.shortName ?? team.name,
      abbreviation: team.tla ?? team.name.slice(0, 3).toUpperCase(),
    }));
  }

  async getFixtures(ref: ProviderSeasonRef, since?: Date): Promise<FixtureData[]> {
    const dateFilter = since ? `&dateFrom=${since.toISOString().slice(0, 10)}` : "";
    const response = z
      .object({ matches: z.array(matchSchema) })
      .parse(
        await this.#get(
          `/competitions/${ref.competitionExternalId}/matches?season=${ref.startYear}${dateFilter}`,
        ),
      );
    return response.matches.map((match) => {
      const home = match.score.fullTime.home;
      const away = match.score.fullTime.away;
      const status = mapStatus(match.status);
      return {
        externalId: String(match.id),
        kickoff: match.utcDate,
        ...(match.matchday ? { matchweek: match.matchday } : {}),
        status,
        homeTeamExternalId: String(match.homeTeam.id),
        awayTeamExternalId: String(match.awayTeam.id),
        ...(home !== null && away !== null
          ? { score: { home, away, confirmed: status === "FINISHED" } }
          : {}),
        providerUpdatedAt: match.lastUpdated,
      };
    });
  }

  async getStandings(ref: ProviderSeasonRef): Promise<StandingData[]> {
    const response = z
      .object({
        standings: z.array(z.object({ type: z.string(), table: z.array(standingRowSchema) })),
      })
      .parse(
        await this.#get(
          `/competitions/${ref.competitionExternalId}/standings?season=${ref.startYear}`,
        ),
      );
    const table = response.standings.find((standing) => standing.type === "TOTAL")?.table ?? [];
    return table.map((row) => ({
      teamExternalId: String(row.team.id),
      position: row.position,
      played: row.playedGames,
      won: row.won,
      drawn: row.draw,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      points: row.points,
    }));
  }
}
