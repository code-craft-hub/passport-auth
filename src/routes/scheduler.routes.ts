import { Router, Request, Response } from "express";
import { QueueScheduler } from "bullmq";
import { redisConfig } from "../config/redis.config";
import { QueueName } from "../types";

const router = Router();

// Store schedulers
const schedulers = new Map<string, QueueScheduler>();

// ============================================
// JOB SCHEDULERS - CREATE & MANAGE
// ============================================

// Create job scheduler for a queue
router.post(
  "/scheduler/:queueName/create",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { maxStalledCount = 3, stalledInterval = 30000 } = req.body;

      // Check if scheduler already exists
      if (schedulers.has(queueName)) {
        return res.json({
          success: true,
          message: `Scheduler for ${queueName} already exists`,
        });
      }

      // Create new scheduler
      const scheduler = new QueueScheduler(queueName, {
        connection: redisConfig,
        maxStalledCount, // Max times a job can be stalled before failed
        stalledInterval, // Interval to check for stalled jobs
      });

      // Setup event listeners
      scheduler.on("stalled", (jobId, prev) => {
        console.log(
          `🔄 [Scheduler-${queueName}] Job ${jobId} stalled (previous state: ${prev})`
        );
      });

      scheduler.on("error", (error) => {
        console.error(`❌ [Scheduler-${queueName}] Error:`, error.message);
      });

      schedulers.set(queueName, scheduler);

      res.json({
        success: true,
        message: `Scheduler created for queue: ${queueName}`,
        config: {
          maxStalledCount,
          stalledInterval,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Close scheduler
router.delete("/scheduler/:queueName", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const scheduler = schedulers.get(queueName);

    if (!scheduler) {
      return res.status(404).json({
        success: false,
        message: "Scheduler not found",
      });
    }

    await scheduler.close();
    schedulers.delete(queueName);

    res.json({
      success: true,
      message: `Scheduler for ${queueName} closed`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all active schedulers
router.get("/schedulers", async (req: Request, res: Response) => {
  try {
    const activeSchedulers = Array.from(schedulers.keys());

    res.json({
      success: true,
      count: activeSchedulers.length,
      schedulers: activeSchedulers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// REPEAT STRATEGIES
// ============================================

/**
 * Repeat strategies define how repeatable jobs are scheduled
 * BullMQ supports:
 * 1. Cron patterns (e.g., '0 0 * * *' for daily at midnight)
 * 2. Every interval (e.g., 60000 for every minute)
 * 3. Immediately (repeat immediately after completion)
 */

// Add job with cron pattern strategy
router.post("/scheduler/repeat/cron", async (req: Request, res: Response) => {
  try {
    const { queueName, data, pattern, limit, endDate, startDate } = req.body;

    const { queueManager } = await import("../queues/queue.manager");
    const queue = queueManager.getQueue(queueName as QueueName);

    const job = await queue.add("cron-scheduled-job", data, {
      repeat: {
        pattern, // Cron pattern: '*/5 * * * *' (every 5 minutes)
        limit, // Optional: Max number of times to repeat
        endDate, // Optional: End date for repetition
        startDate, // Optional: Start date for repetition
      },
    });

    res.json({
      success: true,
      jobId: job.id,
      message: "Job scheduled with cron pattern",
      repeatOptions: {
        pattern,
        limit,
        endDate,
        startDate,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add job with interval strategy
router.post(
  "/scheduler/repeat/interval",
  async (req: Request, res: Response) => {
    try {
      const { queueName, data, every, limit, endDate } = req.body;

      const { queueManager } = await import("../queues/queue.manager");
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.add("interval-scheduled-job", data, {
        repeat: {
          every, // Interval in milliseconds
          limit, // Optional: Max number of times to repeat
          endDate, // Optional: End date for repetition
        },
      });

      res.json({
        success: true,
        jobId: job.id,
        message: `Job scheduled to repeat every ${every}ms`,
        repeatOptions: {
          every,
          limit,
          endDate,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Add job with immediately strategy (repeat right after completion)
router.post(
  "/scheduler/repeat/immediately",
  async (req: Request, res: Response) => {
    try {
      const { queueName, data, limit } = req.body;

      const { queueManager } = await import("../queues/queue.manager");
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.add("immediate-repeat-job", data, {
        repeat: {
          immediately: true, // Start immediately and repeat after each completion
          limit, // Optional: Max number of times to repeat
        },
      });

      res.json({
        success: true,
        jobId: job.id,
        message: "Job will repeat immediately after each completion",
        repeatOptions: {
          immediately: true,
          limit,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================
// REPEAT OPTIONS MANAGEMENT
// ============================================

// Get repeatable jobs with their options
router.get(
  "/scheduler/:queueName/repeatable-jobs",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { queueManager } = await import("../queues/queue.manager");
      const queue = queueManager.getQueue(queueName as QueueName);

      const repeatableJobs = await queue.getRepeatableJobs();

      res.json({
        success: true,
        queueName,
        count: repeatableJobs.length,
        jobs: repeatableJobs.map((job) => ({
          key: job.key,
          name: job.name,
          id: job.id,
          pattern: job.pattern,
          every: job.every,
          next: job.next,
          tz: job.tz,
          endDate: job.endDate,
        })),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Remove repeatable job by key
router.delete(
  "/scheduler/:queueName/repeatable/:repeatKey",
  async (req: Request, res: Response) => {
    try {
      const { queueName, repeatKey } = req.params;
      const { queueManager } = await import("../queues/queue.manager");
      const queue = queueManager.getQueue(queueName as QueueName);

      await queue.removeRepeatableByKey(repeatKey);

      res.json({
        success: true,
        message: `Repeatable job with key ${repeatKey} removed`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Remove all repeatable jobs
router.delete(
  "/scheduler/:queueName/repeatable",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { queueManager } = await import("../queues/queue.manager");
      const queue = queueManager.getQueue(queueName as QueueName);

      const repeatableJobs = await queue.getRepeatableJobs();

      for (const job of repeatableJobs) {
        await queue.removeRepeatableByKey(job.key);
      }

      res.json({
        success: true,
        message: `All ${repeatableJobs.length} repeatable jobs removed`,
        count: repeatableJobs.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============================================
// CRON PATTERN EXAMPLES & HELPERS
// ============================================

// Get cron pattern examples
router.get("/scheduler/cron-examples", async (req: Request, res: Response) => {
  res.json({
    success: true,
    examples: {
      "Every minute": "* * * * *",
      "Every 5 minutes": "*/5 * * * *",
      "Every hour": "0 * * * *",
      "Every day at midnight": "0 0 * * *",
      "Every day at 9 AM": "0 9 * * *",
      "Every Monday at 9 AM": "0 9 * * 1",
      "First day of every month": "0 0 1 * *",
      "Every weekday at 9 AM": "0 9 * * 1-5",
      "Every 15 minutes during business hours": "*/15 9-17 * * 1-5",
    },
    format: {
      field1: "Minute (0-59)",
      field2: "Hour (0-23)",
      field3: "Day of Month (1-31)",
      field4: "Month (1-12)",
      field5: "Day of Week (0-7, 0 and 7 are Sunday)",
    },
  });
});

// Close all schedulers
export async function closeAllSchedulers() {
  const closePromises = Array.from(schedulers.values()).map((scheduler) =>
    scheduler.close()
  );
  await Promise.all(closePromises);
  schedulers.clear();
  console.log("🔒 All schedulers closed");
}

export { router as schedulerRoutes };
