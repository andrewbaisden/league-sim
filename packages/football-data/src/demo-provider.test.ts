import { describe, expect, it } from "vitest";
import { DemoFootballDataProvider } from "./demo-provider";

const season = { competitionExternalId: "demo-pl", startYear: 2026 };

describe("demo provider", () => {
  it("returns a deterministic credential-free data set", async () => {
    const provider = new DemoFootballDataProvider();
    expect(await provider.getTeams(season)).toEqual(await provider.getTeams(season));
    expect(
      (await provider.getFixtures(season)).some((fixture) => fixture.status === "FINISHED"),
    ).toBe(true);
    expect(provider.capabilities().liveScores).toBe(false);
  });

  it("applies the fixture update cursor without mutating source data", async () => {
    const provider = new DemoFootballDataProvider();
    const recent = await provider.getFixtures(season, new Date("2026-08-20T00:00:00.000Z"));
    expect(recent).toHaveLength(2);
    const first = recent[0];
    if (!first) throw new Error("Expected a fixture after the cursor");
    first.status = "CANCELLED";
    expect((await provider.getFixtures(season))[2]?.status).toBe("SCHEDULED");
  });
});
