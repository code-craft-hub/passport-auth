import { Worker } from "bullmq";
import { redisConnection } from "../server";

const verificationWorker = async (job: any) => {
    console.log(job.name);
  const userId = job.data.userId;
  console.log(`Job started for user verification: ${userId}`);

  const isValid = Math.random() > 0.5;

  if (isValid) {
    console.log(`User ${userId} verified successfully.`);
    return Promise.resolve();
  } else {
    console.log(`User ${userId} verification failed.`);
    return Promise.reject(new Error("Verification failed"));
  }
};

const worker = new Worker("user-verification-queue", verificationWorker, {
  connection: redisConnection,
});


export default worker;
