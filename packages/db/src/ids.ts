import { createHash } from "node:crypto";

/** Stable UUID derived from a namespace + key for idempotent seeding. */
export function deterministicUuid(namespace: string, key: string): string {
  const hex = createHash("sha256").update(`${namespace}:${key}`).digest("hex");
  const versioned = `5${hex.slice(13, 16)}`;
  const variantByte = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    versioned,
    `${variantByte}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export const DEMO_PROVIDER = "demo";
export const DEMO_SEASON_KEY = "premier-league-2026-27-demo";
export const DEMO_COMPETITION_SLUG = "premier-league";
export const DEMO_SEASON_LABEL = "2026/27";
export const DEMO_SNAPSHOT_FINGERPRINT = "demo-pl-2026-27-preseason-v2";
