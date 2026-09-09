import {
  databaseAvailable,
  findLatestBaseSnapshot,
  persistMonteCarloBatch,
  resolveSeasonRecord,
} from "@leaguesim/db";
import { runMonteCarlo } from "@leaguesim/domain";
import { simulationBatchRequestSchema } from "@leaguesim/validation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DEMO_SEASON_ID, getActiveSeason } from "@/lib/demo-data";

export async function POST(request: Request) {
  const parsed = simulationBatchRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid batch request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.seasonId !== DEMO_SEASON_ID) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const season = await getActiveSeason();
  const result = runMonteCarlo({
    teams: season.teams,
    fixtures: season.fixtures,
    rules: season.rules,
    ratings: season.ratings,
    seed: parsed.data.seed,
    runs: parsed.data.runs,
    overrides: parsed.data.overrides,
    adjustments: parsed.data.adjustments,
  });

  let batchId = `demo-${parsed.data.seed}-${parsed.data.runs}`;
  let persisted = false;
  if (parsed.data.persist && (await databaseAvailable()) && season.baseSnapshotId) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      const seasonRecord =
        season.seasonRecordId != null
          ? { id: season.seasonRecordId }
          : await resolveSeasonRecord(parsed.data.seasonId);
      if (seasonRecord) {
        const baseSnapshot = await findLatestBaseSnapshot(seasonRecord.id);
        if (baseSnapshot) {
          const batch = await persistMonteCarloBatch({
            baseSnapshotId: baseSnapshot.id,
            ownerId: session?.user.id ?? null,
            scenarioId: parsed.data.scenarioId ?? null,
            seed: parsed.data.seed,
            result,
            overrides: parsed.data.overrides,
            adjustments: parsed.data.adjustments,
            seasonId: seasonRecord.id,
          });
          batchId = batch.id;
          persisted = true;
        }
      }
    } catch (error) {
      console.error("Failed to persist Monte Carlo batch", error);
    }
  }

  return NextResponse.json(
    {
      batch: {
        id: batchId,
        status: "COMPLETED",
        progress: parsed.data.runs,
        createdAt: new Date().toISOString(),
        persisted,
      },
      result,
      reality: "PROJECTED",
      baseSnapshotId: season.baseSnapshotId,
    },
    { status: 201 },
  );
}
