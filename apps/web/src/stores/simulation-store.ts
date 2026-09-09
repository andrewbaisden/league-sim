import type { FixtureOverride, MatchOutcome, TeamAdjustment } from "@leaguesim/domain";
import { create } from "zustand";

interface SimulationState {
  selectedFixtureId: string;
  seed: number;
  overrides: FixtureOverride[];
  adjustments: TeamAdjustment[];
  setSelectedFixtureId: (fixtureId: string) => void;
  setOutcome: (fixtureId: string, outcome?: MatchOutcome) => void;
  setAdjustment: (adjustment: TeamAdjustment) => void;
  nextSeed: () => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  selectedFixtureId: "",
  seed: 42,
  overrides: [],
  adjustments: [],
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
  nextSeed: () => set((state) => ({ seed: (state.seed + 1) >>> 0 })),
  reset: () => set({ selectedFixtureId: "", seed: 42, overrides: [], adjustments: [] }),
}));
