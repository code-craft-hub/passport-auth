import { Worker } from 'bullmq';
import path from 'path';
import { redisConnection } from '../config/redis';

export const videoWorker = new Worker(
  'video',
  path.join(__dirname, '../processors/video.processor.js'),
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

