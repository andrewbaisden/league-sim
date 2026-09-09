import type { Fixture, RatingSet, Team, TeamRating, TeamStars } from "./types";

export interface RatingOptions {
  priorHomeGoals?: number;
  priorAwayGoals?: number;
  leaguePriorMatches?: number;
  priorEquivalentMatches?: number;
  recentWeight?: number;
  /** Baseline stars treated as league-average strength. Defaults to 3.5. */
  starBaseline?: number;
  /** Relative effect of each star away from baseline. Defaults to 0.22. */
  starSensitivity?: number;
}

const safeDivide = (numerator: number, denominator: number) =>
  denominator === 0 ? 1 : numerator / denominator;

const clampRelative = (value: number, base: number, range = 0.1) =>
  Math.max(base * (1 - range), Math.min(base * (1 + range), value));

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export const MIN_TEAM_STARS = 0.5;
export const MAX_TEAM_STARS = 5;
export const DEFAULT_STAR_BASELINE = 3.5;

/** Normalize and validate an FC-style half-star rating. */
export function normalizeTeamStars(stars: number): TeamStars {
  if (!Number.isFinite(stars)) return DEFAULT_STAR_BASELINE;
  const halfSteps = Math.round(stars * 2) / 2;
  return clamp(halfSteps, MIN_TEAM_STARS, MAX_TEAM_STARS);
}

/**
 * Map star rating to attack/defence multipliers around a league baseline.
 * A 5★ side is materially stronger than a 2.5★ side without becoming invincible.
 */
export function starStrengthMultipliers(
  stars: TeamStars,
  options: Pick<RatingOptions, "starBaseline" | "starSensitivity"> = {},
): { attackMultiplier: number; defenceMultiplier: number } {
  const baseline = options.starBaseline ?? DEFAULT_STAR_BASELINE;
  const sensitivity = options.starSensitivity ?? 0.22;
  const normalized = normalizeTeamStars(stars);
  const delta = (normalized - baseline) / baseline;
  return {
    attackMultiplier: clamp(1 + delta * (sensitivity + 0.08), 0.62, 1.48),
    defenceMultiplier: clamp(1 + delta * sensitivity, 0.65, 1.42),
  };
}

export function calculateRatings(
  teams: Team[],
  fixtures: Fixture[],
  options: RatingOptions = {},
): RatingSet {
  const completed = fixtures
    .filter((fixture) => fixture.status === "FINISHED" && fixture.score?.confirmed)
    .toSorted((a, b) => a.kickoff.localeCompare(b.kickoff));
  const priorHome = options.priorHomeGoals ?? 1.5;
  const priorAway = options.priorAwayGoals ?? 1.2;
  const leaguePriorMatches = options.leaguePriorMatches ?? 20;
  const priorMatches = options.priorEquivalentMatches ?? 5;
  const recentWeight = options.recentWeight ?? 0.15;
  const homeGoals = completed.reduce((sum, fixture) => sum + (fixture.score?.home ?? 0), 0);
  const awayGoals = completed.reduce((sum, fixture) => sum + (fixture.score?.away ?? 0), 0);
  const leagueHomeGoals =
    (homeGoals + priorHome * leaguePriorMatches) / (completed.length + leaguePriorMatches);
  const leagueAwayGoals =
    (awayGoals + priorAway * leaguePriorMatches) / (completed.length + leaguePriorMatches);
  const leagueTeamGoals = (leagueHomeGoals + leagueAwayGoals) / 2;
  const usesStars = teams.some((team) => team.stars !== undefined);

  const ratings: TeamRating[] = teams.map((team) => {
    const home = completed.filter((fixture) => fixture.homeTeamId === team.id);
    const away = completed.filter((fixture) => fixture.awayTeamId === team.id);
    const all = completed.filter(
      (fixture) => fixture.homeTeamId === team.id || fixture.awayTeamId === team.id,
    );
    const recent = all.slice(-5);
    const homeFor = home.reduce((sum, fixture) => sum + (fixture.score?.home ?? 0), 0);
    const homeAgainst = home.reduce((sum, fixture) => sum + (fixture.score?.away ?? 0), 0);
    const awayFor = away.reduce((sum, fixture) => sum + (fixture.score?.away ?? 0), 0);
    const awayAgainst = away.reduce((sum, fixture) => sum + (fixture.score?.home ?? 0), 0);
    const recentFor = recent.reduce((sum, fixture) => {
      if (!fixture.score) return sum;
      return sum + (fixture.homeTeamId === team.id ? fixture.score.home : fixture.score.away);
    }, 0);
    const recentAgainst = recent.reduce((sum, fixture) => {
      if (!fixture.score) return sum;
      return sum + (fixture.homeTeamId === team.id ? fixture.score.away : fixture.score.home);
    }, 0);

    let homeAttack = safeDivide(
      (homeFor + priorMatches * leagueHomeGoals) / (home.length + priorMatches),
      leagueHomeGoals,
    );
    let awayAttack = safeDivide(
      (awayFor + priorMatches * leagueAwayGoals) / (away.length + priorMatches),
      leagueAwayGoals,
    );
    let homeDefence = safeDivide(
      leagueAwayGoals,
      (homeAgainst + priorMatches * leagueAwayGoals) / (home.length + priorMatches),
    );
    let awayDefence = safeDivide(
      leagueHomeGoals,
      (awayAgainst + priorMatches * leagueHomeGoals) / (away.length + priorMatches),
    );
    const recentPrior = 3;
    const recentAttack = safeDivide(
      (recentFor + recentPrior * leagueTeamGoals) / (recent.length + recentPrior),
      leagueTeamGoals,
    );
    const recentDefence = safeDivide(
      leagueTeamGoals,
      (recentAgainst + recentPrior * leagueTeamGoals) / (recent.length + recentPrior),
    );

    homeAttack = clampRelative(
      homeAttack * (1 - recentWeight) + recentAttack * recentWeight,
      homeAttack,
    );
    awayAttack = clampRelative(
      awayAttack * (1 - recentWeight) + recentAttack * recentWeight,
      awayAttack,
    );
    homeDefence = clampRelative(
      homeDefence * (1 - recentWeight) + recentDefence * recentWeight,
      homeDefence,
    );
    awayDefence = clampRelative(
      awayDefence * (1 - recentWeight) + recentDefence * recentWeight,
      awayDefence,
    );

    const stars = normalizeTeamStars(team.stars ?? DEFAULT_STAR_BASELINE);
    const multipliers = usesStars
      ? starStrengthMultipliers(stars, options)
      : { attackMultiplier: 1, defenceMultiplier: 1 };

    if (usesStars) {
      homeAttack *= multipliers.attackMultiplier;
      awayAttack *= multipliers.attackMultiplier;
      homeDefence *= multipliers.defenceMultiplier;
      awayDefence *= multipliers.defenceMultiplier;
    }

    return {
      teamId: team.id,
      homeAttack,
      awayAttack,
      homeDefence,
      awayDefence,
      recentAttack,
      recentDefence,
      homeMatches: home.length,
      awayMatches: away.length,
      recentMatches: recent.length,
      ...(usesStars
        ? {
            stars,
            attackMultiplier: multipliers.attackMultiplier,
            defenceMultiplier: multipliers.defenceMultiplier,
          }
        : {}),
    };
  });

  return {
    modelVersion: usesStars ? "poisson-stars-v1" : "poisson-v1",
    leagueHomeGoals,
    leagueAwayGoals,
    priorEquivalentMatches: priorMatches,
    recentWeight,
    ratings,
  };
}
