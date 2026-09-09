import {
  DEMO_PROVIDER,
  db,
  resolveFixtureIds,
  resolveSeasonRecord,
  resolveTeamSeasonIds,
} from "@leaguesim/db";
import { scenarioInputSchema } from "@leaguesim/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

async function sessionUserId(request: Request): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

const scenarioInclude = {
  overrides: true,
  adjustments: {
    include: { teamSeason: { select: { team: { select: { slug: true } } } } },
  },
  batches: {
    select: { id: true, kind: true, status: true, createdAt: true, runCount: true },
    orderBy: { createdAt: "desc" as const },
    take: 5,
  },
} as const;

type ScenarioRecord = Awaited<
  ReturnType<
    typeof db.simulationScenario.findFirst<{
      include: typeof scenarioInclude;
    }>
  >
>;

async function externalFixtureIds(fixtureIds: string[]): Promise<Map<string, string>> {
  if (fixtureIds.length === 0) return new Map();
  const maps = await db.providerFixtureMap.findMany({
    where: { provider: DEMO_PROVIDER, fixtureId: { in: fixtureIds } },
    select: { fixtureId: true, externalId: true },
  });
  return new Map(maps.map((row) => [row.fixtureId, row.externalId]));
}

async function serializeScenario(scenario: NonNullable<ScenarioRecord>) {
  const fixtureMap = await externalFixtureIds(scenario.overrides.map((item) => item.fixtureId));
  return {
    id: scenario.id,
    name: scenario.name,
    seasonId: scenario.seasonId,
    baseSnapshotId: scenario.baseSnapshotId,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    overrides: scenario.overrides.map((override) => {
      const fixtureId = fixtureMap.get(override.fixtureId) ?? override.fixtureId;
      return override.kind === "EXACT_SCORE"
        ? {
            fixtureId,
            kind: "EXACT_SCORE" as const,
            homeGoals: override.homeGoals ?? 0,
            awayGoals: override.awayGoals ?? 0,
          }
        : {
            fixtureId,
            kind: "OUTCOME" as const,
            outcome: override.outcome ?? ("DRAW" as const),
          };
    }),
    adjustments: scenario.adjustments.map((adjustment) => ({
      teamId: adjustment.teamSeason.team.slug,
      attackMultiplier: Number(adjustment.attackMultiplier),
      defenceMultiplier: Number(adjustment.defenceMultiplier),
    })),
    batches: scenario.batches,
  };
}

export async function GET(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const scenarios = await db.simulationScenario.findMany({
    where: { ownerId },
    include: scenarioInclude,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    scenarios: await Promise.all(scenarios.map((scenario) => serializeScenario(scenario))),
  });
}

export async function POST(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = scenarioInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid scenario", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const seasonRecord = await resolveSeasonRecord(parsed.data.seasonId);
  if (!seasonRecord) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const baseSnapshot = await db.simulationBaseSnapshot.findFirst({
    where: { id: parsed.data.baseSnapshotId, seasonId: seasonRecord.id },
    select: { id: true },
  });
  if (!baseSnapshot) {
    return NextResponse.json({ error: "Base snapshot not found" }, { status: 404 });
  }

  const fixtureIds = await resolveFixtureIds(
    parsed.data.overrides.map((override) => override.fixtureId),
  );
  if (fixtureIds.size !== parsed.data.overrides.length) {
    return NextResponse.json(
      { error: "Scenario contains an unknown fixture override" },
      { status: 400 },
    );
  }

  const teamSeasonIds = await resolveTeamSeasonIds(
    seasonRecord.id,
    parsed.data.adjustments.map((adjustment) => adjustment.teamId),
  );
  if (teamSeasonIds.size !== parsed.data.adjustments.length) {
    return NextResponse.json(
      { error: "Scenario contains a team outside the season" },
      { status: 400 },
    );
  }

  const scenario = await db.simulationScenario.create({
    data: {
      ownerId,
      seasonId: seasonRecord.id,
      baseSnapshotId: parsed.data.baseSnapshotId,
      name: parsed.data.name,
      overrides: {
        create: parsed.data.overrides.map((override) =>
          override.kind === "EXACT_SCORE"
            ? {
                fixtureId: fixtureIds.get(override.fixtureId) as string,
                kind: "EXACT_SCORE",
                homeGoals: override.homeGoals,
                awayGoals: override.awayGoals,
              }
            : {
                fixtureId: fixtureIds.get(override.fixtureId) as string,
                kind: "OUTCOME",
                outcome: override.outcome,
              },
        ),
      },
      adjustments: {
        create: parsed.data.adjustments.map((adjustment) => ({
          teamSeasonId: teamSeasonIds.get(adjustment.teamId) as string,
          attackMultiplier: adjustment.attackMultiplier,
          defenceMultiplier: adjustment.defenceMultiplier,
        })),
      },
    },
    include: scenarioInclude,
  });

  if (parsed.data.batchId) {
    await db.simulationBatch.updateMany({
      where: { id: parsed.data.batchId, OR: [{ ownerId }, { ownerId: null }] },
      data: { scenarioId: scenario.id, ownerId },
    });
  }

  return NextResponse.json({ scenario: await serializeScenario(scenario) }, { status: 201 });
}

const updateSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) });

export async function PATCH(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scenario update" }, { status: 400 });
  }
  const updated = await db.simulationScenario.updateMany({
    where: { id: parsed.data.id, ownerId },
    data: { name: parsed.data.name },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }
  return NextResponse.json({ id: parsed.data.id, name: parsed.data.name });
}

export async function DELETE(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid scenario id" }, { status: 400 });
  const deleted = await db.simulationScenario.deleteMany({
    where: { id: parsed.data, ownerId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
