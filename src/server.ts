import { createApp } from './app';
import { envConfig } from './config';
import { firebaseService } from './services/third-party/firebase.service';
import { redisService } from './services/third-party/redis.service';
import { referralQueue } from './queues/referral.queue';
import { logger } from './utils/logger';
import http from 'http';

let server: http.Server | null = null;

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await referralQueue.close();
        await redisService.disconnect();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
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

// Start server
async function start() {
  try {
    logger.info('Starting server...');

    // Initialize Firebase
    firebaseService.initialize();

    // Initialize Redis
    redisService.initialize();

    // Initialize referral queue
    referralQueue.initialize();

    // Create Express app
    const app = createApp();

    // Start HTTP server
    server = app.listen(envConfig.PORT, () => {
      logger.info(`Server running on port ${envConfig.PORT}`);
      logger.info(`Environment: ${envConfig.NODE_ENV}`);
      logger.info(`Project ID: ${envConfig.FIREBASE_PROJECT_ID}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();