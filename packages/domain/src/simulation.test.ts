import { describe, expect, it } from "vitest";
import { runMonteCarlo } from "./monte-carlo";
import { calculateMatchProbability } from "./poisson";
import { createRandom, deriveSeed } from "./random";
import { calculateRatings } from "./ratings";
import { simulateSeason } from "./simulation";
import type { CompetitionRules, Fixture, Team } from "./types";

const teams: Team[] = [
  { id: "a", name: "Alpha", shortName: "Alpha", abbreviation: "ALP" },
  { id: "b", name: "Bravo", shortName: "Bravo", abbreviation: "BRA" },
];
const fixtures: Fixture[] = [
  {
    id: "played",
    homeTeamId: "a",
    awayTeamId: "b",
    kickoff: "2026-08-01T14:00:00Z",
    matchweek: 1,
    status: "FINISHED",
    score: { home: 2, away: 0, confirmed: true },
  },
  {
    id: "next",
    homeTeamId: "b",
    awayTeamId: "a",
    kickoff: "2026-08-08T14:00:00Z",
    matchweek: 2,
    status: "SCHEDULED",
  },
];
const rules: CompetitionRules = {
  teamCount: 2,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  fixturesPerPair: 2,
  rankingCriteria: ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR"],
  zones: [{ id: "down", label: "Relegation", from: 2, to: 2, kind: "RELEGATION" }],
};
const ratings = calculateRatings(teams, fixtures);

describe("simulation domain", () => {
  it("normalizes outcome and scoreline probabilities", () => {
    const nextFixture = fixtures[1];
    if (!nextFixture) throw new Error("Missing golden upcoming fixture");
    const probability = calculateMatchProbability(nextFixture, ratings);
    expect(probability.homeWin + probability.draw + probability.awayWin).toBeCloseTo(1, 10);
    expect(probability.scorelines.reduce((sum, score) => sum + score.probability, 0)).toBeCloseTo(
      1,
      10,
    );
    expect(
      probability.scorelines.every((score) => score.homeGoals >= 0 && score.awayGoals >= 0),
    ).toBe(true);
    expect(probability.tailProbability).toBeGreaterThanOrEqual(0);
    expect(probability.tailProbability).toBeLessThan(0.000002);
  });

  it("reproduces random streams and season outcomes", () => {
    const first = createRandom(42);
    const second = createRandom(42);
    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
    const input = { teams, fixtures, rules, ratings, seed: 9182 };
    expect(simulateSeason(input)).toEqual(simulateSeason(input));
    expect(runMonteCarlo({ ...input, runs: 100 }).projections).toEqual(
      runMonteCarlo({ ...input, runs: 100 }).projections,
    );
    expect(deriveSeed(42, 0)).not.toBe(deriveSeed(42, 1));
  });

  it("honours exact scenario overrides", () => {
    const result = simulateSeason({
      teams,
      fixtures,
      rules,
      ratings,
      seed: 1,
      overrides: [{ fixtureId: "next", kind: "EXACT_SCORE", homeGoals: 4, awayGoals: 1 }],
    });
    expect(result.fixtures[0]).toMatchObject({ homeGoals: 4, awayGoals: 1, source: "OVERRIDE" });
  });

  it("aggregates position probabilities without losing mass", () => {
    const result = runMonteCarlo({ teams, fixtures, rules, ratings, seed: 44, runs: 100 });
    for (const projection of result.projections) {
      expect(projection.positionProbabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
        1,
        10,
      );
    }
  });
});
