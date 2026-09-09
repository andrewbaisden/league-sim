import { loadSeasonBatchView } from "@leaguesim/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureList } from "@/components/fixture-list";
import { StarRating } from "@/components/star-rating";
import {
  demoFixtures,
  demoRatings,
  demoStandings,
  demoTeams,
  findTeam,
  getActiveSeason,
} from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { teamId } = await params;
  const { batchId } = await searchParams;
  const team = findTeam(teamId);
  if (!team) notFound();

  const batchView = batchId ? await loadSeasonBatchView(batchId).catch(() => null) : null;
  const season = await getActiveSeason();

  const standing =
    batchView?.standings.find((row) => row.teamId === teamId) ??
    season.standings.find((row) => row.teamId === teamId) ??
    demoStandings.find((row) => row.teamId === teamId);
  const rating =
    season.ratings.ratings.find((row) => row.teamId === teamId) ??
    demoRatings.ratings.find((row) => row.teamId === teamId);
  if (!standing || !rating) notFound();

  const fixtures = (batchView?.fixtures ?? season.fixtures ?? demoFixtures).filter(
    (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId,
  );
  const teams = batchView?.teams ?? season.teams ?? demoTeams;
  const formSlotIds = ["oldest", "older", "middle", "newer", "latest"];
  const reality = batchView ? "SIMULATION" : "CURRENT";
  const stars = team.stars ?? rating.stars;

  return (
    <main className="shell">
      <Link href={batchId ? `/?batchId=${batchId}` : "/"} className="back">
        ← Back to league
      </Link>
      <section className="team-hero">
        <span className="team-token" aria-hidden="true">
          {team.abbreviation}
        </span>
        <div>
          <span className="eyebrow">Premier League · {batchView ? "Simulation" : "Demo data"}</span>
          <h1>{team.name}</h1>
          {stars !== undefined ? <StarRating stars={stars} label={`${team.name} rating`} /> : null}
        </div>
      </section>
      <section className="metric-grid" aria-label={`${team.name} summary`}>
        <div className="metric">
          <span className="metric-label">Position</span>
          <strong>{standing.played === 0 ? "—" : standing.position}</strong>
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
              <p>
                {batchView
                  ? "Simulated and confirmed results for this saved batch"
                  : "Official state and future schedule remain separate"}
              </p>
            </div>
            <span className="eyebrow">{reality}</span>
          </div>
          <FixtureList
            fixtures={fixtures}
            teams={teams}
            limit={12}
            {...(batchId ? { batchId } : {})}
          />
        </section>
        <aside className="stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Model strength</h2>
                <p>
                  {season.ratings.modelVersion === "poisson-stars-v1"
                    ? "Star-prior attack and defence factors"
                    : "Dimensionless league-relative factors"}
                </p>
              </div>
              <span className="eyebrow">{season.ratings.modelVersion}</span>
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
                <p>
                  {batchView
                    ? "Last five results in this simulation"
                    : "Last five confirmed matches"}
                </p>
              </div>
            </div>
            <div className="empty">
              {standing.form.length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.8rem" }}>
                  No completed matches yet in this view.
                </p>
              ) : (
                <span className="form" style={{ justifyContent: "flex-start" }}>
                  {standing.form.map((result, index) => (
                    <span className={`form-token ${result}`} key={formSlotIds[index]}>
                      {result}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
