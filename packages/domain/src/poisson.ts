import type {
  Fixture,
  MatchOutcome,
  MatchProbability,
  RatingSet,
  ScoreProbability,
  TeamAdjustment,
} from "./types";

const MAX_GOALS = 15;
const CDF_TARGET = 0.999999;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function poissonProbability(goals: number, lambda: number): number {
  if (!Number.isInteger(goals) || goals < 0 || !Number.isFinite(lambda) || lambda <= 0) return 0;
  let factorial = 1;
  for (let value = 2; value <= goals; value += 1) factorial *= value;
  return (Math.exp(-lambda) * lambda ** goals) / factorial;
}

function marginal(lambda: number): { probabilities: number[]; tail: number } {
  const probabilities: number[] = [];
  let cumulative = 0;
  for (let goals = 0; goals <= MAX_GOALS; goals += 1) {
    const probability = poissonProbability(goals, lambda);
    probabilities.push(probability);
    cumulative += probability;
    if (cumulative >= CDF_TARGET) break;
  }
  return { probabilities, tail: Math.max(0, 1 - cumulative) };
}

export function outcomeForScore(homeGoals: number, awayGoals: number): MatchOutcome {
  return homeGoals > awayGoals ? "HOME" : homeGoals < awayGoals ? "AWAY" : "DRAW";
}

export function calculateMatchProbability(
  fixture: Fixture,
  ratingSet: RatingSet,
  adjustments: TeamAdjustment[] = [],
): MatchProbability {
  const home = ratingSet.ratings.find((rating) => rating.teamId === fixture.homeTeamId);
  const away = ratingSet.ratings.find((rating) => rating.teamId === fixture.awayTeamId);
  if (!home || !away) throw new Error(`Ratings missing for fixture ${fixture.id}`);
  const homeAdjustment = adjustments.find((item) => item.teamId === fixture.homeTeamId);
  const awayAdjustment = adjustments.find((item) => item.teamId === fixture.awayTeamId);
  const homeAttackMultiplier = homeAdjustment?.attackMultiplier ?? 1;
  const homeDefenceMultiplier = homeAdjustment?.defenceMultiplier ?? 1;
  const awayAttackMultiplier = awayAdjustment?.attackMultiplier ?? 1;
  const awayDefenceMultiplier = awayAdjustment?.defenceMultiplier ?? 1;

  const lambdaHome = clamp(
    (ratingSet.leagueHomeGoals * home.homeAttack * homeAttackMultiplier) /
      (away.awayDefence * awayDefenceMultiplier),
    0.05,
    5,
  );
  const lambdaAway = clamp(
    (ratingSet.leagueAwayGoals * away.awayAttack * awayAttackMultiplier) /
      (home.homeDefence * homeDefenceMultiplier),
    0.05,
    5,
  );
  const homeGoals = marginal(lambdaHome);
  const awayGoals = marginal(lambdaAway);
  const rawScorelines: ScoreProbability[] = [];
  let represented = 0;
  for (let homeIndex = 0; homeIndex < homeGoals.probabilities.length; homeIndex += 1) {
    for (let awayIndex = 0; awayIndex < awayGoals.probabilities.length; awayIndex += 1) {
      const probability =
        (homeGoals.probabilities[homeIndex] ?? 0) * (awayGoals.probabilities[awayIndex] ?? 0);
      represented += probability;
      rawScorelines.push({ homeGoals: homeIndex, awayGoals: awayIndex, probability });
    }
  }
  const scorelines = rawScorelines.map((scoreline) => ({
    ...scoreline,
    probability: scoreline.probability / represented,
  }));
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (const scoreline of scorelines) {
    const outcome = outcomeForScore(scoreline.homeGoals, scoreline.awayGoals);
    if (outcome === "HOME") homeWin += scoreline.probability;
    else if (outcome === "AWAY") awayWin += scoreline.probability;
    else draw += scoreline.probability;
  }

  return {
    fixtureId: fixture.id,
    lambdaHome,
    lambdaAway,
    homeWin,
    draw,
    awayWin,
    scorelines,
    tailProbability: Math.max(0, 1 - represented),
    modelVersion: "poisson-v1",
  };
}
