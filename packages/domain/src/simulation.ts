import { calculateMatchProbability, outcomeForScore } from "./poisson";
import type { RandomSource } from "./random";
import { createRandom } from "./random";
import { calculateStandings } from "./standings";
import type {
  Fixture,
  FixtureOverride,
  MatchOutcome,
  MatchProbability,
  SeasonSimulationInput,
  SeasonSimulationResult,
  SimulatedFixture,
} from "./types";

export type PreparedMatchProbabilities = ReadonlyMap<string, MatchProbability>;

function weightedSample(
  probability: MatchProbability,
  random: RandomSource,
  outcome?: MatchOutcome,
): { homeGoals: number; awayGoals: number } {
  const candidates = outcome
    ? probability.scorelines.filter(
        (scoreline) => outcomeForScore(scoreline.homeGoals, scoreline.awayGoals) === outcome,
      )
    : probability.scorelines;
  const total = candidates.reduce((sum, scoreline) => sum + scoreline.probability, 0);
  let target = random.next() * total;
  for (const candidate of candidates) {
    target -= candidate.probability;
    if (target <= 0) return { homeGoals: candidate.homeGoals, awayGoals: candidate.awayGoals };
  }
  const fallback = candidates.at(-1);
  if (!fallback) throw new Error("No scoreline available for requested outcome");
  return { homeGoals: fallback.homeGoals, awayGoals: fallback.awayGoals };
}

export function simulateMatch(
  probability: MatchProbability,
  seed: number,
  outcome?: MatchOutcome,
): { homeGoals: number; awayGoals: number } {
  return weightedSample(probability, createRandom(seed), outcome);
}

function simulatedResult(
  fixture: Fixture,
  override: FixtureOverride | undefined,
  probability: MatchProbability,
  random: RandomSource,
): SimulatedFixture {
  const score =
    override?.kind === "EXACT_SCORE"
      ? { homeGoals: override.homeGoals, awayGoals: override.awayGoals }
      : weightedSample(
          probability,
          random,
          override?.kind === "OUTCOME" ? override.outcome : undefined,
        );
  return {
    fixtureId: fixture.id,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    ...score,
    source: override ? "OVERRIDE" : "SAMPLED",
  };
}

export function prepareSeasonProbabilities(
  input: Omit<SeasonSimulationInput, "seed">,
): PreparedMatchProbabilities {
  return new Map(
    input.fixtures
      .filter((fixture) => fixture.status === "SCHEDULED" || fixture.status === "POSTPONED")
      .map((fixture) => [
        fixture.id,
        calculateMatchProbability(fixture, input.ratings, input.adjustments),
      ]),
  );
}

export function simulateSeason(
  input: SeasonSimulationInput,
  preparedProbabilities?: PreparedMatchProbabilities,
): SeasonSimulationResult {
  const random = createRandom(input.seed);
  const overrides = new Map(
    (input.overrides ?? []).map((override) => [override.fixtureId, override]),
  );
  const remaining = input.fixtures.filter(
    (fixture) => fixture.status === "SCHEDULED" || fixture.status === "POSTPONED",
  );
  const simulated = remaining.map((fixture) => {
    const probability =
      preparedProbabilities?.get(fixture.id) ??
      calculateMatchProbability(fixture, input.ratings, input.adjustments);
    return simulatedResult(fixture, overrides.get(fixture.id), probability, random);
  });
  const simulatedById = new Map(simulated.map((fixture) => [fixture.fixtureId, fixture]));
  const completedFixtures: Fixture[] = input.fixtures.map((fixture) => {
    const result = simulatedById.get(fixture.id);
    if (!result) return fixture;
    return {
      ...fixture,
      status: "FINISHED",
      score: { home: result.homeGoals, away: result.awayGoals, confirmed: true },
    };
  });

  return {
    seed: input.seed >>> 0,
    modelVersion: input.ratings.modelVersion,
    fixtures: simulated,
    standings: calculateStandings({
      teams: input.teams,
      fixtures: completedFixtures,
      rules: input.rules,
    }),
  };
}
