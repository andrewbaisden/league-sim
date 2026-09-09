import { NextResponse } from "next/server";
import { DEMO_SEASON_ID, getDemoSeason } from "@/lib/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await context.params;
  if (seasonId !== DEMO_SEASON_ID)
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  const season = getDemoSeason();
  return NextResponse.json({
    season: {
      id: season.id,
      competition: season.competition,
      label: season.label,
      currentMatchweek: season.currentMatchweek,
    },
    dataMode: season.dataMode,
    lastUpdatedAt: season.lastUpdatedAt,
    teamCount: season.teams.length,
  });
}
