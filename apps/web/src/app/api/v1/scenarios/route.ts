import { db } from "@leaguesim/db";
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
  adjustments: { include: { teamSeason: { select: { teamId: true } } } },
} as const;

export async function GET(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const scenarios = await db.simulationScenario.findMany({
    where: { ownerId },
    include: scenarioInclude,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ scenarios });
}

export async function POST(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = scenarioInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid scenario", issues: parsed.error.issues },
      { status: 400 },
    );
  const baseSnapshot = await db.simulationBaseSnapshot.findFirst({
    where: { id: parsed.data.baseSnapshotId, seasonId: parsed.data.seasonId },
    select: { id: true },
  });
  if (!baseSnapshot)
    return NextResponse.json({ error: "Base snapshot not found" }, { status: 404 });
  const memberships = await db.teamSeason.findMany({
    where: {
      seasonId: parsed.data.seasonId,
      teamId: { in: parsed.data.adjustments.map((adjustment) => adjustment.teamId) },
    },
    select: { id: true, teamId: true },
  });
  const membershipByTeam = new Map(
    memberships.map((membership) => [membership.teamId, membership.id]),
  );
  if (memberships.length !== parsed.data.adjustments.length)
    return NextResponse.json(
      { error: "Scenario contains a team outside the season" },
      { status: 400 },
    );

  const scenario = await db.simulationScenario.create({
    data: {
      ownerId,
      seasonId: parsed.data.seasonId,
      baseSnapshotId: parsed.data.baseSnapshotId,
      name: parsed.data.name,
      overrides: {
        create: parsed.data.overrides.map((override) =>
          override.kind === "EXACT_SCORE"
            ? {
                fixtureId: override.fixtureId,
                kind: "EXACT_SCORE",
                homeGoals: override.homeGoals,
                awayGoals: override.awayGoals,
              }
            : { fixtureId: override.fixtureId, kind: "OUTCOME", outcome: override.outcome },
        ),
      },
      adjustments: {
        create: parsed.data.adjustments.map((adjustment) => ({
          teamSeasonId: membershipByTeam.get(adjustment.teamId) ?? "",
          attackMultiplier: adjustment.attackMultiplier,
          defenceMultiplier: adjustment.defenceMultiplier,
        })),
      },
    },
    include: scenarioInclude,
  });
  return NextResponse.json({ scenario }, { status: 201 });
}

const updateSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) });

export async function PATCH(request: Request) {
  const ownerId = await sessionUserId(request);
  if (!ownerId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid scenario update" }, { status: 400 });
  const updated = await db.simulationScenario.updateMany({
    where: { id: parsed.data.id, ownerId },
    data: { name: parsed.data.name },
  });
  if (updated.count === 0)
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
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
  if (deleted.count === 0)
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
