import { loadSeasonBatchView } from "@leaguesim/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchComparisonBars } from "@/components/match-comparison-bars";
import { MatchMomentumChart } from "@/components/match-momentum-chart";
import { StarRating } from "@/components/star-rating";
import { findFixture, findTeam, getActiveSeason } from "@/lib/demo-data";
import { buildSyntheticMatchCentre } from "@/lib/synthetic-match-stats";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ fixtureId: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { fixtureId } = await params;
  const { batchId } = await searchParams;
  const batchView = batchId ? await loadSeasonBatchView(batchId).catch(() => null) : null;
  const season = batchView ? null : await getActiveSeason();
  const fixture =
    batchView?.fixtures.find((item) => item.id === fixtureId) ??
    season?.fixtures.find((item) => item.id === fixtureId) ??
    findFixture(fixtureId);
  if (!fixture) notFound();

  const teams = batchView?.teams ?? season?.teams ?? [];
  const home = teams.find((team) => team.id === fixture.homeTeamId) ?? findTeam(fixture.homeTeamId);
  const away = teams.find((team) => team.id === fixture.awayTeamId) ?? findTeam(fixture.awayTeamId);
  if (!home || !away) notFound();

  const centre = buildSyntheticMatchCentre(fixture, home, away);
  const backHref = batchId ? `/?batchId=${batchId}` : "/";

  return (
    <main className="shell">
      <Link href={backHref} className="back">
        ← Back to league
      </Link>
      <section className="match-hero">
        <span className="eyebrow">{centre.competitionLabel}</span>
        <div className="match-scoreboard">
          <div className="match-side">
            <Link href={`/teams/${home.id}${batchId ? `?batchId=${batchId}` : ""}`}>
              <span className="team-token">{home.abbreviation}</span>
              <strong>{home.name}</strong>
            </Link>
            {home.stars !== undefined ? <StarRating stars={home.stars} size="sm" /> : null}
          </div>
          <div className="match-score">
            <strong>
              {centre.score.home}–{centre.score.away}
            </strong>
            <span>{fixture.status === "FINISHED" || fixture.score ? "FT" : "Preview"}</span>
            <small>
              HT {centre.halfTime.home}–{centre.halfTime.away}
            </small>
          </div>
          <div className="match-side away">
            <Link href={`/teams/${away.id}${batchId ? `?batchId=${batchId}` : ""}`}>
              <span className="team-token">{away.abbreviation}</span>
              <strong>{away.name}</strong>
            </Link>
            {away.stars !== undefined ? <StarRating stars={away.stars} size="sm" /> : null}
          </div>
        </div>
        <div className="match-scorers">
          <div>
            {centre.scorers.home.length > 0 ? centre.scorers.home.join(" · ") : "No home scorers"}
          </div>
          <div>
            {centre.scorers.away.length > 0 ? centre.scorers.away.join(" · ") : "No away scorers"}
          </div>
        </div>
        <p className="match-disclaimer">
          Match centre visuals are synthetic demo analytics derived from club star priors and the
          fixture seed. They are not official tracking, Opta, or provider event data.
        </p>
      </section>

      <div className="dashboard-grid">
        <div className="stack">
          <MatchMomentumChart
            momentum={centre.momentum}
            homeName={home.shortName}
            awayName={away.shortName}
          />
          <MatchComparisonBars
            title="Headline stats"
            rows={centre.headline}
            homeLabel={home.shortName}
            awayLabel={away.shortName}
          />
          <MatchComparisonBars
            title="Attack"
            rows={centre.attack}
            homeLabel={home.shortName}
            awayLabel={away.shortName}
          />
          <MatchComparisonBars
            title="Defence"
            rows={centre.defence}
            homeLabel={home.shortName}
            awayLabel={away.shortName}
          />
          <MatchComparisonBars
            title="Distribution"
            rows={centre.distribution}
            homeLabel={home.shortName}
            awayLabel={away.shortName}
          />
        </div>
        <aside className="stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Possession</h2>
                <p>Synthetic share of the ball</p>
              </div>
            </div>
            <div
              className="possession-donut"
              style={{ ["--home" as string]: `${centre.possession.home}%` }}
            >
              <div className="possession-centre">
                <span>{centre.possession.home.toFixed(1)}%</span>
                <small>{home.abbreviation}</small>
              </div>
            </div>
            <div className="possession-legend">
              <span>
                <i className="swatch home" /> {home.shortName} {centre.possession.home.toFixed(1)}%
              </span>
              <span>
                <i className="swatch away" /> {away.shortName} {centre.possession.away.toFixed(1)}%
              </span>
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Line-ups</h2>
                <p>
                  {centre.formations.home} vs {centre.formations.away}
                </p>
              </div>
              <span className="eyebrow">Synthetic XI</span>
            </div>
            <div className="lineup-grid">
              <div>
                <h3>
                  {home.shortName} · {centre.formations.home}
                </h3>
                <ul className="lineup-list">
                  {centre.lineups.home.map((player) => (
                    <li key={`home-${player.number}`}>
                      <span>{player.number}</span>
                      <strong>
                        {player.name}
                        {player.captain ? " (c)" : ""}
                      </strong>
                      <small>{player.role}</small>
                    </li>
                  ))}
                </ul>
                <h4>Substitutes</h4>
                <ul className="lineup-list compact">
                  {centre.lineups.homeBench.map((player) => (
                    <li key={`home-bench-${player.number}`}>
                      <span>{player.number}</span>
                      <strong>{player.name}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>
                  {away.shortName} · {centre.formations.away}
                </h3>
                <ul className="lineup-list">
                  {centre.lineups.away.map((player) => (
                    <li key={`away-${player.number}`}>
                      <span>{player.number}</span>
                      <strong>
                        {player.name}
                        {player.captain ? " (c)" : ""}
                      </strong>
                      <small>{player.role}</small>
                    </li>
                  ))}
                </ul>
                <h4>Substitutes</h4>
                <ul className="lineup-list compact">
                  {centre.lineups.awayBench.map((player) => (
                    <li key={`away-bench-${player.number}`}>
                      <span>{player.number}</span>
                      <strong>{player.name}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
