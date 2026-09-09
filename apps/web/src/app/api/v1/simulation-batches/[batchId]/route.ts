import { db, loadSeasonBatchView } from "@leaguesim/db";
import { runMonteCarlo } from "@leaguesim/domain";
import { NextResponse } from "next/server";
import { getDemoSeason } from "@/lib/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;

  const seasonView = await loadSeasonBatchView(batchId).catch(() => null);
  if (seasonView) {
    return NextResponse.json({
      batch: {
        id: seasonView.batchId,
        status: "COMPLETED",
        kind: "SEASON",
        scenarioId: seasonView.scenarioId,
        seed: seasonView.seed,
        modelVersion: seasonView.modelVersion,
      },
      result: {
        seed: seasonView.seed,
        modelVersion: seasonView.modelVersion,
        fixtures: seasonView.fixtures
          .filter((fixture) => fixture.status === "FINISHED" && fixture.score)
          .map((fixture) => ({
            fixtureId: fixture.id,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            homeGoals: fixture.score?.home ?? 0,
            awayGoals: fixture.score?.away ?? 0,
            source: "SAMPLED" as const,
          })),
        standings: seasonView.standings,
      },
      reality: "SIMULATION",
      teams: seasonView.teams,
      fixtures: seasonView.fixtures,
      standings: seasonView.standings,
    });
  }

  const stored = await db.simulationBatch
    .findUnique({
      where: { id: batchId },
      include: {
        projections: { include: { teamSeason: { include: { team: true } } } },
        positionProbabilities: true,
      },
    })
    .catch(() => null);

  if (stored?.kind === "MONTE_CARLO") {
    const byTeam = new Map(
      stored.projections.map((projection) => [
        projection.teamSeason.team.slug,
        {
          teamId: projection.teamSeason.team.slug,
          expectedPoints: Number(projection.expectedPoints),
          expectedPosition: Number(projection.expectedPosition),
          titleProbability: Number(projection.titleProbability),
          topFourProbability: Number(projection.topFourProbability),
          topSixProbability: Number(projection.topSixProbability),
          relegationProbability: Number(projection.relegationProbability),
          positionProbabilities: [] as number[],
        },
      ]),
    );
    for (const row of stored.positionProbabilities) {
      const projection = stored.projections.find((item) => item.teamSeasonId === row.teamSeasonId);
      if (!projection) continue;
      const entry = byTeam.get(projection.teamSeason.team.slug);
      if (!entry) continue;
      entry.positionProbabilities[row.position - 1] = Number(row.probability);
    }
    return NextResponse.json({
      batch: {
        id: stored.id,
        status: stored.status,
        kind: stored.kind,
        progress: stored.progress,
      },
      result: {
        seed: Number(stored.seed),
        runs: stored.runCount,
        modelVersion: stored.modelVersion,
        durationMs: stored.durationMs ?? 0,
        fixturesSimulated: stored.fixturesSimulated ?? 0,
        projections: [...byTeam.values()],
      },
      reality: "PROJECTED",
    });
  }

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
  return NextResponse.json({
    batch: { id: batchId, status: "COMPLETED", progress: runs },
    result,
  });
}
