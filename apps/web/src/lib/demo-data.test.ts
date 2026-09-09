import { describe, expect, it } from "vitest";
import { getDemoSeason } from "./demo-data";

describe("demo season initial snapshot", () => {
  it("starts before matchweek one with an alphabetical zero-stat table", () => {
    const season = getDemoSeason();

    expect(season.currentMatchweek).toBe(1);
    expect(season.fixtures).toHaveLength(380);
    expect(season.fixtures.every((fixture) => fixture.status === "SCHEDULED")).toBe(true);
    expect(season.fixtures.every((fixture) => fixture.score === undefined)).toBe(true);
    expect(season.teams.map((team) => team.name).toSorted((a, b) => a.localeCompare(b))).toEqual([
      "AFC Bournemouth",
      "Arsenal",
      "Aston Villa",
      "Brentford",
      "Brighton & Hove Albion",
      "Chelsea",
      "Coventry City",
      "Crystal Palace",
      "Everton",
      "Fulham",
      "Hull City",
      "Ipswich Town",
      "Leeds United",
      "Liverpool",
      "Manchester City",
      "Manchester United",
      "Newcastle United",
      "Nottingham Forest",
      "Sunderland",
      "Tottenham Hotspur",
    ]);
    expect(
      season.standings.every(
        (row) =>
          row.played === 0 &&
          row.wins === 0 &&
          row.draws === 0 &&
          row.losses === 0 &&
          row.goalsFor === 0 &&
          row.goalsAgainst === 0 &&
          row.goalDifference === 0 &&
          row.points === 0 &&
          row.form.length === 0,
      ),
    ).toBe(true);
  });
});
