import Redis from 'ioredis';
import { redisConfig } from '../../config';
import { logger } from '../../utils/logger';

class RedisService {
  private client: Redis | null = null;

  initialize(): Redis {
    if (this.client) {
      return this.client;
    }

    this.client = new Redis(redisConfig);

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error', error);
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return this.client;
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  // Helper methods for common operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    if (ttl) {
      await client.setex(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }
}

export const redisService = new RedisService();