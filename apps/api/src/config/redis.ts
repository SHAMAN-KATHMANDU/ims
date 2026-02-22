import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!env.redisUrl) return null;

  if (!redisClient) {
    redisClient = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    redisClient.on("error", (error) => {
      logger.warn("Redis connection error", { error: String(error) });
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  if (client.status === "ready" || client.status === "connecting") return;
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) return;
  await redisClient.quit();
  redisClient = null;
}
