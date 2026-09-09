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
    expect(season.ratings.modelVersion).toBe("poisson-stars-v1");
    expect(season.teams.every((team) => team.stars !== undefined)).toBe(true);
    expect(season.teams.find((team) => team.id === "arsenal")?.stars).toBe(5);
    expect(season.teams.find((team) => team.id === "hull")?.stars).toBe(2.5);
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

  it("schedules complete matchweeks in typical UK broadcast slots", () => {
    const season = getDemoSeason();
    const londonTime = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/London",
    });
    const labelsFor = (matchweek: number) =>
      season.fixtures
        .filter((fixture) => fixture.matchweek === matchweek)
        .map((fixture) => londonTime.format(new Date(fixture.kickoff)));

    expect(labelsFor(1)).toEqual([
      "Fri 20:00",
      "Sat 12:30",
      "Sat 15:00",
      "Sat 15:00",
      "Sat 15:00",
      "Sat 15:00",
      "Sat 15:00",
      "Sat 17:30",
      "Sun 14:00",
      "Sun 16:30",
    ]);
    expect(labelsFor(2)).toContain("Mon 20:00");
    expect(labelsFor(20)).toEqual([
      "Tue 19:45",
      "Tue 19:45",
      "Tue 19:45",
      "Tue 19:45",
      "Tue 19:45",
      "Wed 20:00",
      "Wed 20:00",
      "Wed 20:00",
      "Wed 20:00",
      "Wed 20:00",
    ]);
    expect(labelsFor(21)).toContain("Mon 20:00");
    expect(
      Array.from({ length: 38 }, (_, index) => index + 1).every(
        (matchweek) => labelsFor(matchweek).length === 10,
      ),
    ).toBe(true);
  });
});
