import { db } from "@leaguesim/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET ?? "leaguesim-development-secret-change-me",
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  user: { deleteUser: { enabled: true } },
  advanced: { database: { generateId: "uuid" } },
});
