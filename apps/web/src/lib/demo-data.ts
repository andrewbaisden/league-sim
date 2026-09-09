import {
  type CompetitionRules,
  calculateRatings,
  calculateStandings,
  type Fixture,
  type RatingSet,
  type StandingRow,
  type Team,
} from "@leaguesim/domain";

export const DEMO_SEASON_ID = "premier-league-2026-27-demo";

const teamNames = [
  ["arsenal", "Arsenal", "Arsenal", "ARS"],
  ["aston-villa", "Aston Villa", "Villa", "AVL"],
  ["bournemouth", "AFC Bournemouth", "Bournemouth", "BOU"],
  ["brentford", "Brentford", "Brentford", "BRE"],
  ["brighton", "Brighton & Hove Albion", "Brighton", "BHA"],
  ["chelsea", "Chelsea", "Chelsea", "CHE"],
  ["coventry", "Coventry City", "Coventry", "COV"],
  ["crystal-palace", "Crystal Palace", "Palace", "CRY"],
  ["everton", "Everton", "Everton", "EVE"],
  ["fulham", "Fulham", "Fulham", "FUL"],
  ["hull", "Hull City", "Hull", "HUL"],
  ["ipswich", "Ipswich Town", "Ipswich", "IPS"],
  ["leeds", "Leeds United", "Leeds", "LEE"],
  ["liverpool", "Liverpool", "Liverpool", "LIV"],
  ["man-city", "Manchester City", "Man City", "MCI"],
  ["man-united", "Manchester United", "Man Utd", "MUN"],
  ["newcastle", "Newcastle United", "Newcastle", "NEW"],
  ["nottingham-forest", "Nottingham Forest", "Nott'm Forest", "NFO"],
  ["sunderland", "Sunderland", "Sunderland", "SUN"],
  ["tottenham", "Tottenham Hotspur", "Spurs", "TOT"],
] as const;

export const demoTeams: Team[] = teamNames.map(([id, name, shortName, abbreviation]) => ({
  id,
  name,
  shortName,
  abbreviation,
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

function generateSchedule(): Fixture[] {
  const rotating = demoTeams.map((team) => team.id);
  const firstHalf: Fixture[] = [];
  const start = Date.UTC(2026, 7, 22, 14, 0, 0);
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
        kickoff: new Date(start + round * 7 * 86_400_000 + (pair % 3) * 7_200_000).toISOString(),
        matchweek,
        status: "SCHEDULED",
        venue: `${demoTeams.find((team) => team.id === homeTeamId)?.shortName} Stadium`,
      });
    }
    const last = rotating.pop();
    if (last) rotating.splice(1, 0, last);
  }
  const secondHalf = firstHalf.map((fixture) => {
    const { score: _score, ...base } = fixture;
    return {
      ...base,
      id: fixture.id.replace("demo-", "demo-return-"),
      homeTeamId: fixture.awayTeamId,
      awayTeamId: fixture.homeTeamId,
      matchweek: fixture.matchweek + 19,
      kickoff: new Date(new Date(fixture.kickoff).getTime() + 19 * 7 * 86_400_000).toISOString(),
      status: "SCHEDULED" as const,
    };
  });
  return [...firstHalf, ...secondHalf];
}

export const demoFixtures = generateSchedule();
export const demoRatings: RatingSet = calculateRatings(demoTeams, demoFixtures);
export const demoStandings: StandingRow[] = calculateStandings({
  teams: demoTeams,
  fixtures: demoFixtures,
  rules: premierLeagueRules,
});

export function getDemoSeason() {
  return {
    id: DEMO_SEASON_ID,
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

export function findTeam(teamId: string) {
  return demoTeams.find((team) => team.id === teamId);
}

export function findFixture(fixtureId: string) {
  return demoFixtures.find((fixture) => fixture.id === fixtureId);
}
