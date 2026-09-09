"use client";

import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { useMemo } from "react";
import type { MatchMomentumPoint } from "@/lib/synthetic-match-stats";

interface MomentumRow {
  minute: string;
  net: number;
}

export function MatchMomentumChart({
  momentum,
  homeName,
  awayName,
}: {
  momentum: MatchMomentumPoint[];
  homeName: string;
  awayName: string;
}) {
  const sampled = useMemo(
    () => momentum.filter((point) => point.minute === 1 || point.minute % 5 === 0),
    [momentum],
  );
  const rows = useMemo<MomentumRow[]>(
    () =>
      sampled.map((point) => ({
        minute: `${point.minute}'`,
        net: Number((point.home - point.away).toFixed(2)),
      })),
    [sampled],
  );

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(rows, {
            x: "minute",
            y: "net",
            fill: "#94ab0f",
          }),
        ],
        scales: {
          x: {
            scale: () => scaleBand().padding(0.15),
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: `Net pressure (${homeName} − ${awayName})` },
          },
        },
      }),
    [awayName, homeName, rows],
  );

  return (
    <section className="card match-stat-card" aria-labelledby="momentum-title">
      <div className="card-head">
        <div>
          <h2 id="momentum-title">Match momentum</h2>
          <p>Synthetic net pressure every five minutes · positive favours {homeName}</p>
        </div>
        <span className="eyebrow">TanStack Charts</span>
      </div>
      <div className="match-chart-host">
        <Chart definition={definition} height={280} ariaLabel="Synthetic match momentum chart" />
      </div>
    </section>
  );
}
