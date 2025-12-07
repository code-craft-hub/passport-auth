import { Queue, QueueOptions } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

const queueOptions: QueueOptions = {
  connection: redisConnection,
  
  // Default job options
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
      count: 5000,
    },
  },
};

export const emailQueue = new Queue(
  'email',
  queueOptions
);
// Helper function to add email jobs
export async function sendEmail(data: EmailJobData) {
  return emailQueue.add('send-email', data, {
    priority: data.template === 'urgent' ? 1 : 5,
  });
}