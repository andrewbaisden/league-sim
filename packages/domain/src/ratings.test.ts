import { describe, expect, it } from "vitest";
import { calculateRatings, normalizeTeamStars, starStrengthMultipliers } from "./ratings";
import type { Fixture, Team } from "./types";

const fixtures: Fixture[] = [];

describe("star strength priors", () => {
  it("normalizes stars onto a half-star FC-style scale", () => {
    expect(normalizeTeamStars(4.2)).toBe(4);
    expect(normalizeTeamStars(4.4)).toBe(4.5);
    expect(normalizeTeamStars(0)).toBe(0.5);
    expect(normalizeTeamStars(9)).toBe(5);
  });

  it("maps higher stars to stronger attack and defence multipliers", () => {
    const elite = starStrengthMultipliers(5);
    const weak = starStrengthMultipliers(2.5);
    expect(elite.attackMultiplier).toBeGreaterThan(1);
    expect(elite.defenceMultiplier).toBeGreaterThan(1);
    expect(weak.attackMultiplier).toBeLessThan(1);
    expect(weak.defenceMultiplier).toBeLessThan(1);
    expect(elite.attackMultiplier).toBeGreaterThan(weak.attackMultiplier);
  });

  it("applies star priors when teams declare stars and bumps the model version", () => {
    const teams: Team[] = [
      { id: "a", name: "Alpha", shortName: "Alpha", abbreviation: "ALP", stars: 5 },
      { id: "b", name: "Bravo", shortName: "Bravo", abbreviation: "BRA", stars: 2.5 },
    ];
    const ratings = calculateRatings(teams, fixtures);
    expect(ratings.modelVersion).toBe("poisson-stars-v1");
    const alpha = ratings.ratings.find((row) => row.teamId === "a");
    const bravo = ratings.ratings.find((row) => row.teamId === "b");
    expect(alpha?.stars).toBe(5);
    expect(bravo?.stars).toBe(2.5);
    expect(alpha?.homeAttack ?? 0).toBeGreaterThan(bravo?.homeAttack ?? 0);
    expect(alpha?.homeDefence ?? 0).toBeGreaterThan(bravo?.homeDefence ?? 0);
  });

  it("keeps poisson-v1 when no team declares stars", () => {
    const teams: Team[] = [
      { id: "a", name: "Alpha", shortName: "Alpha", abbreviation: "ALP" },
      { id: "b", name: "Bravo", shortName: "Bravo", abbreviation: "BRA" },
    ];
    const ratings = calculateRatings(teams, fixtures);
    expect(ratings.modelVersion).toBe("poisson-v1");
    expect(ratings.ratings.every((row) => row.stars === undefined)).toBe(true);
  });
});
