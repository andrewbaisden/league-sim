import { loadSeasonBatchView } from "@leaguesim/db";
import { runMonteCarlo } from "@leaguesim/domain";
import { NextFixturesCard } from "@/components/fixture-list";
import { ForecastCard } from "@/components/forecast-card";
import { SeasonSimulator } from "@/components/season-simulator";
import { SimulationLab } from "@/components/simulation-lab";
import { getActiveSeason } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { batchId } = await searchParams;
  const season = await getActiveSeason();
  const activeBatchView = batchId ? await loadSeasonBatchView(batchId).catch(() => null) : null;
  const forecast = runMonteCarlo({
    teams: season.teams,
    fixtures: season.fixtures,
    rules: season.rules,
    ratings: season.ratings,
    seed: 202627,
    runs: 250,
  });
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <span className="eyebrow">Premier League · {season.label}</span>
          <h1>
            Football,
            <br />
            <span>forward.</span>
          </h1>
          <p className="hero-copy">
            Start with the league as it stands. Explore the fixtures ahead, simulate every possible
            run-in, and understand how uncertainty shapes the table.
          </p>
        </div>
        <aside className="hero-aside">
          <span className="eyebrow">Model baseline</span>
          <strong>
            {season.fixtures.filter((fixture) => fixture.status === "SCHEDULED").length}
          </strong>
          <p>
            fixtures remain in this deterministic early-season demo snapshot. Ratings are fixed at
            the snapshot boundary.
            {season.persisted ? " Database persistence is active." : ""}
          </p>
        </aside>
      </section>
      <div className="dashboard-grid">
        <div className="stack">
          <SeasonSimulator
            seasonId={season.id}
            teams={season.teams}
            fixtures={season.fixtures}
            standings={season.standings}
            initialBatchView={activeBatchView}
            {...(season.baseSnapshotId ? { baseSnapshotId: season.baseSnapshotId } : {})}
          />
        </div>
        <aside className="stack">
          <SimulationLab seasonId={season.id} fixtures={season.fixtures} teams={season.teams} />
          <ForecastCard projections={forecast.projections} teams={season.teams} />
          <NextFixturesCard fixtures={season.fixtures} teams={season.teams} />
        </aside>
      </div>
      <footer className="disclaimer">
        Demo data is synthetic and clearly separated from official results. Football data provider
        integration is optional and disabled by default. LeagueSim simulations are statistical
        hypothetical scenarios and should not be interpreted as guaranteed forecasts or betting
        advice.
      </footer>
    </main>
  );
}
