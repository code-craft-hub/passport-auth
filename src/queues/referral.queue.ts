import { Queue } from 'bullmq';
import { redisService } from '../services/third-party/redis.service';
import { ReferralJobData, QueueNames, JobNames } from '../types';
import { logger } from '../utils/logger';

class ReferralQueue {
  private queue: Queue<ReferralJobData> | null = null;

  initialize(): Queue<ReferralJobData> {
    if (this.queue) {
      return this.queue;
    }

    const connection = redisService.getClient();

    this.queue = new Queue<ReferralJobData>(QueueNames.REFERRAL, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 500, // Keep last 500 failed jobs
          age: 7 * 24 * 3600, // Keep for 7 days
        },
      },
    });

    this.queue.on('error', (error) => {
      logger.error('Referral queue error', error);
    });

    logger.info('Referral queue initialized');

    return this.queue;
  }

  async addReferralJob(data: ReferralJobData): Promise<void> {
    if (!this.queue) {
      throw new Error('Referral queue not initialized');
    }

    try {
      await this.queue.add(JobNames.GENERATE_REFERRAL_CODE, data, {
        priority: 1,
      });
      logger.info(`Referral job added for user: ${data.userId}`);
    } catch (error) {
      logger.error('Failed to add referral job', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
      logger.info('Referral queue closed');
    }
  }

  getQueue(): Queue<ReferralJobData> {
    if (!this.queue) {
      throw new Error('Referral queue not initialized');
    }
    return this.queue;
  }
}

export const referralQueue = new ReferralQueue();