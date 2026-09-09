import { db } from "@leaguesim/db";
import { NextResponse } from "next/server";

export async function GET() {
  const mode = process.env.FOOTBALL_DATA_MODE ?? "demo";
  const productionErrors = [
    process.env.NODE_ENV === "production" &&
    process.env.DATABASE_URL &&
    !process.env.BETTER_AUTH_SECRET
      ? "BETTER_AUTH_SECRET is missing"
      : undefined,
    mode === "provider" && !process.env.FOOTBALL_DATA_API_TOKEN
      ? "FOOTBALL_DATA_API_TOKEN is missing"
      : undefined,
  ].filter((error): error is string => Boolean(error));

  if (productionErrors.length > 0) {
    return NextResponse.json(
      { status: "not_ready", checks: { configuration: productionErrors } },
      { status: 503 },
    );
  }

  if (process.env.DATABASE_URL) {
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      return NextResponse.json(
        { status: "not_ready", checks: { database: "unreachable" } },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    status: "ready",
    mode,
    checks: { database: process.env.DATABASE_URL ? "connected" : "disabled_in_demo" },
  });
}
