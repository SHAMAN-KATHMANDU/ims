import { getRedisClient } from "@/config/redis";

const TTL_MS = 90 * 1000; // 90 seconds

interface Entry {
  body: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

function normalizeQuery(query: Record<string, unknown>): string {
  const keys = Object.keys(query).sort();
  const pairs = keys.map((k) => `${k}=${String(query[k] ?? "")}`);
  return pairs.join("&");
}

/**
 * Build a cache key from route path, user id, and query string.
 * Same endpoint + user + filters must always produce the same key.
 */
export function buildAnalyticsCacheKey(
  path: string,
  userId: string | undefined,
  query: Record<string, unknown>,
): string {
  const q = normalizeQuery(query);
  return `analytics:${path}:${userId ?? "anon"}:${q}`;
}

export async function getCachedAnalytics(
  key: string,
): Promise<unknown | undefined> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  }

  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.body;
}

export async function setCachedAnalytics(
  key: string,
  body: unknown,
): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(body), "PX", TTL_MS);
    return;
  }

  store.set(key, {
    body,
    expiresAt: Date.now() + TTL_MS,
  });
}
