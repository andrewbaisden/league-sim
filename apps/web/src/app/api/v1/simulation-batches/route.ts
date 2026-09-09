import { runMonteCarlo } from "@leaguesim/domain";
import { simulationBatchRequestSchema } from "@leaguesim/validation";
import { NextResponse } from "next/server";
import { DEMO_SEASON_ID, getDemoSeason } from "@/lib/demo-data";

export async function POST(request: Request) {
  const parsed = simulationBatchRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid batch request", issues: parsed.error.issues },
      { status: 400 },
    );
  if (parsed.data.seasonId !== DEMO_SEASON_ID)
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  const season = getDemoSeason();
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
  const id = `demo-${parsed.data.seed}-${parsed.data.runs}`;
  return NextResponse.json(
    {
      batch: {
        id,
        status: "COMPLETED",
        progress: parsed.data.runs,
        createdAt: new Date().toISOString(),
      },
      result,
      reality: "PROJECTED",
    },
    { status: 201 },
  );
}
