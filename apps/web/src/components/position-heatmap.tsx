import type { Team, TeamProjection } from "@leaguesim/domain";

export function PositionHeatmap({
  projections,
  teams,
}: {
  projections: TeamProjection[];
  teams: Team[];
}) {
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const teamCount = teams.length;
  const positions = Array.from({ length: teamCount }, (_, index) => index + 1);

  return (
    <section className="heatmap-wrap" aria-label="Position probability heatmap">
      <table className="heatmap">
        <caption className="sr-only">
          Probability of finishing in each league position for every team
        </caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            {positions.map((position) => (
              <th key={`pos-head-${position}`} scope="col">
                {position}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projections.map((projection) => (
            <tr key={projection.teamId}>
              <th scope="row">{names.get(projection.teamId)}</th>
              {positions.map((position) => {
                const probability = projection.positionProbabilities[position - 1] ?? 0;
                const percent = probability * 100;
                const intensity = Math.min(1, probability * 4);
                return (
                  <td
                    key={`${projection.teamId}-pos-${position}`}
                    style={{
                      background: `rgba(16, 92, 73, ${intensity * 0.72})`,
                      color: "#fffefa",
                    }}
                    title={`${names.get(projection.teamId)} finish ${position}: ${percent.toFixed(1)}%`}
                  >
                    <span className="sr-only">
                      {names.get(projection.teamId)} position {position}: {percent.toFixed(1)}{" "}
                      percent
                    </span>
                    <span aria-hidden="true">{percent >= 1 ? percent.toFixed(0) : "·"}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
