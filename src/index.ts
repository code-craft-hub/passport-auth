import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testRedisConnection } from "./config";
import { queueManager } from "./queues";
import { workerManager } from "./workers";
import {
  closeAllSchedulers,
  jobRoutes,
  queueRoutes,
  schedulerRoutes,
} from "./routes";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "BullMQ Enterprise Tutorial API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "GET /",
      connection: "GET /api/connection/test",
      queues: "GET /api/docs/queues",
      jobs: "GET /api/docs/jobs",
      workers: "GET /api/docs/workers",
      schedulers: "GET /api/docs/schedulers",
    },
  });
});

// API Documentation
app.get("/api/docs/queues", (req: Request, res: Response) => {
  res.json({
    section: "Queue Operations",
    endpoints: {
      "Test Connection": "GET /api/connection/test",
      "Add Job": "POST /api/queue/:queueName/add",
      "Add Bulk Jobs": "POST /api/queue/:queueName/add-bulk",
      "Add Job with Auto-removal":
        "POST /api/queue/:queueName/add-with-removal",
      "Add Rate-limited Job": "POST /api/queue/rate-limited/add",
      "Set Queue Metadata": "POST /api/queue/:queueName/metadata",
      "Get Queue Metadata": "GET /api/queue/:queueName/metadata",
      "Remove Job": "DELETE /api/queue/:queueName/job/:jobId",
      "Clean Queue": "POST /api/queue/:queueName/clean",
      "Drain Queue": "POST /api/queue/:queueName/drain",
      "Obliterate Queue": "POST /api/queue/:queueName/obliterate",
      "Pause Queue": "POST /api/queue/:queueName/pause",
      "Resume Queue": "POST /api/queue/:queueName/resume",
      "Get Queue Stats": "GET /api/queue/:queueName/stats",
    },
  });
});

app.get("/api/docs/jobs", (req: Request, res: Response) => {
  res.json({
    section: "Job Operations",
    endpoints: {
      "Add FIFO Job": "POST /api/job/fifo",
      "Add LIFO Job": "POST /api/job/lifo",
      "Add Job with Custom ID": "POST /api/job/custom-id",
      "Add Delayed Job": "POST /api/job/delayed",
      "Add Priority Job": "POST /api/job/priority",
      "Add Repeatable Job (Cron)": "POST /api/job/repeatable/cron",
      "Add Repeatable Job (Interval)": "POST /api/job/repeatable/interval",
      "Remove Repeatable Job": "DELETE /api/job/repeatable/:queueName",
      "Get Repeatable Jobs": "GET /api/job/repeatable/:queueName",
      "Add Deduplicated Job": "POST /api/job/deduplicate",
      "Get Job by ID": "GET /api/job/:queueName/:jobId",
      "Get Jobs by State": "GET /api/jobs/:queueName/:state",
      "Get Job Counts": "GET /api/jobs/:queueName/counts",
      "Remove Job": "DELETE /api/job/:queueName/:jobId/remove",
      "Retry Job": "POST /api/job/:queueName/:jobId/retry",
      "Promote Delayed Job": "POST /api/job/:queueName/:jobId/promote",
      "Update Job Progress": "POST /api/job/:queueName/:jobId/progress",
      "Update Job Data": "PUT /api/job/:queueName/:jobId/data",
    },
  });
});

app.get("/api/docs/workers", (req: Request, res: Response) => {
  res.json({
    section: "Worker Operations",
    endpoints: {
      "Create Worker": "POST /api/worker/:queueName/create",
      "Pause Worker": "POST /api/worker/:queueName/pause",
      "Resume Worker": "POST /api/worker/:queueName/resume",
    },
    features: {
      Concurrency: "Workers process multiple jobs concurrently (default: 5)",
      "Graceful Shutdown": "Workers finish current jobs before closing",
      "Stalled Job Detection": "Automatically detect and retry stalled jobs",
      "Sandboxed Processors": "Run CPU-intensive tasks in separate processes",
    },
  });
});

app.get("/api/docs/schedulers", (req: Request, res: Response) => {
  res.json({
    section: "Job Scheduler Operations",
    endpoints: {
      "Create Scheduler": "POST /api/scheduler/:queueName/create",
      "Close Scheduler": "DELETE /api/scheduler/:queueName",
      "Get All Schedulers": "GET /api/schedulers",
      "Add Cron Job": "POST /api/scheduler/repeat/cron",
      "Add Interval Job": "POST /api/scheduler/repeat/interval",
      "Add Immediate Repeat Job": "POST /api/scheduler/repeat/immediately",
      "Get Repeatable Jobs": "GET /api/scheduler/:queueName/repeatable-jobs",
      "Remove Repeatable Job":
        "DELETE /api/scheduler/:queueName/repeatable/:repeatKey",
      "Remove All Repeatable Jobs":
        "DELETE /api/scheduler/:queueName/repeatable",
      "Get Cron Examples": "GET /api/scheduler/cron-examples",
    },
  });
});

// Mount routes
app.use("/api", queueRoutes);
app.use("/api", jobRoutes);
app.use("/api", schedulerRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// ============================================
// INITIALIZATION & GRACEFUL SHUTDOWN
// ============================================

async function initializeApplication() {
  try {
    console.log("\n🚀 Starting BullMQ Enterprise Tutorial Application...\n");

    // Test Redis connection
    console.log("📡 Testing Redis connection...");
    const redisConnected = await testRedisConnection();

    if (!redisConnected) {
      throw new Error(
        "Redis connection failed. Please check your Redis server."
      );
    }

    // Initialize workers
    console.log("\n👷 Initializing workers...");
    workerManager.initializeWorkers();

    // Start all workers
    console.log("\n▶️  Starting all workers...");
    await workerManager.startAllWorkers();

    console.log("\n✅ Application initialized successfully!\n");
  } catch (error: any) {
    console.error("\n❌ Failed to initialize application:", error.message);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log("\n\n🛑 Shutting down gracefully...\n");

  try {
    // Close all workers
    await workerManager.closeAllWorkers();

    // Close all schedulers
    await closeAllSchedulers();

    // Close all queues
    await queueManager.closeAll();

    console.log("✅ Shutdown complete\n");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error during shutdown:", error.message);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`\n🌐 Server running on http://localhost:${PORT}`);
  console.log(
    `📚 API Documentation: http://localhost:${PORT}/api/docs/queues\n`
  );

  await initializeApplication();
});

export default app;
