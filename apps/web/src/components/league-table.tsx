import type { StandingRow, Team } from "@leaguesim/domain";
import Link from "next/link";

function rowZone(position: number): string {
  if (position === 1) return "zone-title";
  if (position <= 4) return "zone-europe";
  if (position >= 18) return "zone-relegation";
  return "";
}

export function LeagueTable({
  rows,
  teams,
  caption = "Current Premier League standings",
}: {
  rows: StandingRow[];
  teams: Team[];
  caption?: string;
}) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const formSlotIds = ["oldest", "older", "middle", "newer", "latest"];
  const isPreseason = rows.length > 0 && rows.every((row) => row.played === 0);
  const displayedRows = isPreseason
    ? rows.toSorted((a, b) => a.teamName.localeCompare(b.teamName))
    : rows;
  return (
    <div className="table-wrap">
      <table className="league-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">Team</th>
            <th scope="col">P</th>
            <th scope="col" className="hide-mobile">
              W
            </th>
            <th scope="col" className="hide-mobile">
              D
            </th>
            <th scope="col" className="hide-mobile">
              L
            </th>
            <th scope="col" className="hide-mobile">
              GF
            </th>
            <th scope="col" className="hide-mobile">
              GA
            </th>
            <th scope="col">GD</th>
            <th scope="col">Pts</th>
            <th scope="col" className="hide-mobile">
              Form
            </th>
          </tr>
        </thead>
        <tbody>
          {displayedRows.map((row) => {
            const team = teamById.get(row.teamId);
            return (
              <tr key={row.teamId} className={isPreseason ? undefined : rowZone(row.position)}>
                <td className="position">
                  {isPreseason ? "—" : row.tieUnresolved ? `=${row.position}` : row.position}
                </td>
                <td className="team-cell">
                  <Link className="team-link" href={`/teams/${row.teamId}`}>
                    <span className="team-token" aria-hidden="true">
                      {team?.abbreviation ?? "—"}
                    </span>
                    {team?.name ?? row.teamName}
                  </Link>
                </td>
                <td>{row.played}</td>
                <td className="hide-mobile">{row.wins}</td>
                <td className="hide-mobile">{row.draws}</td>
                <td className="hide-mobile">{row.losses}</td>
                <td className="hide-mobile">{row.goalsFor}</td>
                <td className="hide-mobile">{row.goalsAgainst}</td>
                <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td>
                  <strong>{row.points}</strong>
                </td>
                <td className="hide-mobile">
                  <span
                    className="form"
                    role="img"
                    aria-label={`Form: ${row.form.join(", ") || "none"}`}
                  >
                    {row.form.map((result, index) => (
                      <span
                        className={`form-token ${result}`}
                        key={`${row.teamId}-${formSlotIds[index]}`}
                        aria-hidden="true"
                      >
                        {result}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
