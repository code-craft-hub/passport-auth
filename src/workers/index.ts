import { firebaseService } from '../services/third-party/firebase.service';
import { redisService } from '../services/third-party/redis.service';
import { referralWorker } from './referral.worker';
import { logger } from '../utils/logger';

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    await referralWorker.close();
    await redisService.disconnect();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize services
async function start() {
  try {
    logger.info('Starting worker process...');

    // Initialize Firebase
    firebaseService.initialize();

    // Initialize Redis
    redisService.initialize();

    // Initialize worker
    referralWorker.initialize();

    logger.info('Worker process started successfully');
  } catch (error) {
    logger.error('Failed to start worker process:', error);
    process.exit(1);
  }
}

start();