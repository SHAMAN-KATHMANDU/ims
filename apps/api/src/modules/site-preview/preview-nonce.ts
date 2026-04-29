/**
 * Redis-backed nonce allowlist for site preview tokens (issue #429).
 *
 * Each preview token carries a `nonce` (crypto.randomUUID()) that is stored
 * here on issuance. The public preview endpoint checks the nonce exists before
 * serving draft content — so even a valid, unexpired HMAC token is rejected if
 * its nonce has been revoked (e.g. editor closed, user signed out, or a new
 * token was issued via refresh).
 *
 * Key schema:  preview-nonce:{tenantId}:{nonce}
 * Value:       JSON { scope, pageId: string|null, iat: number }
 * TTL:         token TTL + GRACE_SECONDS (5 min) to handle clock skew and
 *              the case where a valid token's verify call races against expiry.
 */

import redis from "@/config/redis";

const PREFIX = "preview-nonce";
const GRACE_SECONDS = 5 * 60; // 5-minute grace on top of token TTL

export interface NonceRecord {
  scope: string;
  pageId: string | null;
  iat: number;
}

export function nonceKey(tenantId: string, nonce: string): string {
  return `${PREFIX}:${tenantId}:${nonce}`;
}

/**
 * Store a nonce in Redis. Must be called immediately after signing a token so
 * the nonce is present before any verify attempt can arrive.
 */
export async function storePreviewNonce(
  tenantId: string,
  nonce: string,
  record: NonceRecord,
  ttlSeconds: number,
): Promise<void> {
  const key = nonceKey(tenantId, nonce);
  await redis.set(key, JSON.stringify(record), "EX", ttlSeconds + GRACE_SECONDS);
}

/**
 * Returns true if the nonce is present in the allowlist (token not revoked).
 */
export async function checkPreviewNonce(
  tenantId: string,
  nonce: string,
): Promise<boolean> {
  const val = await redis.get(nonceKey(tenantId, nonce));
  return val !== null;
}

/**
 * Delete a nonce from the allowlist, rendering the token immediately unusable.
 * Safe to call even if the key does not exist (Redis DEL is idempotent).
 */
export async function revokePreviewNonce(
  tenantId: string,
  nonce: string,
): Promise<void> {
  await redis.del(nonceKey(tenantId, nonce));
}
