import IORedis from 'ioredis';

// Production Redis configuration
export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // CRITICAL for BullMQ
  enableReadyCheck: false,
  
  // Reconnection strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Connection timeout
  connectTimeout: 10000,
  
  // Keep-alive
  keepAlive: 30000,
  
  // TLS for production (GCP MemoryStore with TLS)
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

// Connection events
redisConnection.on('connect', () => {
  console.log('Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisConnection.on('close', () => {
  console.warn('Redis connection closed');
});