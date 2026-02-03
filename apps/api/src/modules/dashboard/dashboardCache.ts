/**
 * In-memory cache for dashboard endpoints only (60–120s TTL).
 * Keeps dashboard fast without reusing analytics cache to avoid coupling.
 */

const TTL_MS = 90 * 1000; // 90 seconds

interface Entry {
  body: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

function cacheKey(path: string, userId: string): string {
  return `dashboard:${path}:${userId}`;
}

export function getCached(path: string, userId: string): unknown | undefined {
  const key = cacheKey(path, userId);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.body;
}

export function setCached(path: string, userId: string, body: unknown): void {
  const key = cacheKey(path, userId);
  store.set(key, {
    body,
    expiresAt: Date.now() + TTL_MS,
  });
}
