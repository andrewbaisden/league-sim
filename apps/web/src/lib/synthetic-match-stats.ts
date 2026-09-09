import { createRandom, type Fixture, type Team } from "@leaguesim/domain";

export interface MatchStatRow {
  id: string;
  label: string;
  home: number;
  away: number;
  format?: "int" | "decimal" | "percent";
}

export interface MatchMomentumPoint {
  minute: number;
  home: number;
  away: number;
}

export interface MatchLineupPlayer {
  number: number;
  name: string;
  role: string;
  captain?: boolean;
}

export interface SyntheticMatchCentre {
  reality: "SYNTHETIC";
  fixtureId: string;
  competitionLabel: string;
  score: { home: number; away: number };
  halfTime: { home: number; away: number };
  possession: { home: number; away: number };
  headline: MatchStatRow[];
  attack: MatchStatRow[];
  defence: MatchStatRow[];
  distribution: MatchStatRow[];
  momentum: MatchMomentumPoint[];
  formations: { home: string; away: string };
  lineups: {
    home: MatchLineupPlayer[];
    away: MatchLineupPlayer[];
    homeBench: MatchLineupPlayer[];
    awayBench: MatchLineupPlayer[];
  };
  scorers: { home: string[]; away: string[] };
}

function hashFixtureSeed(fixtureId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < fixtureId.length; index += 1) {
    hash ^= fixtureId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function pickScore(homeStars: number, awayStars: number, random: () => number) {
  const homeEdge = (homeStars - awayStars) * 0.35 + 0.25;
  const homeGoals = Math.max(0, Math.min(5, Math.floor(random() * 3 + homeEdge)));
  const awayGoals = Math.max(0, Math.min(5, Math.floor(random() * 2.6 + Math.max(0, -homeEdge))));
  return { home: homeGoals, away: awayGoals };
}

function splitHalfTime(score: { home: number; away: number }, random: () => number) {
  return {
    home: Math.min(score.home, Math.floor(random() * (score.home + 1))),
    away: Math.min(score.away, Math.floor(random() * (score.away + 1))),
  };
}

function buildLineup(prefix: string, formation: string): MatchLineupPlayer[] {
  const roles =
    formation === "4-3-3"
      ? ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"]
      : formation === "4-2-3-1"
        ? ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "CAM", "RW", "ST", "LW"]
        : ["GK", "CB", "CB", "CB", "RWB", "LWB", "CM", "CM", "CM", "ST", "ST"];
  return roles.map((role, index) => ({
    number: index === 0 ? 1 : 2 + index,
    name: `${prefix} ${role}${index + 1}`,
    role,
    captain: index === 5,
  }));
}

function buildBench(prefix: string): MatchLineupPlayer[] {
  return [
    { number: 13, name: `${prefix} Sub GK`, role: "GK" },
    { number: 14, name: `${prefix} Sub CB`, role: "CB" },
    { number: 15, name: `${prefix} Sub MF`, role: "CM" },
    { number: 16, name: `${prefix} Sub W`, role: "RW" },
    { number: 17, name: `${prefix} Sub ST`, role: "ST" },
  ];
}

/**
 * Deterministic synthetic match centre for demo fixtures.
 * Clearly labelled SYNTHETIC — not official tracking or Opta data.
 */
export function buildSyntheticMatchCentre(
  fixture: Fixture,
  home: Team,
  away: Team,
): SyntheticMatchCentre {
  const random = createRandom(hashFixtureSeed(fixture.id));
  const next = () => random.next();
  const homeStars = home.stars ?? 3.5;
  const awayStars = away.stars ?? 3.5;
  const score = fixture.score?.confirmed
    ? { home: fixture.score.home, away: fixture.score.away }
    : pickScore(homeStars, awayStars, next);
  const halfTime = splitHalfTime(score, next);
  const possessionHome = round1(38 + homeStars * 4 + next() * 8 - awayStars);
  const possession = {
    home: clampPercent(possessionHome),
    away: clampPercent(100 - possessionHome),
  };
  const homeShots = Math.round(8 + homeStars * 1.8 + next() * 6);
  const awayShots = Math.round(7 + awayStars * 1.6 + next() * 7);
  const homeSot = Math.max(score.home, Math.round(homeShots * (0.35 + next() * 0.2)));
  const awaySot = Math.max(score.away, Math.round(awayShots * (0.3 + next() * 0.2)));
  const homeXg = round1(Math.max(score.home * 0.7, homeStars * 0.35 + next() * 1.4));
  const awayXg = round1(Math.max(score.away * 0.7, awayStars * 0.3 + next() * 1.2));
  const homeFormation = homeStars >= 4.5 ? "4-3-3" : "4-2-3-1";
  const awayFormation = awayStars >= 4 ? "3-5-2" : "4-2-3-1";
  const homeLineup = buildLineup(home.abbreviation, homeFormation);
  const awayLineup = buildLineup(away.abbreviation, awayFormation);
  const momentum: MatchMomentumPoint[] = [];
  for (let minute = 1; minute <= 90; minute += 1) {
    const swing = Math.sin(minute / 9) * 0.4 + (homeStars - awayStars) * 0.08;
    const homePulse = Math.max(0.05, 0.45 + swing + (next() - 0.5) * 0.35);
    const awayPulse = Math.max(0.05, 0.45 - swing + (next() - 0.5) * 0.35);
    momentum.push({ minute, home: round1(homePulse), away: round1(awayPulse) });
  }

  return {
    reality: "SYNTHETIC",
    fixtureId: fixture.id,
    competitionLabel: "Premier League · Demo match centre",
    score,
    halfTime,
    possession,
    headline: [
      { id: "xg", label: "xG", home: homeXg, away: awayXg, format: "decimal" },
      { id: "shots", label: "Shots", home: homeShots, away: awayShots },
      {
        id: "sot",
        label: "Shots on target",
        home: homeSot,
        away: awaySot,
      },
      {
        id: "box",
        label: "Touches in opposition box",
        home: Math.round(20 + homeStars * 5 + next() * 15),
        away: Math.round(18 + awayStars * 5 + next() * 18),
      },
    ],
    attack: [
      { id: "shots", label: "Shots", home: homeShots, away: awayShots },
      { id: "sot", label: "Shots on target", home: homeSot, away: awaySot },
      {
        id: "soff",
        label: "Shots off target",
        home: Math.max(0, homeShots - homeSot - 1),
        away: Math.max(0, awayShots - awaySot - 1),
      },
      {
        id: "wood",
        label: "Hit woodwork",
        home: next() > 0.7 ? 1 : 0,
        away: next() > 0.75 ? 1 : 0,
      },
      {
        id: "offside",
        label: "Offsides",
        home: Math.round(1 + next() * 3),
        away: Math.round(1 + next() * 4),
      },
    ],
    defence: [
      {
        id: "tackles",
        label: "Total tackles",
        home: Math.round(10 + next() * 10),
        away: Math.round(9 + next() * 10),
      },
      {
        id: "tackle-pct",
        label: "Won tackle %",
        home: round1(55 + next() * 25),
        away: round1(55 + next() * 30),
        format: "percent",
      },
      {
        id: "fouls",
        label: "Fouls committed",
        home: Math.round(8 + next() * 8),
        away: Math.round(7 + next() * 8),
      },
      {
        id: "yellow",
        label: "Yellow cards",
        home: Math.round(next() * 3),
        away: Math.round(next() * 4),
      },
      {
        id: "clearances",
        label: "Clearances",
        home: Math.round(12 + next() * 22),
        away: Math.round(10 + next() * 20),
      },
    ],
    distribution: [
      {
        id: "passes",
        label: "Total passes",
        home: Math.round(280 + homeStars * 40 + next() * 80),
        away: Math.round(260 + awayStars * 45 + next() * 120),
      },
      {
        id: "pass-pct",
        label: "Pass accuracy %",
        home: round1(78 + homeStars * 2 + next() * 6),
        away: round1(78 + awayStars * 2 + next() * 8),
        format: "percent",
      },
      {
        id: "crosses",
        label: "Crosses",
        home: Math.round(6 + next() * 12),
        away: Math.round(8 + next() * 18),
      },
      {
        id: "corners",
        label: "Corners",
        home: Math.round(2 + next() * 6),
        away: Math.round(3 + next() * 8),
      },
    ],
    momentum,
    formations: { home: homeFormation, away: awayFormation },
    lineups: {
      home: homeLineup,
      away: awayLineup,
      homeBench: buildBench(home.abbreviation),
      awayBench: buildBench(away.abbreviation),
    },
    scorers: {
      home: score.home
        ? Array.from({ length: score.home }, (_, index) => {
            const player = homeLineup[9 - (index % 3)];
            return `${player?.name ?? "Home scorer"} (${14 + index * 17}')`;
          })
        : [],
      away: score.away
        ? Array.from({ length: score.away }, (_, index) => {
            const player = awayLineup[9 - (index % 2)];
            return `${player?.name ?? "Away scorer"} (${55 + index * 19}')`;
          })
        : [],
    },
  };
}

function clampPercent(value: number): number {
  return round1(Math.max(25, Math.min(75, value)));
}
