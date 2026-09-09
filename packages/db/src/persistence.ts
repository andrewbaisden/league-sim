import { createHash } from "node:crypto";
import type {
  FixtureOverride,
  MonteCarloResult,
  SeasonSimulationResult,
  TeamAdjustment,
} from "@leaguesim/domain";
import { Prisma } from "@prisma/client";
import { db } from "./client";
import { DEMO_PROVIDER, DEMO_SEASON_KEY, DEMO_SNAPSHOT_FINGERPRINT } from "./ids";

export async function databaseAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function findLatestBaseSnapshot(seasonId?: string) {
  return db.simulationBaseSnapshot.findFirst({
    where: seasonId
      ? { OR: [{ seasonId }, { fingerprint: DEMO_SNAPSHOT_FINGERPRINT }] }
      : { fingerprint: DEMO_SNAPSHOT_FINGERPRINT },
    orderBy: { cutoffAt: "desc" },
  });
}

export async function resolveSeasonRecord(seasonRef: string) {
  if (seasonRef === DEMO_SEASON_KEY) {
    return db.season.findFirst({
      where: { competition: { slug: "premier-league" }, label: "2026/27" },
    });
  }
  return db.season.findUnique({ where: { id: seasonRef } });
}

export async function resolveFixtureIds(externalIds: string[]): Promise<Map<string, string>> {
  if (externalIds.length === 0) return new Map();
  const maps = await db.providerFixtureMap.findMany({
    where: { provider: DEMO_PROVIDER, externalId: { in: externalIds } },
    select: { externalId: true, fixtureId: true },
  });
  return new Map(maps.map((row) => [row.externalId, row.fixtureId]));
}

export async function resolveTeamSeasonIds(
  seasonId: string,
  teamSlugs: string[],
): Promise<Map<string, string>> {
  if (teamSlugs.length === 0) return new Map();
  const rows = await db.teamSeason.findMany({
    where: { seasonId, team: { slug: { in: teamSlugs } } },
    select: { id: true, team: { select: { slug: true } } },
  });
  return new Map(rows.map((row) => [row.team.slug, row.id]));
}

export function hashSimulationInput(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function persistSeasonSimulation(options: {
  baseSnapshotId: string;
  ownerId?: string | null;
  scenarioId?: string | null;
  seed: number;
  result: SeasonSimulationResult;
  overrides: FixtureOverride[];
  adjustments: TeamAdjustment[];
  throughMatchweek?: number | null;
}) {
  const fixtureIds = await resolveFixtureIds(options.result.fixtures.map((item) => item.fixtureId));
  const missing = options.result.fixtures.filter((item) => !fixtureIds.has(item.fixtureId));
  if (missing.length > 0) {
    throw new Error(`Missing fixture mappings for ${missing.length} simulated fixtures`);
  }
  const inputManifest = JSON.parse(
    JSON.stringify({
      kind: "SEASON",
      seed: options.seed,
      overrides: options.overrides,
      adjustments: options.adjustments,
      throughMatchweek: options.throughMatchweek ?? null,
      modelVersion: options.result.modelVersion,
    }),
  ) as Prisma.InputJsonValue;
  const inputHash = hashSimulationInput(inputManifest);
  const now = new Date();
  return db.simulationBatch.create({
    data: {
      ownerId: options.ownerId ?? null,
      scenarioId: options.scenarioId ?? null,
      baseSnapshotId: options.baseSnapshotId,
      kind: "SEASON",
      status: "COMPLETED",
      seed: BigInt(options.seed),
      modelVersion: options.result.modelVersion,
      runCount: 1,
      progress: 1,
      inputHash,
      inputManifest,
      durationMs: null,
      fixturesSimulated: options.result.fixtures.length,
      startedAt: now,
      completedAt: now,
      fixtures: {
        create: options.result.fixtures.map((fixture) => ({
          fixtureId: fixtureIds.get(fixture.fixtureId) as string,
          homeGoals: fixture.homeGoals,
          awayGoals: fixture.awayGoals,
          source: fixture.source,
        })),
      },
    },
  });
}

export async function persistMonteCarloBatch(options: {
  baseSnapshotId: string;
  ownerId?: string | null;
  scenarioId?: string | null;
  seed: number;
  result: MonteCarloResult;
  overrides: FixtureOverride[];
  adjustments: TeamAdjustment[];
  seasonId: string;
}) {
  const teamSeasonIds = await resolveTeamSeasonIds(
    options.seasonId,
    options.result.projections.map((projection) => projection.teamId),
  );
  if (teamSeasonIds.size !== options.result.projections.length) {
    throw new Error("Missing team-season mappings for Monte Carlo projections");
  }
  const inputManifest = JSON.parse(
    JSON.stringify({
      kind: "MONTE_CARLO",
      seed: options.seed,
      runs: options.result.runs,
      overrides: options.overrides,
      adjustments: options.adjustments,
      modelVersion: options.result.modelVersion,
    }),
  ) as Prisma.InputJsonValue;
  const inputHash = hashSimulationInput(inputManifest);
  const now = new Date();
  return db.simulationBatch.create({
    data: {
      ownerId: options.ownerId ?? null,
      scenarioId: options.scenarioId ?? null,
      baseSnapshotId: options.baseSnapshotId,
      kind: "MONTE_CARLO",
      status: "COMPLETED",
      seed: BigInt(options.seed),
      modelVersion: options.result.modelVersion,
      runCount: options.result.runs,
      progress: options.result.runs,
      inputHash,
      inputManifest,
      durationMs: Math.round(options.result.durationMs),
      fixturesSimulated: options.result.fixturesSimulated,
      startedAt: now,
      completedAt: now,
      projections: {
        create: options.result.projections.map((projection) => ({
          teamSeasonId: teamSeasonIds.get(projection.teamId) as string,
          expectedPoints: new Prisma.Decimal(projection.expectedPoints),
          expectedPosition: new Prisma.Decimal(projection.expectedPosition),
          titleProbability: new Prisma.Decimal(projection.titleProbability),
          topFourProbability: new Prisma.Decimal(projection.topFourProbability),
          topSixProbability: new Prisma.Decimal(projection.topSixProbability),
          relegationProbability: new Prisma.Decimal(projection.relegationProbability),
        })),
      },
      positionProbabilities: {
        create: options.result.projections.flatMap((projection) => {
          const teamSeasonId = teamSeasonIds.get(projection.teamId);
          if (!teamSeasonId) return [];
          return projection.positionProbabilities.map((probability, index) => ({
            teamSeasonId,
            position: index + 1,
            count: new Prisma.Decimal(probability * options.result.runs),
            probability: new Prisma.Decimal(probability),
          }));
        }),
      },
    },
  });
}
