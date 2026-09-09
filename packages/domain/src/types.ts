export const fixtureStatuses = [
  "SCHEDULED",
  "LIVE",
  "HALF_TIME",
  "FINISHED",
  "POSTPONED",
  "SUSPENDED",
  "CANCELLED",
] as const;

export type FixtureStatus = (typeof fixtureStatuses)[number];
export type FormResult = "W" | "D" | "L";
export type MatchOutcome = "HOME" | "DRAW" | "AWAY";
export type ModelVersion = "poisson-v1" | "poisson-stars-v1";

/** Club quality prior on a half-star FC-style scale from 0.5 to 5.0. */
export type TeamStars = number;

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  /** Optional FC-style star rating used as a strength prior. */
  stars?: TeamStars;
}

export interface MatchScore {
  home: number;
  away: number;
  confirmed: boolean;
}

export interface Fixture {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoff: string;
  matchweek: number;
  status: FixtureStatus;
  venue?: string;
  score?: MatchScore;
}

export type RankingCriterion =
  | "POINTS"
  | "GOAL_DIFFERENCE"
  | "GOALS_FOR"
  | "HEAD_TO_HEAD_POINTS"
  | "HEAD_TO_HEAD_AWAY_GOALS";

export interface CompetitionZone {
  id: string;
  label: string;
  from: number;
  to: number;
  kind: "TITLE" | "QUALIFICATION" | "RELEGATION";
}

export interface CompetitionRules {
  teamCount: number;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  fixturesPerPair: number;
  rankingCriteria: RankingCriterion[];
  zones: CompetitionZone[];
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: FormResult[];
  tieUnresolved: boolean;
}

export interface StandingsInput {
  teams: Team[];
  fixtures: Fixture[];
  rules: CompetitionRules;
}

export interface TeamRating {
  teamId: string;
  homeAttack: number;
  awayAttack: number;
  homeDefence: number;
  awayDefence: number;
  recentAttack: number;
  recentDefence: number;
  homeMatches: number;
  awayMatches: number;
  recentMatches: number;
  /** Present when a star prior contributed to this rating. */
  stars?: TeamStars;
  attackMultiplier?: number;
  defenceMultiplier?: number;
}

export interface RatingSet {
  modelVersion: ModelVersion;
  leagueHomeGoals: number;
  leagueAwayGoals: number;
  priorEquivalentMatches: number;
  recentWeight: number;
  ratings: TeamRating[];
}

export interface ScoreProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface MatchProbability {
  fixtureId: string;
  lambdaHome: number;
  lambdaAway: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  scorelines: ScoreProbability[];
  tailProbability: number;
  modelVersion: ModelVersion;
}

export interface TeamAdjustment {
  teamId: string;
  attackMultiplier: number;
  defenceMultiplier: number;
}

export type FixtureOverride =
  | { fixtureId: string; kind: "EXACT_SCORE"; homeGoals: number; awayGoals: number }
  | { fixtureId: string; kind: "OUTCOME"; outcome: MatchOutcome };

export interface SimulatedFixture {
  fixtureId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  source: "SAMPLED" | "OVERRIDE";
}

export interface SeasonSimulationInput {
  teams: Team[];
  fixtures: Fixture[];
  rules: CompetitionRules;
  ratings: RatingSet;
  seed: number;
  overrides?: FixtureOverride[];
  adjustments?: TeamAdjustment[];
}

export interface SeasonSimulationResult {
  seed: number;
  modelVersion: ModelVersion;
  fixtures: SimulatedFixture[];
  standings: StandingRow[];
}

export interface TeamProjection {
  teamId: string;
  expectedPoints: number;
  expectedPosition: number;
  titleProbability: number;
  topFourProbability: number;
  topSixProbability: number;
  relegationProbability: number;
  positionProbabilities: number[];
}

export interface MonteCarloResult {
  seed: number;
  runs: number;
  modelVersion: ModelVersion;
  durationMs: number;
  fixturesSimulated: number;
  projections: TeamProjection[];
}
