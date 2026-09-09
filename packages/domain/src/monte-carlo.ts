import { deriveSeed } from "./random";
import { prepareSeasonProbabilities, simulateSeason } from "./simulation";
import type { MonteCarloResult, SeasonSimulationInput, TeamProjection } from "./types";

export function runMonteCarlo(
  input: Omit<SeasonSimulationInput, "seed"> & { seed: number; runs: number },
): MonteCarloResult {
  if (!Number.isInteger(input.runs) || input.runs < 1 || input.runs > 10_000) {
    throw new Error("Simulation count must be an integer between 1 and 10,000");
  }
  const started = performance.now();
  const teamCount = input.teams.length;
  const totals = new Map(
    input.teams.map((team) => [
      team.id,
      {
        points: 0,
        position: 0,
        title: 0,
        topFour: 0,
        topSix: 0,
        relegation: 0,
        positions: Array<number>(teamCount).fill(0),
      },
    ]),
  );
  const relegationFrom =
    input.rules.zones.find((zone) => zone.kind === "RELEGATION")?.from ??
    Math.max(1, teamCount - 2);
  const preparedProbabilities = prepareSeasonProbabilities(input);

  for (let runIndex = 0; runIndex < input.runs; runIndex += 1) {
    const result = simulateSeason(
      { ...input, seed: deriveSeed(input.seed, runIndex) },
      preparedProbabilities,
    );
    let index = 0;
    while (index < result.standings.length) {
      const first = result.standings[index];
      if (!first) break;
      let end = index + 1;
      while (end < result.standings.length && result.standings[end]?.position === first.position)
        end += 1;
      const occupiedPositions = Array.from(
        { length: end - index },
        (_, offset) => index + offset + 1,
      );
      const share = 1 / occupiedPositions.length;
      for (let rowIndex = index; rowIndex < end; rowIndex += 1) {
        const row = result.standings[rowIndex];
        if (!row) continue;
        const total = totals.get(row.teamId);
        if (!total) continue;
        total.points += row.points;
        total.position += occupiedPositions.reduce((sum, position) => sum + position, 0) * share;
        for (const position of occupiedPositions) {
          const positionIndex = position - 1;
          total.positions[positionIndex] = (total.positions[positionIndex] ?? 0) + share;
          if (position === 1) total.title += share;
          if (position <= 4) total.topFour += share;
          if (position <= 6) total.topSix += share;
          if (position >= relegationFrom) total.relegation += share;
        }
      }
      index = end;
    }
  }

  const projections: TeamProjection[] = input.teams
    .map((team) => {
      const total = totals.get(team.id);
      if (!total) throw new Error(`Missing aggregate for ${team.id}`);
      return {
        teamId: team.id,
        expectedPoints: total.points / input.runs,
        expectedPosition: total.position / input.runs,
        titleProbability: total.title / input.runs,
        topFourProbability: total.topFour / input.runs,
        topSixProbability: total.topSix / input.runs,
        relegationProbability: total.relegation / input.runs,
        positionProbabilities: total.positions.map((count) => count / input.runs),
      };
    })
    .toSorted((a, b) => a.expectedPosition - b.expectedPosition);

  const durationMs = performance.now() - started;
  const remainingFixtures = input.fixtures.filter(
    (fixture) => fixture.status === "SCHEDULED" || fixture.status === "POSTPONED",
  ).length;
  return {
    seed: input.seed >>> 0,
    runs: input.runs,
    modelVersion: "poisson-v1",
    durationMs,
    fixturesSimulated: remainingFixtures * input.runs,
    projections,
  };
}
