import { runMonteCarlo } from "@leaguesim/domain";
import { NextResponse } from "next/server";
import { getDemoSeason } from "@/lib/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;
  const match = /^demo-(\d+)-(100|1000|10000)$/.exec(batchId);
  if (!match) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  const seed = Number(match[1]);
  const runs = Number(match[2]);
  const season = getDemoSeason();
  const result = runMonteCarlo({
    teams: season.teams,
    fixtures: season.fixtures,
    rules: season.rules,
    ratings: season.ratings,
    seed,
    runs,
  });
  return NextResponse.json({ batch: { id: batchId, status: "COMPLETED", progress: runs }, result });
}
