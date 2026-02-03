/**
 * In-memory cache for analytics API responses.
 * Reduces repeated DB load when the same user requests the same filters within TTL.
 * Cache key = endpoint + userId + normalized query so role-scoped data is never shared.
 */

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

/**
 * Return cached response body if present and not expired; otherwise undefined.
 * Expired entries are removed.
 */
export function getCachedAnalytics(key: string): unknown | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.body;
}

/**
 * Store response body for the given key. Overwrites any existing entry.
 */
export function setCachedAnalytics(key: string, body: unknown): void {
  store.set(key, {
    body,
    expiresAt: Date.now() + TTL_MS,
  });
}
