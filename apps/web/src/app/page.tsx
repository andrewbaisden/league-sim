import { runMonteCarlo } from "@leaguesim/domain";
import { FixtureList } from "@/components/fixture-list";
import { ForecastCard } from "@/components/forecast-card";
import { LeagueTable } from "@/components/league-table";
import { SeasonSimulator } from "@/components/season-simulator";
import { SimulationLab } from "@/components/simulation-lab";
import { getDemoSeason } from "@/lib/demo-data";

export default function HomePage() {
  const season = getDemoSeason();
  const forecast = runMonteCarlo({
    teams: season.teams,
    fixtures: season.fixtures,
    rules: season.rules,
    ratings: season.ratings,
    seed: 202627,
    runs: 250,
  });
  const nextFixtures = season.fixtures.filter((fixture) => fixture.status === "SCHEDULED");
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
          </p>
        </aside>
      </section>
      <div className="dashboard-grid">
        <div className="stack">
          <section className="card" id="table" aria-labelledby="table-title">
            <div className="card-head">
              <div>
                <h2 id="table-title">Current table</h2>
                <p>
                  {season.currentMatchweek === 1
                    ? "Before matchweek 1 · all teams start level"
                    : `After matchweek ${season.currentMatchweek - 1} · synthetic demo results`}
                </p>
              </div>
              <span className="eyebrow">
                {season.currentMatchweek === 1 ? "Not started" : "Current"}
              </span>
            </div>
            <LeagueTable rows={season.standings} teams={season.teams} />
          </section>
          <SeasonSimulator seasonId={season.id} teams={season.teams} fixtures={season.fixtures} />
        </div>
        <aside className="stack">
          <SimulationLab seasonId={season.id} fixtures={season.fixtures} teams={season.teams} />
          <ForecastCard projections={forecast.projections} teams={season.teams} />
          <section className="card" id="fixtures" aria-labelledby="fixtures-title">
            <div className="card-head">
              <div>
                <h2 id="fixtures-title">Next fixtures</h2>
                <p>Matchweek {season.currentMatchweek}</p>
              </div>
              <span className="eyebrow">Schedule</span>
            </div>
            <FixtureList fixtures={nextFixtures} teams={season.teams} />
          </section>
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
