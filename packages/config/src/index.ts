import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  FOOTBALL_DATA_API_TOKEN: z.string().min(1).optional(),
  FOOTBALL_DATA_MODE: z.enum(["demo", "provider"]).default("demo"),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(environment: NodeJS.ProcessEnv): ServerEnvironment {
  return serverEnvironmentSchema.parse(environment);
}
