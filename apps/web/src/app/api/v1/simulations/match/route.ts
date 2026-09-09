import { calculateMatchProbability, simulateMatch } from "@leaguesim/domain";
import { matchSimulationRequestSchema } from "@leaguesim/validation";
import { NextResponse } from "next/server";
import { demoRatings, findFixture } from "@/lib/demo-data";

export async function POST(request: Request) {
  const parsed = matchSimulationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid simulation request", issues: parsed.error.issues },
      { status: 400 },
    );
  const fixture = findFixture(parsed.data.fixtureId);
  if (fixture?.status !== "SCHEDULED")
    return NextResponse.json({ error: "Upcoming fixture not found" }, { status: 404 });
  const probability = calculateMatchProbability(fixture, demoRatings, parsed.data.adjustments);
  const sampled = simulateMatch(probability, parsed.data.seed, parsed.data.forcedOutcome);
  return NextResponse.json({
    fixtureId: fixture.id,
    probability,
    sampled,
    seed: parsed.data.seed,
    reality: "SIMULATION",
  });
}
