import {
  databaseAvailable,
  findLatestBaseSnapshot,
  persistSeasonSimulation,
  resolveSeasonRecord,
} from "@leaguesim/db";
import { simulateSeason } from "@leaguesim/domain";
import { seasonSimulationRequestSchema } from "@leaguesim/validation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DEMO_SEASON_ID, getActiveSeason } from "@/lib/demo-data";

export async function POST(request: Request) {
  const parsed = seasonSimulationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid simulation request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.seasonId !== DEMO_SEASON_ID) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const season = await getActiveSeason();
  const throughMatchweek = parsed.data.throughMatchweek;
  const fixtures =
    throughMatchweek === undefined
      ? season.fixtures
      : season.fixtures.map((fixture) =>
          fixture.status === "SCHEDULED" && fixture.matchweek > throughMatchweek
            ? { ...fixture, status: "CANCELLED" as const }
            : fixture,
        );

  const result = simulateSeason({
    teams: season.teams,
    fixtures,
    rules: season.rules,
    ratings: season.ratings,
    seed: parsed.data.seed,
    overrides: parsed.data.overrides,
    adjustments: parsed.data.adjustments,
  });

  let batchId: string | undefined;
  let persisted = false;
  if (parsed.data.persist && (await databaseAvailable()) && season.baseSnapshotId) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      const seasonRecord =
        season.seasonRecordId != null
          ? { id: season.seasonRecordId }
          : await resolveSeasonRecord(parsed.data.seasonId);
      const baseSnapshot =
        (await findLatestBaseSnapshot(seasonRecord?.id)) ??
        (season.baseSnapshotId ? { id: season.baseSnapshotId } : null);
      if (baseSnapshot) {
        const batch = await persistSeasonSimulation({
          baseSnapshotId: baseSnapshot.id,
          ownerId: session?.user.id ?? null,
          scenarioId: parsed.data.scenarioId ?? null,
          seed: parsed.data.seed,
          result,
          overrides: parsed.data.overrides,
          adjustments: parsed.data.adjustments,
          throughMatchweek: parsed.data.throughMatchweek ?? null,
        });
        batchId = batch.id;
        persisted = true;
      }
    } catch (error) {
      console.error("Failed to persist season simulation", error);
    }
  }

  return NextResponse.json({
    result,
    batchId,
    persisted,
    reality: "SIMULATION",
    baseState: season.dataMode,
    baseSnapshotId: season.baseSnapshotId,
  });
}
