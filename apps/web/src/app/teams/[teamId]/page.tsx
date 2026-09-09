import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureList } from "@/components/fixture-list";
import { demoFixtures, demoRatings, demoStandings, demoTeams, findTeam } from "@/lib/demo-data";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = findTeam(teamId);
  if (!team) notFound();
  const standing = demoStandings.find((row) => row.teamId === teamId);
  const rating = demoRatings.ratings.find((row) => row.teamId === teamId);
  if (!standing || !rating) notFound();
  const fixtures = demoFixtures.filter(
    (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId,
  );
  const formSlotIds = ["oldest", "older", "middle", "newer", "latest"];
  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back to league
      </Link>
      <section className="team-hero">
        <span className="team-token" aria-hidden="true">
          {team.abbreviation}
        </span>
        <div>
          <span className="eyebrow">Premier League · Demo data</span>
          <h1>{team.name}</h1>
        </div>
      </section>
      <section className="metric-grid" aria-label={`${team.name} summary`}>
        <div className="metric">
          <span className="metric-label">Position</span>
          <strong>{standing.position}</strong>
        </div>
        <div className="metric">
          <span className="metric-label">Points</span>
          <strong>{standing.points}</strong>
        </div>
        <div className="metric">
          <span className="metric-label">Played</span>
          <strong>{standing.played}</strong>
        </div>
        <div className="metric">
          <span className="metric-label">Goal difference</span>
          <strong>
            {standing.goalDifference > 0 ? "+" : ""}
            {standing.goalDifference}
          </strong>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Season fixtures</h2>
              <p>Official state and future schedule remain separate</p>
            </div>
            <span className="eyebrow">Current</span>
          </div>
          <FixtureList fixtures={fixtures} teams={demoTeams} />
        </section>
        <aside className="stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Model strength</h2>
                <p>Dimensionless league-relative factors</p>
              </div>
              <span className="eyebrow">Poisson v1</span>
            </div>
            <div className="forecast-list">
              {[
                ["Home attack", rating.homeAttack],
                ["Away attack", rating.awayAttack],
                ["Home defence", rating.homeDefence],
                ["Away defence", rating.awayDefence],
                ["Recent attack", rating.recentAttack],
              ].map(([label, value]) => (
                <div className="forecast-row" key={String(label)}>
                  <span className="forecast-name">{label}</span>
                  <span className="forecast-track">
                    <span
                      className="forecast-value"
                      style={{ width: `${Math.min(100, Number(value) * 70)}%`, display: "block" }}
                    />
                  </span>
                  <span className="forecast-number">{Number(value).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Form</h2>
                <p>Last five confirmed matches</p>
              </div>
            </div>
            <div className="empty">
              <span className="form" style={{ justifyContent: "flex-start" }}>
                {standing.form.map((result, index) => (
                  <span className={`form-token ${result}`} key={formSlotIds[index]}>
                    {result}
                  </span>
                ))}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
