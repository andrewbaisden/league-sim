"use client";

import type {
  Fixture,
  FixtureOverride,
  MatchOutcome,
  MatchProbability,
  MonteCarloResult,
  Team,
} from "@leaguesim/domain";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useSimulationStore } from "@/stores/simulation-store";
import { PositionHeatmap } from "./position-heatmap";

interface MatchResponse {
  probability: MatchProbability;
  sampled: { homeGoals: number; awayGoals: number };
}

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json()).error ?? "Request failed");
  return response.json() as Promise<T>;
}

export function SimulationLab({
  seasonId,
  fixtures,
  teams,
}: {
  seasonId: string;
  fixtures: Fixture[];
  teams: Team[];
}) {
  const selectedFixtureId = useSimulationStore((state) => state.selectedFixtureId);
  const seed = useSimulationStore((state) => state.seed);
  const setSelectedFixtureId = useSimulationStore((state) => state.setSelectedFixtureId);
  const overrides = useSimulationStore((state) => state.overrides);
  const adjustments = useSimulationStore((state) => state.adjustments);
  const setOutcome = useSimulationStore((state) => state.setOutcome);
  const setAdjustment = useSimulationStore((state) => state.setAdjustment);
  const nextSeed = useSimulationStore((state) => state.nextSeed);
  const lastSeasonResult = useSimulationStore((state) => state.lastSeasonResult);
  const upcoming = useMemo(() => {
    const simulatedIds = new Set(
      lastSeasonResult?.fixtures.map((fixture) => fixture.fixtureId) ?? [],
    );
    return fixtures
      .filter(
        (fixture) =>
          (fixture.status === "SCHEDULED" || fixture.status === "POSTPONED") &&
          !simulatedIds.has(fixture.id),
      )
      .toSorted(
        (left, right) =>
          new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime() ||
          left.id.localeCompare(right.id),
      );
  }, [fixtures, lastSeasonResult]);
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const selectedOverride = overrides.find(
    (override): override is Extract<FixtureOverride, { kind: "OUTCOME" }> =>
      override.fixtureId === selectedFixtureId && override.kind === "OUTCOME",
  );
  useEffect(() => {
    if (!upcoming.some((fixture) => fixture.id === selectedFixtureId)) {
      setSelectedFixtureId(upcoming[0]?.id ?? "");
    }
  }, [selectedFixtureId, setSelectedFixtureId, upcoming]);

  const match = useMutation({
    mutationFn: () =>
      postJson<MatchResponse>("/api/v1/simulations/match", {
        fixtureId: selectedFixtureId,
        seed,
        adjustments,
        ...(selectedOverride?.kind === "OUTCOME"
          ? { forcedOutcome: selectedOverride.outcome }
          : {}),
      }),
    onSuccess: () => nextSeed(),
  });
  const monteCarlo = useMutation({
    mutationFn: () =>
      postJson<{ result: MonteCarloResult }>("/api/v1/simulation-batches", {
        seasonId,
        seed,
        runs: 1000,
        overrides,
        adjustments,
      }),
    onSuccess: () => nextSeed(),
  });

  const selected = upcoming.find((fixture) => fixture.id === selectedFixtureId);
  const matchData = match.data?.probability.fixtureId === selected?.id ? match.data : undefined;
  const probability = matchData?.probability;
  return (
    <section className="card simulation" id="simulation" aria-labelledby="simulation-title">
      <div className="card-head simulation-head">
        <div className="simulation-heading">
          <div>
            <h2 id="simulation-title">Simulation lab</h2>
            <p>Poisson v1 · seed {seed}</p>
          </div>
          <span className="eyebrow">Hypothetical</span>
        </div>
        {selected ? (
          <div className="simulation-controls">
            <fieldset className="scenario-controls">
              <legend>What-if outcome lock</legend>
              <div className="segmented">
                {[
                  ["HOME", `${names.get(selected.homeTeamId)} win`],
                  ["DRAW", "Draw"],
                  ["AWAY", `${names.get(selected.awayTeamId)} win`],
                ].map(([outcome, label]) => (
                  <button
                    className={selectedOverride?.outcome === outcome ? "active" : ""}
                    key={outcome}
                    type="button"
                    aria-pressed={selectedOverride?.outcome === outcome}
                    onClick={() =>
                      setOutcome(
                        selected.id,
                        selectedOverride?.outcome === outcome
                          ? undefined
                          : (outcome as MatchOutcome),
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="strength-controls">
              {[selected.homeTeamId, selected.awayTeamId].map((teamId) => {
                const adjustment = adjustments.find((item) => item.teamId === teamId) ?? {
                  teamId,
                  attackMultiplier: 1,
                  defenceMultiplier: 1,
                };
                return (
                  <label key={teamId}>
                    <span>
                      {names.get(teamId)} attack
                      <strong>{Math.round((adjustment.attackMultiplier - 1) * 100)}%</strong>
                    </span>
                    <input
                      type="range"
                      min="0.8"
                      max="1.2"
                      step="0.01"
                      value={adjustment.attackMultiplier}
                      onChange={(event) =>
                        setAdjustment({
                          ...adjustment,
                          attackMultiplier: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <div className="sim-body">
        <div>
          <label className="control-label" htmlFor="fixture-select">
            Upcoming fixture
          </label>
          <select
            id="fixture-select"
            className="select"
            value={selectedFixtureId}
            onChange={(event) => {
              match.reset();
              setSelectedFixtureId(event.target.value);
            }}
          >
            {upcoming.length === 0 ? <option value="">Season complete</option> : null}
            {upcoming.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {names.get(fixture.homeTeamId)} vs {names.get(fixture.awayTeamId)}
              </option>
            ))}
          </select>
        </div>
        {matchData && selected ? (
          <div className="score" aria-live="polite">
            <strong>
              {matchData.sampled.homeGoals} – {matchData.sampled.awayGoals}
            </strong>
            <span className="score-caption">
              {names.get(selected.homeTeamId)} vs {names.get(selected.awayTeamId)} · sampled result
            </span>
          </div>
        ) : null}
        {probability ? (
          <fieldset className="probability" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Match outcome probabilities</legend>
            {[
              ["Home", probability.homeWin],
              ["Draw", probability.draw],
              ["Away", probability.awayWin],
            ].map(([label, raw]) => {
              const value = Number(raw);
              return (
                <div className="probability-row" key={String(label)}>
                  <span>{label}</span>
                  <span className="bar">
                    <span
                      className="bar-fill"
                      style={{ display: "block", width: `${value * 100}%` }}
                    />
                  </span>
                  <strong>{(value * 100).toFixed(0)}%</strong>
                </div>
              );
            })}
          </fieldset>
        ) : (
          <p className="muted" style={{ fontSize: ".75rem", lineHeight: 1.55, margin: 0 }}>
            Sample one plausible scoreline, or run 1,000 complete seasons to see the
            distribution—not a claim of certainty.
          </p>
        )}
        <div className="button-row">
          <button
            type="button"
            className="button button-primary"
            disabled={!selectedFixtureId || match.isPending}
            onClick={() => match.mutate()}
          >
            {match.isPending ? "Simulating…" : match.data ? "Simulate again" : "Simulate match"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            disabled={monteCarlo.isPending}
            onClick={() => monteCarlo.mutate()}
          >
            {monteCarlo.isPending ? "Running…" : "Run 1,000 seasons"}
          </button>
        </div>
        {monteCarlo.data ? (
          <div className="monte-carlo-results" aria-live="polite">
            <p className="muted" style={{ fontSize: ".72rem", margin: 0 }}>
              Completed {monteCarlo.data.result.runs.toLocaleString()} runs in{" "}
              {monteCarlo.data.result.durationMs.toFixed(0)} ms · expected points and finish
              probabilities below. Canonical table remains unchanged.
            </p>
            <div className="projection-metrics">
              {monteCarlo.data.result.projections.slice(0, 6).map((projection) => {
                const name = names.get(projection.teamId);
                return (
                  <div key={projection.teamId}>
                    <strong>{name}</strong>
                    <span>
                      xPts {projection.expectedPoints.toFixed(1)} · title{" "}
                      {(projection.titleProbability * 100).toFixed(0)}% · rel{" "}
                      {(projection.relegationProbability * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <PositionHeatmap projections={monteCarlo.data.result.projections} teams={teams} />
          </div>
        ) : null}
        {match.error || monteCarlo.error ? (
          <p style={{ color: "#ffae94", fontSize: ".72rem", margin: 0 }}>
            {match.error?.message ?? monteCarlo.error?.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
