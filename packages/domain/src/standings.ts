import type {
  CompetitionRules,
  Fixture,
  FormResult,
  StandingRow,
  StandingsInput,
  Team,
} from "./types";

interface MutableStanding extends Omit<StandingRow, "position" | "tieUnresolved"> {
  position: number;
  tieUnresolved: boolean;
}

function resultFor(teamId: string, fixture: Fixture): FormResult {
  const score = fixture.score;
  if (!score) throw new Error(`Fixture ${fixture.id} has no score`);
  const own = fixture.homeTeamId === teamId ? score.home : score.away;
  const other = fixture.homeTeamId === teamId ? score.away : score.home;
  return own > other ? "W" : own < other ? "L" : "D";
}

function createRow(team: Team): MutableStanding {
  return {
    position: 0,
    teamId: team.id,
    teamName: team.name,
    shortName: team.shortName,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    tieUnresolved: false,
  };
}

function applyFixture(
  fixture: Fixture,
  rows: Map<string, MutableStanding>,
  rules: CompetitionRules,
): void {
  const score = fixture.score;
  if (fixture.status !== "FINISHED" || !score?.confirmed) return;
  const home = rows.get(fixture.homeTeamId);
  const away = rows.get(fixture.awayTeamId);
  if (!home || !away) throw new Error(`Fixture ${fixture.id} references an unknown team`);

  home.played += 1;
  away.played += 1;
  home.goalsFor += score.home;
  home.goalsAgainst += score.away;
  away.goalsFor += score.away;
  away.goalsAgainst += score.home;

  if (score.home > score.away) {
    home.wins += 1;
    away.losses += 1;
    home.points += rules.pointsForWin;
    away.points += rules.pointsForLoss;
  } else if (score.home < score.away) {
    away.wins += 1;
    home.losses += 1;
    away.points += rules.pointsForWin;
    home.points += rules.pointsForLoss;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.points += rules.pointsForDraw;
    away.points += rules.pointsForDraw;
  }
}

function compareBase(a: MutableStanding, b: MutableStanding): number {
  return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
}

function headToHeadValues(
  teamId: string,
  tiedIds: Set<string>,
  fixtures: Fixture[],
  rules: CompetitionRules,
) {
  let points = 0;
  let awayGoals = 0;
  for (const fixture of fixtures) {
    const score = fixture.score;
    if (
      fixture.status !== "FINISHED" ||
      !score?.confirmed ||
      !tiedIds.has(fixture.homeTeamId) ||
      !tiedIds.has(fixture.awayTeamId)
    ) {
      continue;
    }
    const isHome = fixture.homeTeamId === teamId;
    if (!isHome && fixture.awayTeamId !== teamId) continue;
    const own = isHome ? score.home : score.away;
    const other = isHome ? score.away : score.home;
    points +=
      own > other ? rules.pointsForWin : own === other ? rules.pointsForDraw : rules.pointsForLoss;
    if (!isHome) awayGoals += own;
  }
  return { points, awayGoals };
}

function resolveBaseTie(
  group: MutableStanding[],
  fixtures: Fixture[],
  rules: CompetitionRules,
): MutableStanding[] {
  if (group.length < 2) return group;
  const ids = new Set(group.map((row) => row.teamId));
  const values = new Map(
    group.map((row) => [row.teamId, headToHeadValues(row.teamId, ids, fixtures, rules)]),
  );
  return group.toSorted((a, b) => {
    const aValue = values.get(a.teamId);
    const bValue = values.get(b.teamId);
    if (!aValue || !bValue) return a.teamName.localeCompare(b.teamName);
    return (
      bValue.points - aValue.points ||
      bValue.awayGoals - aValue.awayGoals ||
      a.teamName.localeCompare(b.teamName)
    );
  });
}

export function calculateStandings({ teams, fixtures, rules }: StandingsInput): StandingRow[] {
  const rows = new Map(teams.map((team) => [team.id, createRow(team)]));
  const completed = fixtures
    .filter((fixture) => fixture.status === "FINISHED" && fixture.score?.confirmed)
    .toSorted((a, b) => a.kickoff.localeCompare(b.kickoff));

  for (const fixture of completed) applyFixture(fixture, rows, rules);
  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.form = completed
      .filter((fixture) => fixture.homeTeamId === row.teamId || fixture.awayTeamId === row.teamId)
      .slice(-5)
      .map((fixture) => resultFor(row.teamId, fixture));
  }

  const baseSorted = [...rows.values()].toSorted(
    (a, b) => compareBase(a, b) || a.teamName.localeCompare(b.teamName),
  );
  const ordered: MutableStanding[] = [];
  for (let index = 0; index < baseSorted.length; ) {
    const first = baseSorted[index];
    if (!first) break;
    const group = [first];
    let cursor = index + 1;
    while (cursor < baseSorted.length) {
      const candidate = baseSorted[cursor];
      if (!candidate || compareBase(first, candidate) !== 0) break;
      group.push(candidate);
      cursor += 1;
    }
    ordered.push(...resolveBaseTie(group, completed, rules));
    index = cursor;
  }

  for (let index = 0; index < ordered.length; ) {
    const first = ordered[index];
    if (!first) break;
    const ids = new Set(
      ordered.filter((row) => compareBase(first, row) === 0).map((row) => row.teamId),
    );
    const firstH2h = headToHeadValues(first.teamId, ids, completed, rules);
    let cursor = index + 1;
    while (cursor < ordered.length) {
      const candidate = ordered[cursor];
      if (!candidate || compareBase(first, candidate) !== 0) break;
      const candidateH2h = headToHeadValues(candidate.teamId, ids, completed, rules);
      if (
        candidateH2h.points !== firstH2h.points ||
        candidateH2h.awayGoals !== firstH2h.awayGoals
      ) {
        break;
      }
      cursor += 1;
    }
    const unresolved = cursor - index > 1;
    for (let tiedIndex = index; tiedIndex < cursor; tiedIndex += 1) {
      const row = ordered[tiedIndex];
      if (row) {
        row.position = index + 1;
        row.tieUnresolved = unresolved;
      }
    }
    index = cursor;
  }

  return ordered;
}
