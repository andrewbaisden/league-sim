import type { MatchStatRow } from "@/lib/synthetic-match-stats";

function formatValue(row: MatchStatRow, side: "home" | "away"): string {
  const value = side === "home" ? row.home : row.away;
  if (row.format === "percent") return value.toFixed(1);
  if (row.format === "decimal") return value.toFixed(2);
  return String(value);
}

export function MatchComparisonBars({
  title,
  rows,
  homeLabel,
  awayLabel,
}: {
  title: string;
  rows: MatchStatRow[];
  homeLabel: string;
  awayLabel: string;
}) {
  return (
    <section className="card match-stat-card" aria-labelledby={`${title}-title`}>
      <div className="card-head">
        <div>
          <h2 id={`${title}-title`}>{title}</h2>
          <p>
            {homeLabel} vs {awayLabel}
          </p>
        </div>
        <span className="eyebrow">Synthetic</span>
      </div>
      <div className="match-stat-list">
        {rows.map((row) => {
          const total = row.home + row.away || 1;
          const homeShare = (row.home / total) * 100;
          const awayShare = (row.away / total) * 100;
          const homeLeads = row.home >= row.away;
          return (
            <div className="match-stat-row" key={row.id}>
              <div className="match-stat-values">
                <strong className={homeLeads ? "is-lead" : undefined}>
                  {formatValue(row, "home")}
                </strong>
                <span>{row.label}</span>
                <strong className={!homeLeads ? "is-lead" : undefined}>
                  {formatValue(row, "away")}
                </strong>
              </div>
              <div className="match-stat-bars" aria-hidden="true">
                <span className="match-stat-bar home" style={{ width: `${homeShare}%` }} />
                <span className="match-stat-bar away" style={{ width: `${awayShare}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
