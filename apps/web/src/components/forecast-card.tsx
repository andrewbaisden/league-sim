import type { Team, TeamProjection } from "@leaguesim/domain";

export function ForecastCard({
  projections,
  teams,
}: {
  projections: TeamProjection[];
  teams: Team[];
}) {
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const leaders = projections
    .toSorted((a, b) => b.titleProbability - a.titleProbability)
    .slice(0, 5);
  return (
    <section className="card" aria-labelledby="forecast-title">
      <div className="card-head">
        <div>
          <h2 id="forecast-title">Baseline forecast</h2>
          <p>250 seeded demo runs</p>
        </div>
        <span className="eyebrow">Projected</span>
      </div>
      <div className="forecast-list">
        {leaders.map((projection) => (
          <div className="forecast-row" key={projection.teamId}>
            <span className="forecast-name">{names.get(projection.teamId)}</span>
            <span className="forecast-track" aria-hidden="true">
              <span
                className="forecast-value"
                style={{ width: `${projection.titleProbability * 100}%`, display: "block" }}
              />
            </span>
            <span className="forecast-number">
              {(projection.titleProbability * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
