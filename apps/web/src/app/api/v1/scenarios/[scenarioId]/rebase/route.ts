import { db } from "@leaguesim/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ scenarioId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const confirmation = z
    .object({ confirmed: z.literal(true) })
    .safeParse(await request.json().catch(() => null));
  if (!confirmation.success) {
    return NextResponse.json({ error: "Rebasing requires explicit confirmation" }, { status: 400 });
  }
  const { scenarioId } = await context.params;
  const scenario = await db.simulationScenario.findFirst({
    where: { id: scenarioId, ownerId: session.user.id },
    include: { overrides: true, adjustments: true },
  });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  const latest = await db.simulationBaseSnapshot.findFirst({
    where: { seasonId: scenario.seasonId },
    orderBy: { cutoffAt: "desc" },
    select: { id: true, cutoffAt: true },
  });
  if (!latest)
    return NextResponse.json({ error: "No current snapshot available" }, { status: 409 });
  if (latest.id === scenario.baseSnapshotId) {
    return NextResponse.json(
      { error: "Scenario already uses the current snapshot" },
      { status: 409 },
    );
  }
  const rebased = await db.simulationScenario.create({
    data: {
      ownerId: scenario.ownerId,
      seasonId: scenario.seasonId,
      baseSnapshotId: latest.id,
      name: `${scenario.name} (rebased)`,
      overrides: {
        create: scenario.overrides.map((override) => ({
          fixtureId: override.fixtureId,
          kind: override.kind,
          outcome: override.outcome,
          homeGoals: override.homeGoals,
          awayGoals: override.awayGoals,
        })),
      },
      adjustments: {
        create: scenario.adjustments.map((adjustment) => ({
          teamSeasonId: adjustment.teamSeasonId,
          attackMultiplier: adjustment.attackMultiplier,
          defenceMultiplier: adjustment.defenceMultiplier,
        })),
      },
    },
  });
  return NextResponse.json(
    {
      scenarioId: rebased.id,
      sourceScenarioId: scenarioId,
      baseSnapshotId: latest.id,
      cutoffAt: latest.cutoffAt,
    },
    { status: 201 },
  );
}
