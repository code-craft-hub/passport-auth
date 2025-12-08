import { Queue, QueueOptions } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { QueueName } from '../types';

// Default queue options - Enterprise grade configuration
const defaultQueueOptions: QueueOptions = {
  connection: redisConfig,
  prefix: process.env.QUEUE_PREFIX || 'bullmq',
  defaultJobOptions: {
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
  },
};

// Queue Manager - Singleton pattern for managing all queues
class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();

  // Create or get existing queue
  getQueue(name: QueueName, options?: Partial<QueueOptions>): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        ...defaultQueueOptions,
        ...options,
      });
      this.queues.set(name, queue);
      console.log(`📦 Queue created: ${name}`);
    }
    return this.queues.get(name)!;
  }

  // Queue with Global Concurrency
  getQueueWithGlobalConcurrency(name: QueueName, maxConcurrency: number): Queue {
    return this.getQueue(name, {
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
      },
    });
  }

  // Queue with Global Rate Limiting
  getQueueWithRateLimit(name: QueueName, max: number, duration: number): Queue {
    return this.getQueue(name, {
      limiter: {
        max, // Max number of jobs
        duration, // Per duration in milliseconds
      },
    });
  }

  // Queue with custom removal settings
  getQueueWithAutoRemoval(
    name: QueueName,
    removeOnComplete: number | boolean,
    removeOnFail: number | boolean
  ): Queue {
    return this.getQueue(name, {
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
        removeOnComplete,
        removeOnFail,
      },
    });
  }

  // Get all queues
  getAllQueues(): Map<QueueName, Queue> {
    return this.queues;
  }

  // Close all queues
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map(queue => 
      queue.close()
    );
    await Promise.all(closePromises);
    console.log('🔒 All queues closed');
  }

  // Pause a queue
  async pauseQueue(name: QueueName): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.pause();
      console.log(`⏸️  Queue paused: ${name}`);
    }
  }

  // Resume a queue
  async resumeQueue(name: QueueName): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.resume();
      console.log(`▶️  Queue resumed: ${name}`);
    }
  }

  // Get queue stats
  async getQueueStats(name: QueueName) {
    const queue = this.queues.get(name);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  // Clean queue (remove old jobs)
  async cleanQueue(
    name: QueueName,
    grace: number,
    limit: number,
    type: 'completed' | 'failed'
  ): Promise<string[]> {
    const queue = this.queues.get(name);
    if (!queue) return [];
    return await queue.clean(grace, limit, type);
  }

  // Obliterate queue (remove all jobs)
  async obliterateQueue(name: QueueName, options?: { force?: boolean }): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.obliterate(options);
      console.log(`💥 Queue obliterated: ${name}`);
    }
  }

  // Drain queue (remove all waiting jobs)
  async drainQueue(name: QueueName, delayed?: boolean): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.drain(delayed);
      console.log(`🚰 Queue drained: ${name}`);
    }
  }

  // Set queue metadata
  async setQueueMetadata(name: QueueName, metadata: Record<string, any>): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.setMetadata(metadata);
      console.log(`📝 Metadata set for queue: ${name}`);
    }
  }

  // Get queue metadata
  async getQueueMetadata(name: QueueName): Promise<Record<string, any> | undefined> {
    const queue = this.queues.get(name);
    if (queue) {
      return await queue.getMetadata();
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager();