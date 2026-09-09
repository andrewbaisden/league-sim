import type { Fixture, SeasonSimulationResult, Team } from "@leaguesim/domain";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSimulationStore } from "@/stores/simulation-store";
import { NextFixturesCard } from "./fixture-list";

const teams: Team[] = [
  { id: "villa", name: "Aston Villa", shortName: "Villa", abbreviation: "AVL" },
  { id: "palace", name: "Crystal Palace", shortName: "Palace", abbreviation: "CRY" },
  { id: "spurs", name: "Tottenham Hotspur", shortName: "Spurs", abbreviation: "TOT" },
  { id: "united", name: "Manchester United", shortName: "Man Utd", abbreviation: "MUN" },
];

const fixtures: Fixture[] = [
  {
    id: "mw1-1",
    homeTeamId: "villa",
    awayTeamId: "palace",
    kickoff: "2026-08-22T11:30:00.000Z",
    matchweek: 1,
    status: "SCHEDULED",
  },
  {
    id: "mw1-2",
    homeTeamId: "spurs",
    awayTeamId: "united",
    kickoff: "2026-08-22T14:00:00.000Z",
    matchweek: 1,
    status: "SCHEDULED",
  },
  {
    id: "mw2-1",
    homeTeamId: "palace",
    awayTeamId: "spurs",
    kickoff: "2026-08-29T11:30:00.000Z",
    matchweek: 2,
    status: "SCHEDULED",
  },
];

afterEach(() => {
  cleanup();
  useSimulationStore.getState().reset();
});

describe("NextFixturesCard", () => {
  it("shows every fixture in the next matchweek with canonical team names", () => {
    const { container } = render(<NextFixturesCard fixtures={fixtures} teams={teams} />);

    expect(screen.getByText("Matchweek 1")).toBeInTheDocument();
    expect(container.querySelectorAll(".fixture")).toHaveLength(2);
    expect(screen.getByText("Aston Villa")).toBeInTheDocument();
    expect(screen.getByText("Crystal Palace")).toBeInTheDocument();
    expect(screen.getByText("Tottenham Hotspur")).toBeInTheDocument();
    expect(screen.getByText("Manchester United")).toBeInTheDocument();
  });

  it("advances after the current matchweek is simulated", () => {
    render(<NextFixturesCard fixtures={fixtures} teams={teams} />);
    const result: SeasonSimulationResult = {
      seed: 42,
      modelVersion: "poisson-v1",
      standings: [],
      fixtures: fixtures.slice(0, 2).map((fixture) => ({
        fixtureId: fixture.id,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeGoals: 1,
        awayGoals: 0,
        source: "SAMPLED" as const,
      })),
    };

    act(() => useSimulationStore.getState().setLastSeasonResult(result));

    expect(screen.getByText("Matchweek 2")).toBeInTheDocument();
    expect(screen.queryByText("Aston Villa")).not.toBeInTheDocument();
    expect(screen.getByText("Crystal Palace")).toBeInTheDocument();
    expect(screen.getByText("Tottenham Hotspur")).toBeInTheDocument();
  });
});
