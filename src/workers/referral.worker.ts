import { Worker, Job } from 'bullmq';
import { redisService } from '../services/third-party/redis.service';
import { referralService } from '../services/referral.service';
import { ReferralJobData, QueueNames } from '../types';
import { logger } from '../utils/logger';

class ReferralWorker {
  private worker: Worker<ReferralJobData> | null = null;

  initialize(): Worker<ReferralJobData> {
    if (this.worker) {
      return this.worker;
    }

    const connection = redisService.getClient();

    this.worker = new Worker<ReferralJobData>(
      QueueNames.REFERRAL,
      async (job: Job<ReferralJobData>) => {
        return await this.processJob(job);
      },
      {
        connection,
        concurrency: 5, // Process 5 jobs concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // per second
        },
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed:`, error);
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    logger.info('Referral worker initialized');

    return this.worker;
  }

  private async processJob(job: Job<ReferralJobData>): Promise<void> {
    const { userId, firstName, lastName, referredBy } = job.data;

    logger.info(`Processing referral job for user: ${userId}`);

    try {
      // Generate and save referral code
      const referralCode = await referralService.generateReferralCode(
        userId,
        firstName,
        lastName
      );

      logger.info(`Referral code ${referralCode} generated for user: ${userId}`);

      // If user was referred, increment referrer's count
      if (referredBy) {
        const referrer = await referralService.getUserByReferralCode(referredBy);
        if (referrer) {
          await referralService.incrementReferralCount(referrer.uid);
          logger.info(`Incremented referral count for referrer: ${referrer.uid}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to process referral job for user ${userId}:`, error);
      throw error; // Will trigger retry
    }
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('Referral worker closed');
    }
  }

  getWorker(): Worker<ReferralJobData> {
    if (!this.worker) {
      throw new Error('Referral worker not initialized');
    }
    return this.worker;
  }
}

export const referralWorker = new ReferralWorker();