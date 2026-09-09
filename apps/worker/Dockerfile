FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @leaguesim/worker build
CMD ["pnpm", "--filter", "@leaguesim/worker", "start"]
