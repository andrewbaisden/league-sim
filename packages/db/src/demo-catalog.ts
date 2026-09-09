import {
  type CompetitionRules,
  calculateRatings,
  calculateStandings,
  type Fixture,
  type RatingSet,
  type StandingRow,
  type Team,
} from "@leaguesim/domain";
import { DEMO_SEASON_KEY } from "./ids";

const teamNames = [
  ["arsenal", "Arsenal", "Arsenal", "ARS", 5],
  ["aston-villa", "Aston Villa", "Villa", "AVL", 4],
  ["bournemouth", "AFC Bournemouth", "Bournemouth", "BOU", 3.5],
  ["brentford", "Brentford", "Brentford", "BRE", 3.5],
  ["brighton", "Brighton & Hove Albion", "Brighton", "BHA", 3.5],
  ["chelsea", "Chelsea", "Chelsea", "CHE", 4.5],
  ["coventry", "Coventry City", "Coventry", "COV", 2.5],
  ["crystal-palace", "Crystal Palace", "Palace", "CRY", 3.5],
  ["everton", "Everton", "Everton", "EVE", 3.5],
  ["fulham", "Fulham", "Fulham", "FUL", 3.5],
  ["hull", "Hull City", "Hull", "HUL", 2.5],
  ["ipswich", "Ipswich Town", "Ipswich", "IPS", 3],
  ["leeds", "Leeds United", "Leeds", "LEE", 3.5],
  ["liverpool", "Liverpool", "Liverpool", "LIV", 4.5],
  ["man-city", "Manchester City", "Man City", "MCI", 5],
  ["man-united", "Manchester United", "Man Utd", "MUN", 4],
  ["newcastle", "Newcastle United", "Newcastle", "NEW", 4],
  ["nottingham-forest", "Nottingham Forest", "Nott'm Forest", "NFO", 3.5],
  ["sunderland", "Sunderland", "Sunderland", "SUN", 3],
  ["tottenham", "Tottenham Hotspur", "Spurs", "TOT", 4],
] as const;

export const demoTeams: Team[] = teamNames.map(([id, name, shortName, abbreviation, stars]) => ({
  id,
  name,
  shortName,
  abbreviation,
  stars,
}));

export const premierLeagueRules: CompetitionRules = {
  teamCount: 20,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  fixturesPerPair: 2,
  rankingCriteria: [
    "POINTS",
    "GOAL_DIFFERENCE",
    "GOALS_FOR",
    "HEAD_TO_HEAD_POINTS",
    "HEAD_TO_HEAD_AWAY_GOALS",
  ],
  zones: [
    { id: "champions", label: "Champions", from: 1, to: 1, kind: "TITLE" },
    { id: "ucl", label: "Champions League places", from: 1, to: 4, kind: "QUALIFICATION" },
    { id: "relegation", label: "Relegation", from: 18, to: 20, kind: "RELEGATION" },
  ],
};

interface KickoffSlot {
  dayOffset: number;
  hour: number;
  minute: number;
}

const regularWeekendSlots: readonly KickoffSlot[] = [
  { dayOffset: 1, hour: 12, minute: 30 },
  { dayOffset: 1, hour: 15, minute: 0 },
  { dayOffset: 1, hour: 15, minute: 0 },
  { dayOffset: 1, hour: 15, minute: 0 },
  { dayOffset: 1, hour: 15, minute: 0 },
  { dayOffset: 1, hour: 15, minute: 0 },
  { dayOffset: 1, hour: 17, minute: 30 },
  { dayOffset: 2, hour: 14, minute: 0 },
  { dayOffset: 2, hour: 16, minute: 30 },
  { dayOffset: 3, hour: 20, minute: 0 },
];

const televisedFridayWeekendSlots: readonly KickoffSlot[] = [
  { dayOffset: 0, hour: 20, minute: 0 },
  ...regularWeekendSlots.slice(0, -1),
];

const midweekSlots: readonly KickoffSlot[] = [
  { dayOffset: 4, hour: 19, minute: 45 },
  { dayOffset: 4, hour: 19, minute: 45 },
  { dayOffset: 4, hour: 19, minute: 45 },
  { dayOffset: 4, hour: 19, minute: 45 },
  { dayOffset: 4, hour: 19, minute: 45 },
  { dayOffset: 5, hour: 20, minute: 0 },
  { dayOffset: 5, hour: 20, minute: 0 },
  { dayOffset: 5, hour: 20, minute: 0 },
  { dayOffset: 5, hour: 20, minute: 0 },
  { dayOffset: 5, hour: 20, minute: 0 },
];

const midweekMatchweeks = new Set([10, 20, 32]);

const ukOffsetFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  timeZoneName: "shortOffset",
});

function ukOffsetMinutes(date: Date): number {
  const zone = ukOffsetFormatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  if (zone === "GMT") return 0;
  const match = zone?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) throw new Error(`Could not determine Europe/London offset for ${date.toISOString()}`);
  const [, sign, hours, minutes = "0"] = match;
  const magnitude = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? -magnitude : magnitude;
}

function kickoffFor(matchweek: number, fixtureIndex: number): string {
  const hasFridayGame = matchweek === 1 || (matchweek - 1) % 6 === 0;
  const slots = midweekMatchweeks.has(matchweek)
    ? midweekSlots
    : hasFridayGame
      ? televisedFridayWeekendSlots
      : regularWeekendSlots;
  const slot = slots[fixtureIndex];
  if (!slot) throw new Error(`Missing kickoff slot ${fixtureIndex} for matchweek ${matchweek}`);

  const localDate = new Date(
    Date.UTC(2026, 7, 21 + (matchweek - 1) * 7 + slot.dayOffset, slot.hour, slot.minute),
  );
  return new Date(localDate.getTime() - ukOffsetMinutes(localDate) * 60_000).toISOString();
}

export function generateDemoSchedule(teams: Team[] = demoTeams): Fixture[] {
  const rotating = teams.map((team) => team.id);
  const firstHalf: Fixture[] = [];
  for (let round = 0; round < rotating.length - 1; round += 1) {
    for (let pair = 0; pair < rotating.length / 2; pair += 1) {
      const left = rotating[pair];
      const right = rotating[rotating.length - 1 - pair];
      if (!left || !right) continue;
      const swap = (round + pair) % 2 === 1;
      const homeTeamId = swap ? right : left;
      const awayTeamId = swap ? left : right;
      const matchweek = round + 1;
      firstHalf.push({
        id: `demo-${matchweek}-${pair + 1}`,
        homeTeamId,
        awayTeamId,
        kickoff: kickoffFor(matchweek, pair),
        matchweek,
        status: "SCHEDULED",
        venue: `${teams.find((team) => team.id === homeTeamId)?.name} Stadium`,
      });
    }
    const last = rotating.pop();
    if (last) rotating.splice(1, 0, last);
  }
  const secondHalf = firstHalf.map((fixture, index) => ({
    ...fixture,
    id: fixture.id.replace("demo-", "demo-return-"),
    homeTeamId: fixture.awayTeamId,
    awayTeamId: fixture.homeTeamId,
    matchweek: (fixture.matchweek ?? 0) + 19,
    kickoff: kickoffFor((fixture.matchweek ?? 0) + 19, index % 10),
    status: "SCHEDULED" as const,
  }));
  return [...firstHalf, ...secondHalf];
}

export const demoFixtures = generateDemoSchedule();
export const demoRatings: RatingSet = calculateRatings(demoTeams, demoFixtures);
export const demoStandings: StandingRow[] = calculateStandings({
  teams: demoTeams,
  fixtures: demoFixtures,
  rules: premierLeagueRules,
});

export function buildDemoSeasonCatalog() {
  return {
    logicalSeasonId: DEMO_SEASON_KEY,
    competition: { id: "premier-league", name: "Premier League", slug: "premier-league" },
    label: "2026/27",
    currentMatchweek: 1,
    dataMode: "DEMO" as const,
    lastUpdatedAt: "2026-08-21T21:00:00.000Z",
    teams: demoTeams,
    fixtures: demoFixtures,
    standings: demoStandings,
    ratings: demoRatings,
    rules: premierLeagueRules,
  };
}
