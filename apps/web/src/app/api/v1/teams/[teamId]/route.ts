import { NextResponse } from "next/server";
import { demoFixtures, demoRatings, demoStandings, findTeam } from "@/lib/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params;
  const team = findTeam(teamId);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json({
    team,
    standing: demoStandings.find((row) => row.teamId === teamId),
    rating: demoRatings.ratings.find((row) => row.teamId === teamId),
    fixtures: demoFixtures.filter(
      (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId,
    ),
    dataMode: "DEMO",
  });
}
