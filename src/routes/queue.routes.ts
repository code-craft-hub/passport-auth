import { Router, Request, Response } from "express";
import { queueManager } from "../queues";
import { workerManager } from "../workers";
import { QueueName } from "../types";

const router: Router = Router();

// ============================================
// CONNECTIONS
// ============================================

// Test Redis connection
router.get("/connection/test", async (req: Request, res: Response) => {
  try {
    const queue = queueManager.getQueue("email-queue");
    await queue.client.ping();

    res.json({
      success: true,
      message: "Redis connection is healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Redis connection failed",
      error: error.message,
    });
  }
});

// ============================================
// QUEUES - BASIC OPERATIONS
// ============================================

// Add a single job to queue (FIFO default)
router.post("/queue/:queueName/add", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { data, options } = req.body;

    const queue = queueManager.getQueue(queueName as QueueName);
    const job = await queue.add("job", data, options);

    res.json({
      success: true,
      jobId: job.id,
      queueName,
      message: "Job added successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// QUEUES - ADDING JOBS IN BULK
// ============================================

// Add multiple jobs in bulk
router.post(
  "/queue/:queueName/add-bulk",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { jobs } = req.body; // Array of {name, data, opts}

      const queue = queueManager.getQueue(queueName as QueueName);
      const addedJobs = await queue.addBulk(jobs);

      res.json({
        success: true,
        message: `${addedJobs.length} jobs added in bulk`,
        jobIds: addedJobs.map((job) => job.id),
        queueName,
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
// QUEUES - AUTO-REMOVAL OF JOBS
// ============================================

// Add job with auto-removal settings
router.post(
  "/queue/:queueName/add-with-removal",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { data, removeOnComplete, removeOnFail } = req.body;

      const queue = queueManager.getQueue(queueName as QueueName);
      const job = await queue.add("job", data, {
        removeOnComplete: removeOnComplete || true,
        removeOnFail: removeOnFail || false,
      });

      res.json({
        success: true,
        jobId: job.id,
        message: "Job added with auto-removal settings",
        settings: {
          removeOnComplete,
          removeOnFail,
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
// QUEUES - GLOBAL RATE LIMIT
// ============================================

// Create rate-limited queue and add job
router.post("/queue/rate-limited/add", async (req: Request, res: Response) => {
  try {
    const { data, max = 5, duration = 10000 } = req.body;

    // Create queue with rate limit: max jobs per duration
    const queue = queueManager.getQueueWithRateLimit(
      "rate-limited-queue",
      max,
      duration
    );

    const job = await queue.add("rate-limited-job", data);

    res.json({
      success: true,
      jobId: job.id,
      message: "Job added to rate-limited queue",
      rateLimit: { max, duration },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// QUEUES - METADATA
// ============================================

// Set queue metadata
router.post(
  "/queue/:queueName/metadata",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { metadata } = req.body;

      await queueManager.setQueueMetadata(queueName as QueueName, metadata);

      res.json({
        success: true,
        message: "Metadata set successfully",
        queueName,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get queue metadata
router.get(
  "/queue/:queueName/metadata",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const metadata = await queueManager.getQueueMetadata(
        queueName as QueueName
      );

      res.json({
        success: true,
        queueName,
        metadata,
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
// QUEUES - REMOVING JOBS
// ============================================

// Remove a specific job
router.delete(
  "/queue/:queueName/job/:jobId",
  async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;
      const queue = queueManager.getQueue(queueName as QueueName);

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        res.json({
          success: true,
          message: `Job ${jobId} removed`,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Clean queue (remove old completed/failed jobs)
router.post("/queue/:queueName/clean", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { grace = 3600000, limit = 100, type = "completed" } = req.body;

    const removedJobs = await queueManager.cleanQueue(
      queueName as QueueName,
      grace,
      limit,
      type
    );

    res.json({
      success: true,
      message: `Cleaned ${removedJobs.length} ${type} jobs`,
      removedCount: removedJobs.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Drain queue (remove all waiting jobs)
router.post("/queue/:queueName/drain", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { delayed = false } = req.body;

    await queueManager.drainQueue(queueName as QueueName, delayed);

    res.json({
      success: true,
      message: "Queue drained successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obliterate queue (remove ALL jobs)
router.post(
  "/queue/:queueName/obliterate",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { force = true } = req.body;

      await queueManager.obliterateQueue(queueName as QueueName, { force });

      res.json({
        success: true,
        message: "Queue obliterated successfully",
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
// QUEUES - PAUSING
// ============================================

// Pause queue
router.post("/queue/:queueName/pause", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    await queueManager.pauseQueue(queueName as QueueName);

    res.json({
      success: true,
      message: `Queue ${queueName} paused`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Resume queue
router.post("/queue/:queueName/resume", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    await queueManager.resumeQueue(queueName as QueueName);

    res.json({
      success: true,
      message: `Queue ${queueName} resumed`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get queue stats
router.get("/queue/:queueName/stats", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const stats = await queueManager.getQueueStats(queueName as QueueName);

    res.json({
      success: true,
      queueName,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// WORKERS - CONCURRENCY
// ============================================

// Create worker with custom concurrency
router.post(
  "/worker/:queueName/create",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const { concurrency = 5 } = req.body;

      // Worker is already created in initialization, but this shows how to create with custom concurrency
      res.json({
        success: true,
        message: `Worker for ${queueName} has concurrency of ${concurrency}`,
        note: "Workers are initialized on startup with default concurrency",
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
// WORKERS - PAUSING
// ============================================

// Pause worker
router.post("/worker/:queueName/pause", async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    await workerManager.pauseWorker(queueName as QueueName);

    res.json({
      success: true,
      message: `Worker for ${queueName} paused`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Resume worker
router.post(
  "/worker/:queueName/resume",
  async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      await workerManager.resumeWorker(queueName as QueueName);

      res.json({
        success: true,
        message: `Worker for ${queueName} resumed`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export { router as queueRoutes };
