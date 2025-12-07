import { Worker, Job } from "bullmq";
import { redisConnection } from "./config/redis";

const emailWorker = new Worker(
  "email",
  async (job: Job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    const { to, subject, body } = job.data;

    // Update progress
    await job.updateProgress(10);

    // Simulate email sending
    // await sendEmailViaProvider(to, subject, body);

    new Promise((resolve) => {
      setTimeout(() => {
        console.log(
          `Email sent ${to}, here is the subject :${subject} and content: ${body}`
        );
        resolve(true);
      }, 5000);
    });

    await job.updateProgress(100);

    // Return value stored in job
    return { sent: true, timestamp: Date.now() };
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs simultaneously

    // Rate limiting per worker
    limiter: {
      max: 10,
      duration: 1000, // 10 jobs per second
    },

    // Auto-remove completed jobs
    autorun: true,

    // Stalled job settings
    lockDuration: 30000, // 30 seconds
    stalledInterval: 5000, // Check every 5 seconds
  }
);

// Event listeners
emailWorker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

emailWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

emailWorker.on("stalled", (jobId) => {
  console.warn(`Job ${jobId} stalled`);
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log("Shutting down worker...");
  await emailWorker.close();
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default emailWorker;
