/**
 * Cart session key management — localStorage helpers for tracking guest carts
 * across sessions, with legacy key migration support.
 */

/**
 * Legacy localStorage key for the browser's stable cart session id, before
 * tenant-scoping was added.
 */
export const LEGACY_SESSION_KEY_STORAGE = "tenant-site:cart-session";

/**
 * Get the tenant-scoped localStorage key for a cart session id.
 */
export function sessionKeyStorage(tenantId: string): string {
  return `${LEGACY_SESSION_KEY_STORAGE}:${tenantId}`;
}

/**
 * Generate a random session key (UUID or fallback if crypto unavailable).
 */
export function generateSessionKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Load an existing session key from localStorage, or create a new one.
 * Includes legacy key migration: if a pre-scoped key exists at the legacy
 * location, it is adopted for the tenant and the legacy key is removed.
 *
 * If localStorage throws (disabled, full, private mode), returns a newly
 * generated key without persisting.
 */
export function loadOrCreateSessionKey(tenantId: string): string {
  try {
    const storage =
      typeof window !== "undefined" ? window.localStorage : localStorage;
    const key = sessionKeyStorage(tenantId);
    const existing = storage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    // Migrate a pre-scoping key so returning shoppers keep their
    // abandoned-cart session instead of forking a new row.
    const legacy = storage.getItem(LEGACY_SESSION_KEY_STORAGE);
    const fresh = legacy && legacy.length >= 8 ? legacy : generateSessionKey();
    storage.setItem(key, fresh);
    storage.removeItem(LEGACY_SESSION_KEY_STORAGE);
    return fresh;
  } catch {
    return generateSessionKey();
  }
}
