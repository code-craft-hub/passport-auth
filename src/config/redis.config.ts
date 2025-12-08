import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create Redis connection for BullMQ
export const createRedisConnection = () => {
  return new IORedis(redisConfig);
};

// Test Redis connection
export const testRedisConnection = async () => {
  const redis = createRedisConnection();
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
    await redis.quit();
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    await redis.quit();
    return false;
  }
};