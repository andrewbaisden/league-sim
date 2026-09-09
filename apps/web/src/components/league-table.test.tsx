import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LeagueTable } from "./league-table";

afterEach(cleanup);

describe("LeagueTable", () => {
  it("renders semantic standings with textual form", () => {
    render(
      <LeagueTable
        teams={[{ id: "a", name: "Alpha", shortName: "Alpha", abbreviation: "ALP" }]}
        rows={[
          {
            position: 1,
            teamId: "a",
            teamName: "Alpha",
            shortName: "Alpha",
            played: 1,
            wins: 1,
            draws: 0,
            losses: 0,
            goalsFor: 2,
            goalsAgainst: 0,
            goalDifference: 2,
            points: 3,
            form: ["W"],
            tieUnresolved: false,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("table", { name: /current premier league standings/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alpha/i })).toHaveAttribute("href", "/teams/a");
    expect(screen.getByLabelText("Form: W")).toBeInTheDocument();
  });

  it("shows an unranked table before any matches have been played", () => {
    render(
      <LeagueTable
        teams={[
          { id: "a", name: "AFC Alpha", shortName: "Alpha", abbreviation: "ALP" },
          { id: "b", name: "Bravo Town", shortName: "Bravo", abbreviation: "BRA" },
        ]}
        rows={[
          {
            position: 1,
            teamId: "b",
            teamName: "Bravo Town",
            shortName: "Bravo",
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            form: [],
            tieUnresolved: true,
          },
          {
            position: 1,
            teamId: "a",
            teamName: "AFC Alpha",
            shortName: "Alpha",
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            form: [],
            tieUnresolved: true,
          },
        ]}
      />,
    );

    const rows = within(screen.getByRole("table", { name: /current premier league standings/i }))
      .getAllByRole("row")
      .slice(1);
    expect(rows.map((row) => row.querySelector(".team-cell")?.textContent)).toEqual([
      "ALPAFC Alpha",
      "BRABravo Town",
    ]);
    expect(rows.every((row) => row.querySelector(".position")?.textContent === "—")).toBe(true);
    expect(rows.every((row) => row.className === "")).toBe(true);
  });
});
