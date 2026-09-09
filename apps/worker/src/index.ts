import { runMonteCarlo, type SeasonSimulationInput } from "@leaguesim/domain";
import { Worker } from "bullmq";
import IORedis from "ioredis";

export interface SimulationJobData extends Omit<SeasonSimulationInput, "seed"> {
  batchId: string;
  seed: number;
  runs: number;
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.info("LeagueSim worker is idle: REDIS_URL is not configured.");
} else {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const worker = new Worker<SimulationJobData>(
    "simulation",
    async (job) => {
      await job.updateProgress(1);
      const result = runMonteCarlo(job.data);
      await job.updateProgress(100);
      return result;
    },
    { connection, concurrency: 2 },
  );
  worker.on("failed", (job, error) =>
    console.error("simulation_failed", { batchId: job?.data.batchId, message: error.message }),
  );
  worker.on("completed", (job) =>
    console.info("simulation_completed", { batchId: job.data.batchId }),
  );
}
