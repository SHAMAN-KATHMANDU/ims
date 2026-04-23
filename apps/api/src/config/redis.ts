/**
 * Shared Redis connection singleton for ioredis and BullMQ.
 *
 * Provides a single, reusable Redis instance with consistent configuration
 * across all queue, cache, and lock operations.
 */

import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

/**
 * Parse Redis URL and create a configured ioredis instance.
 *
 * Connection options follow BullMQ best practices:
 * - maxRetriesPerRequest: null — allows pipelined commands
 * - enableReadyCheck: false — compatibility with cloud Redis
 * - enableOfflineQueue: true — buffer commands during reconnection
 */
export function createRedisClient(): Redis {
  const redisUrl = new URL(env.redisUrl);

  const redis = new Redis({
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
  });

  redis.on("error", (err) => {
    logger.error("Redis connection error", undefined, { error: err });
  });

  redis.on("reconnecting", () => {
    logger.warn("Redis reconnecting", undefined);
  });

  return redis;
}

/**
 * Singleton Redis client — lazy-initialized on first access.
 * Safe for concurrent use (thread-safe in Node.js due to event loop).
 */
let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisClient();
  }
  return redisInstance;
}

/**
 * Named export for backward compatibility and explicit dependency injection.
 */
export const redis: Redis = getRedis();

export default redis;
