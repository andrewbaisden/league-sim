import { describe, expect, it } from "vitest";
import { calculateStandings } from "./standings";
import type { CompetitionRules, Fixture, Team } from "./types";

const teams: Team[] = [
  { id: "a", name: "Alpha", shortName: "Alpha", abbreviation: "ALP" },
  { id: "b", name: "Bravo", shortName: "Bravo", abbreviation: "BRA" },
  { id: "c", name: "Charlie", shortName: "Charlie", abbreviation: "CHA" },
  { id: "d", name: "Delta", shortName: "Delta", abbreviation: "DEL" },
];

const rules: CompetitionRules = {
  teamCount: 4,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  fixturesPerPair: 2,
  rankingCriteria: ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR", "HEAD_TO_HEAD_POINTS"],
  zones: [{ id: "down", label: "Relegation", from: 4, to: 4, kind: "RELEGATION" }],
};

const fixture = (
  id: string,
  home: string,
  away: string,
  hg: number,
  ag: number,
  day: number,
): Fixture => ({
  id,
  homeTeamId: home,
  awayTeamId: away,
  kickoff: `2026-08-${String(day).padStart(2, "0")}T14:00:00.000Z`,
  matchweek: day,
  status: "FINISHED",
  score: { home: hg, away: ag, confirmed: true },
});

describe("calculateStandings", () => {
  it("derives a complete table and form from confirmed results", () => {
    const rows = calculateStandings({
      teams,
      rules,
      fixtures: [
        fixture("1", "a", "b", 2, 0, 1),
        fixture("2", "c", "d", 1, 1, 1),
        fixture("3", "a", "c", 0, 1, 2),
      ],
    });
    expect(rows.map((row) => row.teamId)).toEqual(["c", "a", "d", "b"]);
    expect(rows[0]).toMatchObject({
      played: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      goalsFor: 2,
      goalsAgainst: 1,
      points: 4,
    });
    expect(rows.find((row) => row.teamId === "a")?.form).toEqual(["W", "L"]);
    for (const row of rows) {
      expect(row.played).toBe(row.wins + row.draws + row.losses);
      expect(row.goalDifference).toBe(row.goalsFor - row.goalsAgainst);
    }
  });

  it("ignores unconfirmed and non-finished scores", () => {
    const rows = calculateStandings({
      teams,
      rules,
      fixtures: [{ ...fixture("1", "a", "b", 3, 0, 1), status: "LIVE" }],
    });
    expect(rows.every((row) => row.played === 0)).toBe(true);
  });

  it("marks completely unresolved teams with a shared rank", () => {
    const rows = calculateStandings({
      teams: teams.slice(0, 2),
      rules: { ...rules, teamCount: 2 },
      fixtures: [],
    });
    expect(rows.map((row) => row.position)).toEqual([1, 1]);
    expect(rows.every((row) => row.tieUnresolved)).toBe(true);
  });
});
