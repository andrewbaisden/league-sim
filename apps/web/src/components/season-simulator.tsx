"use client";

import type {
  Fixture,
  FixtureOverride,
  SeasonSimulationResult,
  StandingRow,
  Team,
} from "@leaguesim/domain";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { type SeasonHistoryEntry, useSimulationStore } from "@/stores/simulation-store";
import { LeagueTable } from "./league-table";

interface SeasonResponse {
  result: SeasonSimulationResult;
  reality: "SIMULATION";
  batchId?: string;
  persisted?: boolean;
  baseSnapshotId?: string;
}

interface InitialBatchView {
  batchId: string;
  seed: number;
  standings: StandingRow[];
  fixtures: Fixture[];
}

function toHistoryEntry(batchView: InitialBatchView): SeasonHistoryEntry {
  return {
    seed: batchView.seed,
    modelVersion: "poisson-v1",
    standings: batchView.standings,
    fixtures: batchView.fixtures
      .filter((fixture) => fixture.status === "FINISHED" && fixture.score)
      .map((fixture) => ({
        fixtureId: fixture.id,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeGoals: fixture.score?.home ?? 0,
        awayGoals: fixture.score?.away ?? 0,
        source: "SAMPLED" as const,
      })),
    batchId: batchView.batchId,
    persisted: true,
  };
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
  standings,
  baseSnapshotId,
  initialBatchView,
}: {
  seasonId: string;
  teams: Team[];
  fixtures: Fixture[];
  standings: StandingRow[];
  baseSnapshotId?: string;
  initialBatchView?: InitialBatchView | null;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const seed = useSimulationStore((state) => state.seed);
  const scenarioOverrides = useSimulationStore((state) => state.overrides);
  const adjustments = useSimulationStore((state) => state.adjustments);
  const activeScenarioId = useSimulationStore((state) => state.activeScenarioId);
  const activeBatchId = useSimulationStore((state) => state.activeBatchId);
  const history = useSimulationStore((state) => state.seasonHistory);
  const nextSeed = useSimulationStore((state) => state.nextSeed);
  const resetScenario = useSimulationStore((state) => state.reset);
  const setActiveBatchId = useSimulationStore((state) => state.setActiveBatchId);
  const setBaseSnapshotId = useSimulationStore((state) => state.setBaseSnapshotId);
  const setLastSeasonResult = useSimulationStore((state) => state.setLastSeasonResult);
  const setSeasonHistory = useSimulationStore((state) => state.setSeasonHistory);
  const pushSeasonHistory = useSimulationStore((state) => state.pushSeasonHistory);
  const popSeasonHistory = useSimulationStore((state) => state.popSeasonHistory);
  const storeBaseSnapshotId = useSimulationStore((state) => state.baseSnapshotId);
  const hydratedBatchIdRef = useRef<string | null>(null);
  const [scenarioName, setScenarioName] = useState("My what-if season");
  const [saveMessage, setSaveMessage] = useState("");
  const current = history.at(-1);
  const effectiveBaseSnapshotId = storeBaseSnapshotId ?? baseSnapshotId ?? null;
  const projectedBatchId = current?.batchId ?? activeBatchId;
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
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
  const tableRows = current?.standings ?? standings;

  useEffect(() => {
    if (baseSnapshotId) setBaseSnapshotId(baseSnapshotId);
  }, [baseSnapshotId, setBaseSnapshotId]);

  useEffect(() => {
    if (!initialBatchView) return;
    if (hydratedBatchIdRef.current === initialBatchView.batchId) return;
    if (current?.batchId === initialBatchView.batchId) {
      hydratedBatchIdRef.current = initialBatchView.batchId;
      return;
    }
    const entry = toHistoryEntry(initialBatchView);
    setSeasonHistory([entry]);
    setActiveBatchId(initialBatchView.batchId);
    setLastSeasonResult(entry);
    hydratedBatchIdRef.current = initialBatchView.batchId;
  }, [initialBatchView, current?.batchId, setActiveBatchId, setLastSeasonResult, setSeasonHistory]);

  const syncBatchUrl = (batchId: string | null) => {
    const nextUrl = batchId ? `/?batchId=${batchId}` : "/";
    router.replace(nextUrl, { scroll: false });
  };

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
        ...(activeScenarioId ? { scenarioId: activeScenarioId } : {}),
        persist: true,
        ...(throughMatchweek ? { throughMatchweek } : {}),
      });
    },
    onSuccess: ({ result, batchId, persisted, baseSnapshotId: responseSnapshotId }) => {
      const entry: SeasonHistoryEntry = { ...result };
      if (batchId) entry.batchId = batchId;
      if (persisted !== undefined) entry.persisted = persisted;
      pushSeasonHistory(entry);
      if (batchId) {
        hydratedBatchIdRef.current = batchId;
        syncBatchUrl(batchId);
      }
      if (responseSnapshotId) setBaseSnapshotId(responseSnapshotId);
      else if (baseSnapshotId) setBaseSnapshotId(baseSnapshotId);
      nextSeed();
      setSaveMessage(
        persisted && batchId
          ? `Saved simulation batch ${batchId.slice(0, 8)}… — open any team from the table and return to keep exploring this run.`
          : "Simulation completed in memory only. Check that Postgres is running and seeded with pnpm db:setup.",
      );
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveBaseSnapshotId) {
        throw new Error("Base snapshot unavailable. Run pnpm db:setup.");
      }
      if (!current?.batchId) throw new Error("Simulate and persist a season batch first.");
      const response = await fetch("/api/v1/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: scenarioName,
          seasonId,
          baseSnapshotId: effectiveBaseSnapshotId,
          overrides: scenarioOverrides,
          adjustments,
          batchId: current.batchId,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save scenario");
      }
      return response.json() as Promise<{ scenario: { id: string; name: string } }>;
    },
    onSuccess: ({ scenario }) => {
      useSimulationStore.getState().setActiveScenarioId(scenario.id);
      setSaveMessage(`Scenario "${scenario.name}" saved. Reopen it from Account.`);
    },
  });

  const undo = () => {
    popSeasonHistory();
    const nextCurrent = useSimulationStore.getState().seasonHistory.at(-1);
    hydratedBatchIdRef.current = nextCurrent?.batchId ?? null;
    syncBatchUrl(nextCurrent?.batchId ?? null);
    setSaveMessage("");
  };

  const reset = () => {
    resetScenario();
    if (baseSnapshotId) setBaseSnapshotId(baseSnapshotId);
    hydratedBatchIdRef.current = null;
    setSaveMessage("");
    syncBatchUrl(null);
  };

  const isSimulationView = Boolean(current);
  const tableCaption = isSimulationView
    ? "Projected season table"
    : "Current Premier League standings";
  const simulationDescription = current
    ? `Seed ${current.seed} · ${current.fixtures.length} simulated fixtures${current.batchId ? ` · batch ${current.batchId.slice(0, 8)}` : ""}`
    : null;
  const tableDescription = simulationDescription
    ? simulationDescription
    : fixtures.every((fixture) => fixture.status === "SCHEDULED")
      ? "Before matchweek 1 · all teams start level"
      : "Live table based on the current snapshot";

  return (
    <section className="card season-workspace" aria-labelledby="season-simulator-title">
      <div className="card-head">
        <div>
          <h2 id="season-simulator-title">Season workspace</h2>
          <p>
            Progress matchweek by matchweek, inspect a team, then come back to the same simulation.
          </p>
        </div>
        <span className="eyebrow">{isSimulationView ? "Simulation" : "Current"}</span>
      </div>
      <div>
        <div className="projection-label">
          <span className="eyebrow">{isSimulationView ? "Projected" : "Table"}</span>
          <span>{tableDescription}</span>
        </div>
        <LeagueTable
          rows={tableRows}
          teams={teams}
          caption={tableCaption}
          {...(projectedBatchId ? { batchId: projectedBatchId } : {})}
        />
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
          onClick={undo}
        >
          Undo
        </button>
        <button className="button button-secondary light" type="button" onClick={reset}>
          Reset to current
        </button>
      </div>
      {session && current?.persisted ? (
        <div className="season-save">
          <label>
            <span className="control-label" style={{ color: "var(--muted)" }}>
              Scenario name
            </span>
            <input
              className="account-input"
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
            />
          </label>
          <button
            className="button button-primary"
            type="button"
            disabled={saveMutation.isPending || !effectiveBaseSnapshotId}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : "Save scenario"}
          </button>
        </div>
      ) : null}
      {mutation.error || saveMutation.error ? (
        <p className="workspace-error">{mutation.error?.message ?? saveMutation.error?.message}</p>
      ) : null}
      {saveMessage ? <p className="workspace-empty">{saveMessage}</p> : null}
      {current ? (
        <details className="simulated-results">
          <summary>Inspect all {current.fixtures.length} simulated results</summary>
          <div className="result-list">
            {current.fixtures.map((fixture) => (
              <div key={fixture.fixtureId}>
                <span>{teamNames.get(fixture.homeTeamId)}</span>
                <strong>
                  {fixture.homeGoals}-{fixture.awayGoals}
                </strong>
                <span>{teamNames.get(fixture.awayTeamId)}</span>
                <small>{fixture.source === "OVERRIDE" ? "LOCKED" : "SIMULATION"}</small>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <p className="workspace-empty">
          Simulate a matchweek to update this table in place. Reset returns every team to the
          current all-zero snapshot.
        </p>
      )}
    </section>
  );
}
