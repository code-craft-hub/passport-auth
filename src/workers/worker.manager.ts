import { Worker, WorkerOptions, Job } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { QueueName } from '../types';
import * as processors from '../processors/job-processors';
import path from 'path';

// Default worker options - Enterprise grade configuration
const defaultWorkerOptions: WorkerOptions = {
  connection: redisConfig,
  prefix: process.env.QUEUE_PREFIX || 'bullmq',
  concurrency: parseInt(process.env.MAX_JOBS_PER_WORKER || '5'),
  lockDuration: 30000, // 30 seconds
  maxStalledCount: 3, // Max times a job can be stalled before failed
  stalledInterval: 30000, // Check for stalled jobs every 30 seconds
  autorun: false, // Don't start automatically, we'll start manually
};

// Worker Manager - Manages all workers
class WorkerManager {
  private workers: Map<string, Worker> = new Map();

  // Create standard worker
  createWorker(
    queueName: QueueName,
    processor: (job: Job) => Promise<any>,
    options?: Partial<WorkerOptions>
  ): Worker {
    const workerKey = `${queueName}-worker`;
    
    if (this.workers.has(workerKey)) {
      console.log(`⚠️  Worker already exists for ${queueName}`);
      return this.workers.get(workerKey)!;
    }

    const worker = new Worker(
      queueName,
      processor,
      {
        ...defaultWorkerOptions,
        ...options,
      }
    );

    this.setupWorkerEventListeners(worker, queueName);
    this.workers.set(workerKey, worker);
    
    console.log(`👷 Worker created for queue: ${queueName}`);
    return worker;
  }

  // Create worker with custom concurrency
  createWorkerWithConcurrency(
    queueName: QueueName,
    processor: (job: Job) => Promise<any>,
    concurrency: number
  ): Worker {
    return this.createWorker(queueName, processor, { concurrency });
  }

  // Create sandboxed worker (runs processor in separate process)
  createSandboxedWorker(queueName: QueueName): Worker {
    const workerKey = `${queueName}-sandboxed-worker`;
    
    if (this.workers.has(workerKey)) {
      console.log(`⚠️  Sandboxed worker already exists for ${queueName}`);
      return this.workers.get(workerKey)!;
    }

    const worker = new Worker(
      queueName,
      path.join(__dirname, '../processors/sandboxed-processor.js'),
      {
        ...defaultWorkerOptions,
        // Sandboxed workers typically have lower concurrency
        concurrency: 2,
      }
    );

    this.setupWorkerEventListeners(worker, queueName);
    this.workers.set(workerKey, worker);
    
    console.log(`🔒 Sandboxed worker created for queue: ${queueName}`);
    return worker;
  }

  // Setup event listeners for worker
  private setupWorkerEventListeners(worker: Worker, queueName: string): void {
    // Job completed successfully
    worker.on('completed', (job: Job, result: any) => {
      console.log(`✅ [${queueName}] Job ${job.id} completed`);
    });

    // Job failed
    worker.on('failed', (job: Job | undefined, error: Error) => {
      console.error(`❌ [${queueName}] Job ${job?.id} failed:`, error.message);
    });

    // Job progress updated
    worker.on('progress', (job: Job, progress: number | object) => {
      console.log(`📊 [${queueName}] Job ${job.id} progress:`, progress);
    });

    // Worker is active (processing a job)
    worker.on('active', (job: Job) => {
      console.log(`🔄 [${queueName}] Job ${job.id} started`);
    });

    // Job stalled
    worker.on('stalled', (jobId: string) => {
      console.warn(`⚠️  [${queueName}] Job ${jobId} stalled`);
    });

    // Worker error
    worker.on('error', (error: Error) => {
      console.error(`❌ [${queueName}] Worker error:`, error.message);
    });

    // Worker ready
    worker.on('ready', () => {
      console.log(`✅ [${queueName}] Worker ready`);
    });

    // Worker closing
    worker.on('closing', () => {
      console.log(`🔒 [${queueName}] Worker closing`);
    });

    // Worker closed
    worker.on('closed', () => {
      console.log(`🔒 [${queueName}] Worker closed`);
    });
  }

  // Initialize all workers
  initializeWorkers(): void {
    // Email queue worker
    this.createWorker('email-queue', processors.processEmailJob);

    // Image processing queue worker
    this.createWorker('image-processing-queue', processors.processImageJob);

    // Data processing queue worker
    this.createWorker('data-processing-queue', processors.processDataJob);

    // Notification queue worker
    this.createWorker('notification-queue', processors.processNotificationJob);

    // Priority queue worker
    this.createWorker('priority-queue', processors.processPriorityJob);

    // Scheduled queue worker
    this.createWorker('scheduled-queue', processors.processScheduledReportJob);

    // FIFO queue worker
    this.createWorker('fifo-queue', processors.processGenericJob);

    // LIFO queue worker
    this.createWorker('lifo-queue', processors.processGenericJob);

    // Delayed queue worker
    this.createWorker('delayed-queue', processors.processDelayedJob);

    // Bulk queue worker
    this.createWorker('bulk-queue', processors.processBulkJob);

    // Rate limited queue worker
    this.createWorkerWithConcurrency('rate-limited-queue', processors.processGenericJob, 2);

    // Deduplication queue worker
    this.createWorker('deduplication-queue', processors.processGenericJob);

    console.log(`\n🎉 All ${this.workers.size} workers initialized\n`);
  }

  // Start all workers
  async startAllWorkers(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.run();
      console.log(`▶️  Worker started: ${name}`);
    }
  }

  // Pause a worker
  async pauseWorker(queueName: QueueName): Promise<void> {
    const workerKey = `${queueName}-worker`;
    const worker = this.workers.get(workerKey);
    if (worker) {
      await worker.pause();
      console.log(`⏸️  Worker paused: ${queueName}`);
    }
  }

  // Resume a worker
  async resumeWorker(queueName: QueueName): Promise<void> {
    const workerKey = `${queueName}-worker`;
    const worker = this.workers.get(workerKey);
    if (worker) {
      await worker.resume();
      console.log(`▶️  Worker resumed: ${queueName}`);
    }
  }

  // Gracefully close a worker
  async closeWorker(queueName: QueueName): Promise<void> {
    const workerKey = `${queueName}-worker`;
    const worker = this.workers.get(workerKey);
    if (worker) {
      await worker.close();
      this.workers.delete(workerKey);
      console.log(`🔒 Worker closed: ${queueName}`);
    }
  }

  // Gracefully close all workers
  async closeAllWorkers(): Promise<void> {
    console.log('\n🛑 Gracefully shutting down all workers...\n');
    
    const closePromises = Array.from(this.workers.values()).map(worker =>
      worker.close()
    );
    
    await Promise.all(closePromises);
    this.workers.clear();
    
    console.log('✅ All workers shut down gracefully\n');
  }

  // Get worker instance
  getWorker(queueName: QueueName): Worker | undefined {
    const workerKey = `${queueName}-worker`;
    return this.workers.get(workerKey);
  }

  // Get all workers
  getAllWorkers(): Map<string, Worker> {
    return this.workers;
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();