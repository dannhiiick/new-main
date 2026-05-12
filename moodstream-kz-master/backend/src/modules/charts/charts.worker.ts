import { Worker, Queue, type Job } from "bullmq";
import { redis } from "../../utils/redis.js";
import { prisma } from "../../db/client.js";
import { calculateChartScore, upsertChartScore } from "./charts.service.js";

// ─── Queue & job constants ─────────────────────────────────────────────────────

export const CHARTS_QUEUE_NAME = "charts";
export const RECALCULATE_JOB_NAME = "recalculate-charts";

/** Recalculate chart scores every hour */
const RECALCULATE_EVERY_MS = 60 * 60 * 1000;

/** Score window in days */
const WINDOW_DAYS = 7;

// ─── Queue singleton ──────────────────────────────────────────────────────────

let chartsQueue: Queue | null = null;

export function getChartsQueue(): Queue {
  if (chartsQueue == null) {
    chartsQueue = new Queue(CHARTS_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 5 },
        removeOnFail: { count: 20 },
      },
    });
  }
  return chartsQueue;
}

// ─── Worker processor ─────────────────────────────────────────────────────────

async function processRecalculate(_job: Job): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Find all tracks that have at least one play event in the last 7 days
  const activeTrackIds = await prisma.playEvent
    .findMany({
      where: { startedAt: { gte: windowStart } },
      select: { trackId: true },
      distinct: ["trackId"],
    })
    .then((rows) => rows.map((r) => r.trackId));

  if (activeTrackIds.length === 0) return;

  // Process in batches of 50 to avoid overwhelming DB
  const BATCH_SIZE = 50;
  for (let i = 0; i < activeTrackIds.length; i += BATCH_SIZE) {
    const batch = activeTrackIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (trackId) => {
        const result = await calculateChartScore(trackId, WINDOW_DAYS);
        await upsertChartScore(result, WINDOW_DAYS);
      }),
    );
  }

  console.log(
    `[charts-worker] Recalculated scores for ${String(activeTrackIds.length)} tracks`,
  );
}

// ─── Worker bootstrap ─────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function startChartsWorker(): Worker {
  if (worker != null) return worker;

  worker = new Worker(CHARTS_QUEUE_NAME, processRecalculate, {
    connection: redis,
    concurrency: 1,
  });

  worker.on("completed", (job: Job) => {
    console.log(`[charts-worker] Job ${job.id ?? "?"} completed`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`[charts-worker] Job ${job?.id ?? "?"} failed:`, err.message);
  });

  return worker;
}

/**
 * Register the repeatable recalculate-charts job.
 * Call once at application startup after registering the worker.
 */
export async function scheduleChartsRecalculation(): Promise<void> {
  const queue = getChartsQueue();

  // Remove any existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === RECALCULATE_JOB_NAME) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  await queue.add(
    RECALCULATE_JOB_NAME,
    {},
    {
      repeat: { every: RECALCULATE_EVERY_MS },
      jobId: RECALCULATE_JOB_NAME,
    },
  );

  console.log("[charts-worker] Repeatable job scheduled: every 1 hour");
}

/**
 * Gracefully stop the worker — waits for the current job to finish
 * before resolving. Call on SIGTERM/SIGINT.
 */
export async function stopChartsWorker(): Promise<void> {
  if (worker != null) {
    await worker.close();
    console.log("[charts-worker] Worker stopped");
  }
  if (chartsQueue != null) {
    await chartsQueue.close();
  }
}
