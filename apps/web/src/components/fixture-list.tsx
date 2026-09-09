import type { Fixture, Team } from "@leaguesim/domain";

const formatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function FixtureList({
  fixtures,
  teams,
  limit = 5,
}: {
  fixtures: Fixture[];
  teams: Team[];
  limit?: number;
}) {
  const names = new Map(teams.map((team) => [team.id, team.shortName]));
  return (
    <div className="fixtures">
      {fixtures.slice(0, limit).map((fixture) => (
        <article className="fixture" key={fixture.id}>
          <div className="fixture-time">
            MW {fixture.matchweek} · {formatter.format(new Date(fixture.kickoff))}
            {fixture.status === "FINISHED" ? " · FT" : ""}
          </div>
          <div className="fixture-team">
            <span>{names.get(fixture.homeTeamId)}</span>
            <span>{fixture.score?.home ?? "—"}</span>
          </div>
          <div className="fixture-team">
            <span>{names.get(fixture.awayTeamId)}</span>
            <span>{fixture.score?.away ?? "—"}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
