import { Worker } from "bullmq";
import { redisConnection } from "../server";

const processTask = async (job: any) => {
  console.log(job.name);
  if (job.name === "processing") {
    console.log("Started processing job:", job.id);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const { task, userId, fileName } = job.data;
    console.log(
      `Processing task: ${task} for user: ${userId} with file: ${fileName}`
    );
    // Add your file processing logic here
  }
};

const worker = new Worker("imageProcessingQueue", processTask, {
  connection: redisConnection,
});
worker.on("completed", (job) => {
  console.log(`Job with id ${job.id} has been completed`);
});
worker.on("failed", (job, err) => {
  console.log(`Job with id ${job?.id} has failed with error ${err.message}`);
});

console.log("User worker started, waiting for tasks...");

export default worker;
