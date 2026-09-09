import { z } from "zod";

export const seedSchema = z.number().int().min(0).max(4_294_967_295);
export const simulationCountSchema = z.union([z.literal(100), z.literal(1_000), z.literal(10_000)]);

export const teamAdjustmentSchema = z.object({
  teamId: z.string().min(1),
  attackMultiplier: z.number().min(0.8).max(1.2),
  defenceMultiplier: z.number().min(0.8).max(1.2),
});

export const fixtureOverrideSchema = z.discriminatedUnion("kind", [
  z.object({
    fixtureId: z.string().min(1),
    kind: z.literal("EXACT_SCORE"),
    homeGoals: z.number().int().min(0).max(15),
    awayGoals: z.number().int().min(0).max(15),
  }),
  z.object({
    fixtureId: z.string().min(1),
    kind: z.literal("OUTCOME"),
    outcome: z.enum(["HOME", "DRAW", "AWAY"]),
  }),
]);

export const matchSimulationRequestSchema = z.object({
  fixtureId: z.string().min(1),
  seed: seedSchema.default(42),
  adjustments: z.array(teamAdjustmentSchema).max(20).default([]),
  forcedOutcome: z.enum(["HOME", "DRAW", "AWAY"]).optional(),
});

export const seasonSimulationRequestSchema = z.object({
  seasonId: z.string().min(1),
  seed: seedSchema.default(42),
  overrides: z.array(fixtureOverrideSchema).max(380).default([]),
  adjustments: z.array(teamAdjustmentSchema).max(20).default([]),
  throughMatchweek: z.number().int().min(1).max(60).optional(),
});

export const simulationBatchRequestSchema = seasonSimulationRequestSchema.extend({
  runs: simulationCountSchema.default(1_000),
});

export const scenarioInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  seasonId: z.string().min(1),
  baseSnapshotId: z.string().min(1),
  overrides: z.array(fixtureOverrideSchema).max(380).default([]),
  adjustments: z.array(teamAdjustmentSchema).max(20).default([]),
});

export type MatchSimulationRequest = z.infer<typeof matchSimulationRequestSchema>;
export type SeasonSimulationRequest = z.infer<typeof seasonSimulationRequestSchema>;
export type SimulationBatchRequest = z.infer<typeof simulationBatchRequestSchema>;
