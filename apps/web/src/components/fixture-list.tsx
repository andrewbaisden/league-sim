"use client";

import type { Fixture, SimulatedFixture, Team } from "@leaguesim/domain";
import Link from "next/link";
import { useSimulationStore } from "@/stores/simulation-store";

const formatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function nextMatchweekFixtures(
  fixtures: Fixture[],
  simulatedFixtures: readonly SimulatedFixture[] = [],
): Fixture[] {
  const simulatedIds = new Set(simulatedFixtures.map((fixture) => fixture.fixtureId));
  const remaining = fixtures.filter(
    (fixture) =>
      (fixture.status === "SCHEDULED" || fixture.status === "POSTPONED") &&
      !simulatedIds.has(fixture.id),
  );
  const nextMatchweek = Math.min(...remaining.map((fixture) => fixture.matchweek));
  if (!Number.isFinite(nextMatchweek)) return [];
  return remaining
    .filter((fixture) => fixture.matchweek === nextMatchweek)
    .toSorted(
      (left, right) =>
        new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime() ||
        left.id.localeCompare(right.id),
    );
}

export function FixtureList({
  fixtures,
  teams,
  limit,
  batchId,
}: {
  fixtures: Fixture[];
  teams: Team[];
  limit?: number;
  batchId?: string;
}) {
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const displayedFixtures = limit === undefined ? fixtures : fixtures.slice(0, limit);
  return (
    <div className="fixtures">
      {displayedFixtures.map((fixture) => {
        const href = batchId
          ? `/matches/${fixture.id}?batchId=${batchId}`
          : `/matches/${fixture.id}`;
        return (
          <Link className="fixture fixture-link" href={href} key={fixture.id}>
            <div className="fixture-time">
              MW {fixture.matchweek} · {formatter.format(new Date(fixture.kickoff))}
              {fixture.status === "FINISHED" ? " · FT" : ""}
            </div>
            <div className="fixture-team">
              <span>{names.get(fixture.homeTeamId) ?? fixture.homeTeamId}</span>
              <span>{fixture.score?.home ?? "—"}</span>
            </div>
            <div className="fixture-team">
              <span>{names.get(fixture.awayTeamId) ?? fixture.awayTeamId}</span>
              <span>{fixture.score?.away ?? "—"}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function NextFixturesCard({ fixtures, teams }: { fixtures: Fixture[]; teams: Team[] }) {
  const lastSeasonResult = useSimulationStore((state) => state.lastSeasonResult);
  const activeBatchId = useSimulationStore((state) => state.activeBatchId);
  const nextFixtures = nextMatchweekFixtures(fixtures, lastSeasonResult?.fixtures);
  const matchweek = nextFixtures[0]?.matchweek;

  return (
    <section className="card" id="fixtures" aria-labelledby="fixtures-title" aria-live="polite">
      <div className="card-head">
        <div>
          <h2 id="fixtures-title">Next fixtures</h2>
          <p>{matchweek ? `Matchweek ${matchweek}` : "Season complete"}</p>
        </div>
        <span className="eyebrow">Schedule</span>
      </div>
      {nextFixtures.length > 0 ? (
        <FixtureList
          fixtures={nextFixtures}
          teams={teams}
          {...(activeBatchId ? { batchId: activeBatchId } : {})}
        />
      ) : (
        <p className="workspace-empty">No fixtures remain to be played.</p>
      )}
    </section>
  );
}
