import { NextResponse } from "next/server";
import { DEMO_SEASON_ID, getDemoSeason } from "@/lib/demo-data";

export async function GET(request: Request, context: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await context.params;
  const at = new URL(request.url).searchParams.get("at") ?? "latest";
  if (seasonId !== DEMO_SEASON_ID || at !== "latest")
    return NextResponse.json({ error: "Standing snapshot not found" }, { status: 404 });
  const season = getDemoSeason();
  return NextResponse.json({
    seasonId,
    at,
    rows: season.standings,
    dataMode: season.dataMode,
    lastUpdatedAt: season.lastUpdatedAt,
  });
}
