import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis: max reconnection attempts reached');
      return null;
    }
    return Math.min(times * 200, 5000);
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});
