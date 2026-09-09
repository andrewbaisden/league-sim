import { simulateSeason } from "@leaguesim/domain";
import { seasonSimulationRequestSchema } from "@leaguesim/validation";
import { NextResponse } from "next/server";
import { DEMO_SEASON_ID, getDemoSeason } from "@/lib/demo-data";

export async function POST(request: Request) {
  const parsed = seasonSimulationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid simulation request", issues: parsed.error.issues },
      { status: 400 },
    );
  if (parsed.data.seasonId !== DEMO_SEASON_ID)
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  const season = getDemoSeason();
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
  return NextResponse.json({ result, reality: "SIMULATION", baseState: "DEMO" });
}
