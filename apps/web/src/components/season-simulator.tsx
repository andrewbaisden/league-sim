"use client";

import type { Fixture, FixtureOverride, SeasonSimulationResult, Team } from "@leaguesim/domain";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSimulationStore } from "@/stores/simulation-store";
import { LeagueTable } from "./league-table";

interface SeasonResponse {
  result: SeasonSimulationResult;
  reality: "SIMULATION";
}

async function simulate(body: object): Promise<SeasonResponse> {
  const response = await fetch("/api/v1/simulations/season", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Simulation failed");
  }
  return response.json() as Promise<SeasonResponse>;
}

export function SeasonSimulator({
  seasonId,
  teams,
  fixtures,
}: {
  seasonId: string;
  teams: Team[];
  fixtures: Fixture[];
}) {
  const seed = useSimulationStore((state) => state.seed);
  const scenarioOverrides = useSimulationStore((state) => state.overrides);
  const adjustments = useSimulationStore((state) => state.adjustments);
  const nextSeed = useSimulationStore((state) => state.nextSeed);
  const resetScenario = useSimulationStore((state) => state.reset);
  const [history, setHistory] = useState<SeasonSimulationResult[]>([]);
  const current = history.at(-1);
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.shortName])), [teams]);
  const scheduledWeeks = useMemo(
    () =>
      [
        ...new Set(
          fixtures
            .filter((fixture) => fixture.status === "SCHEDULED")
            .map((fixture) => fixture.matchweek),
        ),
      ].toSorted((a, b) => a - b),
    [fixtures],
  );
  const lastSimulatedWeek = current
    ? Math.max(
        0,
        ...current.fixtures.map(
          (fixture) => fixtures.find((item) => item.id === fixture.fixtureId)?.matchweek ?? 0,
        ),
      )
    : 0;
  const nextWeek = scheduledWeeks.find((week) => week > lastSimulatedWeek);

  const mutation = useMutation({
    mutationFn: (throughMatchweek?: number) => {
      const locked = new Map<string, FixtureOverride>(
        scenarioOverrides.map((override) => [override.fixtureId, override]),
      );
      for (const fixture of current?.fixtures ?? []) {
        locked.set(fixture.fixtureId, {
          fixtureId: fixture.fixtureId,
          kind: "EXACT_SCORE",
          homeGoals: fixture.homeGoals,
          awayGoals: fixture.awayGoals,
        });
      }
      return simulate({
        seasonId,
        seed,
        overrides: [...locked.values()],
        adjustments,
        ...(throughMatchweek ? { throughMatchweek } : {}),
      });
    },
    onSuccess: ({ result }) => {
      setHistory((items) => [...items, result]);
      nextSeed();
    },
  });

  const reset = () => {
    setHistory([]);
    resetScenario();
  };

  return (
    <section className="card season-workspace" aria-labelledby="season-simulator-title">
      <div className="card-head">
        <div>
          <h2 id="season-simulator-title">Season workspace</h2>
          <p>Progress matchweek by matchweek or sample the entire remaining season</p>
        </div>
        <span className="eyebrow">{current ? "Simulation" : "Current"}</span>
      </div>
      <div className="season-toolbar">
        <button
          className="button button-primary"
          type="button"
          disabled={mutation.isPending || !nextWeek}
          onClick={() => mutation.mutate(nextWeek)}
        >
          {mutation.isPending
            ? "Simulating…"
            : nextWeek
              ? `Simulate MW ${nextWeek}`
              : "Season complete"}
        </button>
        <button
          className="button button-secondary light"
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(undefined)}
        >
          Simulate rest of season
        </button>
        <button
          className="button button-secondary light"
          type="button"
          disabled={history.length === 0}
          onClick={() => setHistory((items) => items.slice(0, -1))}
        >
          Undo
        </button>
        <button className="button button-secondary light" type="button" onClick={reset}>
          Reset to current
        </button>
      </div>
      {mutation.error ? <p className="workspace-error">{mutation.error.message}</p> : null}
      {current ? (
        <div className="projected-layout">
          <div>
            <div className="projection-label">
              <span className="eyebrow">Projected</span>
              <span>
                Seed {current.seed} · fixed snapshot ratings · {current.fixtures.length} simulated
                fixtures
              </span>
            </div>
            <LeagueTable rows={current.standings} teams={teams} caption="Projected season table" />
          </div>
          <details className="simulated-results">
            <summary>Inspect all {current.fixtures.length} simulated results</summary>
            <div className="result-list">
              {current.fixtures.map((fixture) => (
                <div key={fixture.fixtureId}>
                  <span>{teamNames.get(fixture.homeTeamId)}</span>
                  <strong>
                    {fixture.homeGoals}–{fixture.awayGoals}
                  </strong>
                  <span>{teamNames.get(fixture.awayTeamId)}</span>
                  <small>{fixture.source === "OVERRIDE" ? "LOCKED" : "SIMULATION"}</small>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <p className="workspace-empty">
          The canonical table above is unchanged. Scenario locks and strength adjustments from the
          simulation lab will be applied here.
        </p>
      )}
    </section>
  );
}
