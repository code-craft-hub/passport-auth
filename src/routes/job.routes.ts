import { Router, Request, Response } from "express";
import { queueManager } from "../queues/queue.manager";
import { QueueName } from "../types";

const router = Router();

// ============================================
// JOBS - FIFO (First In First Out)
// ============================================

// Add FIFO job (default behavior)
router.post("/job/fifo", async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    const queue = queueManager.getQueue("fifo-queue");

    const job = await queue.add("fifo-job", data);

    res.json({
      success: true,
      jobId: job.id,
      message: "FIFO job added (will be processed in order)",
      queueName: "fifo-queue",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - LIFO (Last In First Out)
// ============================================

// Add LIFO job
router.post("/job/lifo", async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    const queue = queueManager.getQueue("lifo-queue");

    const job = await queue.add("lifo-job", data, {
      lifo: true, // Process this job before older jobs
    });

    res.json({
      success: true,
      jobId: job.id,
      message: "LIFO job added (will be processed before older jobs)",
      queueName: "lifo-queue",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - CUSTOM JOB IDS
// ============================================

// Add job with custom ID
router.post("/job/custom-id", async (req: Request, res: Response) => {
  try {
    const { jobId, data } = req.body;
    const queue = queueManager.getQueue("email-queue");

    const job = await queue.add("custom-id-job", data, {
      jobId: jobId || `custom-${Date.now()}`,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: "Job added with custom ID",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - DELAYED JOBS
// ============================================

// Add delayed job
router.post("/job/delayed", async (req: Request, res: Response) => {
  try {
    const { data, delay = 10000 } = req.body; // Default 10 second delay
    const queue = queueManager.getQueue("delayed-queue");

    const job = await queue.add("delayed-job", data, {
      delay, // Delay in milliseconds
    });

    res.json({
      success: true,
      jobId: job.id,
      message: `Job will be processed after ${delay}ms delay`,
      delayedUntil: new Date(Date.now() + delay).toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - PRIORITIZED JOBS
// ============================================

// Add prioritized job
router.post("/job/priority", async (req: Request, res: Response) => {
  try {
    const { data, priority = 1 } = req.body; // Lower number = higher priority
    const queue = queueManager.getQueue("priority-queue");

    const job = await queue.add("priority-job", data, {
      priority, // 1 is highest priority, higher numbers are lower priority
    });

    res.json({
      success: true,
      jobId: job.id,
      priority,
      message: `Job added with priority ${priority} (lower number = higher priority)`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - REPEATABLE JOBS
// ============================================

// Add repeatable job with cron pattern
router.post("/job/repeatable/cron", async (req: Request, res: Response) => {
  try {
    const { data, pattern = "*/5 * * * *", jobId } = req.body; // Default: every 5 minutes
    const queue = queueManager.getQueue("scheduled-queue");

    const job = await queue.add("repeatable-job", data, {
      repeat: {
        pattern, // Cron pattern
      },
      jobId: jobId || `repeatable-cron-${Date.now()}`,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: `Repeatable job scheduled with cron pattern: ${pattern}`,
      pattern,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add repeatable job with interval
router.post("/job/repeatable/interval", async (req: Request, res: Response) => {
  try {
    const { data, every = 60000, jobId } = req.body; // Default: every 60 seconds
    const queue = queueManager.getQueue("scheduled-queue");

    const job = await queue.add("repeatable-interval-job", data, {
      repeat: {
        every, // Interval in milliseconds
      },
      jobId: jobId || `repeatable-interval-${Date.now()}`,
    });

    res.json({
      success: true,
      jobId: job.id,
      message: `Repeatable job scheduled every ${every}ms`,
      every,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Remove repeatable job
router.delete(
  "/job/repeatable/:queueName",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { jobId, repeatJobKey } = req.body;

      const queue = queueManager.getQueue(queueName as QueueName);

      if (repeatJobKey) {
        await queue.removeRepeatableByKey(repeatJobKey);
      } else if (jobId) {
        const job = await queue.getJob(jobId);
        if (job && job.opts.repeat) {
          await queue.removeRepeatable(job.name, job.opts.repeat);
        }
      }

      res.json({
        success: true,
        message: "Repeatable job removed",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get all repeatable jobs
router.get(
  "/job/repeatable/:queueName",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const queue = queueManager.getQueue(queueName as QueueName);

      const repeatableJobs = await queue.getRepeatableJobs();

      res.json({
        success: true,
        queueName,
        count: repeatableJobs.length,
        jobs: repeatableJobs,
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
// JOBS - DEDUPLICATION
// ============================================

// Add job with deduplication
router.post("/job/deduplicate", async (req: Request, res: Response) => {
  try {
    const { jobId, data } = req.body;
    const queue = queueManager.getQueue("deduplication-queue");

    // Jobs with same jobId won't be added again if already in queue
    const job = await queue.add("deduplicated-job", data, {
      jobId: jobId || `dedup-${data.uniqueKey}`,
      removeOnComplete: true,
      removeOnFail: false,
    });

    res.json({
      success: true,
      jobId: job.id,
      message:
        "Job added with deduplication (same jobId will prevent duplicates)",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - GETTERS (Retrieving Job Information)
// ============================================

// Get job by ID
router.get("/job/:queueName/:jobId", async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    const queue = queueManager.getQueue(queueName as QueueName);

    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress,
        state,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get jobs by state
router.get("/jobs/:queueName/:state", async (req: Request, res: Response) => {
  try {
    const { queueName, state } = req.params;
    const { start = 0, end = 10 } = req.query;

    const queue = queueManager.getQueue(queueName as QueueName);

    let jobs;
    switch (state) {
      case "waiting":
        jobs = await queue.getWaiting(Number(start), Number(end));
        break;
      case "active":
        jobs = await queue.getActive(Number(start), Number(end));
        break;
      case "completed":
        jobs = await queue.getCompleted(Number(start), Number(end));
        break;
      case "failed":
        jobs = await queue.getFailed(Number(start), Number(end));
        break;
      case "delayed":
        jobs = await queue.getDelayed(Number(start), Number(end));
        break;
      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid state. Use: waiting, active, completed, failed, or delayed",
        });
    }

    res.json({
      success: true,
      queueName,
      state,
      count: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get job counts by state
router.get("/jobs/:queueName/counts", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const queue = queueManager.getQueue(queueName as QueueName);

    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    res.json({
      success: true,
      queueName,
      counts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// JOBS - CANCELLING/REMOVING
// ============================================

// Remove job
router.delete(
  "/job/:queueName/:jobId/remove",
  async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await job.remove();

      res.json({
        success: true,
        message: `Job ${jobId} removed`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Retry failed job
router.post(
  "/job/:queueName/:jobId/retry",
  async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await job.retry();

      res.json({
        success: true,
        message: `Job ${jobId} will be retried`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Promote delayed job
router.post(
  "/job/:queueName/:jobId/promote",
  async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await job.promote();

      res.json({
        success: true,
        message: `Job ${jobId} promoted to waiting state`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Update job progress
router.post(
  "/job/:queueName/:jobId/progress",
  async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const { progress } = req.body;
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await job.updateProgress(progress);

      res.json({
        success: true,
        message: `Job ${jobId} progress updated to ${progress}`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Update job data
router.put(
  "/job/:queueName/:jobId/data",
  async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const { data } = req.body;
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await job.updateData(data);

      res.json({
        success: true,
        message: `Job ${jobId} data updated`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export { router as jobRoutes };
