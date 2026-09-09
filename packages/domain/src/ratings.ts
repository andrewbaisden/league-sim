import type { Fixture, RatingSet, Team, TeamRating } from "./types";

export interface RatingOptions {
  priorHomeGoals?: number;
  priorAwayGoals?: number;
  leaguePriorMatches?: number;
  priorEquivalentMatches?: number;
  recentWeight?: number;
}

const safeDivide = (numerator: number, denominator: number) =>
  denominator === 0 ? 1 : numerator / denominator;

const clampRelative = (value: number, base: number, range = 0.1) =>
  Math.max(base * (1 - range), Math.min(base * (1 + range), value));

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

    const homeAttack = safeDivide(
      (homeFor + priorMatches * leagueHomeGoals) / (home.length + priorMatches),
      leagueHomeGoals,
    );
    const awayAttack = safeDivide(
      (awayFor + priorMatches * leagueAwayGoals) / (away.length + priorMatches),
      leagueAwayGoals,
    );
    const homeDefence = safeDivide(
      leagueAwayGoals,
      (homeAgainst + priorMatches * leagueAwayGoals) / (home.length + priorMatches),
    );
    const awayDefence = safeDivide(
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

    return {
      teamId: team.id,
      homeAttack: clampRelative(
        homeAttack * (1 - recentWeight) + recentAttack * recentWeight,
        homeAttack,
      ),
      awayAttack: clampRelative(
        awayAttack * (1 - recentWeight) + recentAttack * recentWeight,
        awayAttack,
      ),
      homeDefence: clampRelative(
        homeDefence * (1 - recentWeight) + recentDefence * recentWeight,
        homeDefence,
      ),
      awayDefence: clampRelative(
        awayDefence * (1 - recentWeight) + recentDefence * recentWeight,
        awayDefence,
      ),
      recentAttack,
      recentDefence,
      homeMatches: home.length,
      awayMatches: away.length,
      recentMatches: recent.length,
    };
  });

  return {
    modelVersion: "poisson-v1",
    leagueHomeGoals,
    leagueAwayGoals,
    priorEquivalentMatches: priorMatches,
    recentWeight,
    ratings,
  };
}
