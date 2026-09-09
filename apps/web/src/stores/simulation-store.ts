import type {
  FixtureOverride,
  MatchOutcome,
  SeasonSimulationResult,
  TeamAdjustment,
} from "@leaguesim/domain";
import { create } from "zustand";

interface SimulationState {
  selectedFixtureId: string;
  seed: number;
  overrides: FixtureOverride[];
  adjustments: TeamAdjustment[];
  activeBatchId: string | null;
  activeScenarioId: string | null;
  baseSnapshotId: string | null;
  lastSeasonResult: SeasonSimulationResult | null;
  setSelectedFixtureId: (fixtureId: string) => void;
  setOutcome: (fixtureId: string, outcome?: MatchOutcome) => void;
  setAdjustment: (adjustment: TeamAdjustment) => void;
  setActiveBatchId: (batchId: string | null) => void;
  setActiveScenarioId: (scenarioId: string | null) => void;
  setBaseSnapshotId: (baseSnapshotId: string | null) => void;
  setLastSeasonResult: (result: SeasonSimulationResult | null) => void;
  nextSeed: () => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  selectedFixtureId: "",
  seed: 42,
  overrides: [],
  adjustments: [],
  activeBatchId: null,
  activeScenarioId: null,
  baseSnapshotId: null,
  lastSeasonResult: null,
  setSelectedFixtureId: (selectedFixtureId) => set({ selectedFixtureId }),
  setOutcome: (fixtureId, outcome) =>
    set((state) => ({
      overrides: [
        ...state.overrides.filter((override) => override.fixtureId !== fixtureId),
        ...(outcome ? [{ fixtureId, kind: "OUTCOME" as const, outcome }] : []),
      ],
    })),
  setAdjustment: (adjustment) =>
    set((state) => ({
      adjustments: [
        ...state.adjustments.filter((item) => item.teamId !== adjustment.teamId),
        adjustment,
      ],
    })),
  setActiveBatchId: (activeBatchId) => set({ activeBatchId }),
  setActiveScenarioId: (activeScenarioId) => set({ activeScenarioId }),
  setBaseSnapshotId: (baseSnapshotId) => set({ baseSnapshotId }),
  setLastSeasonResult: (lastSeasonResult) => set({ lastSeasonResult }),
  nextSeed: () => set((state) => ({ seed: (state.seed + 1) >>> 0 })),
  reset: () =>
    set({
      selectedFixtureId: "",
      seed: 42,
      overrides: [],
      adjustments: [],
      activeBatchId: null,
      activeScenarioId: null,
      lastSeasonResult: null,
    }),
}));
