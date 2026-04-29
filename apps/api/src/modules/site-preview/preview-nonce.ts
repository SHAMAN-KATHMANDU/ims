/**
 * Redis-backed nonce allowlist for site-scope preview tokens (issue #429).
 *
 * Each minted preview token carries a cryptographically-random `nonce` bound
 * to the token body (and covered by the HMAC signature). We store the nonce in
 * Redis for the lifetime of the token so the public preview service can verify
 * it on every request. Revoking the nonce blocks further use of that token
 * without touching the HMAC secret — supporting per-session invalidation
 * (e.g. editor close, sign-out) without a secret rotation.
 *
 * Key format: `preview-nonce:{tenantId}:{nonce}`
 * TTL: token TTL + 5-minute grace (clock-skew / in-flight tolerance).
 */

import redis from "@/config/redis";

const PREFIX = "preview-nonce";
/** Extra Redis TTL on top of the token TTL to handle clock skew and in-flight requests. */
const GRACE_SECONDS = 5 * 60;

export interface NonceRecord {
  scope: string;
  pageId: string | null;
  /** Unix epoch seconds — when the token was issued. */
  iat: number;
}

export function nonceKey(tenantId: string, nonce: string): string {
  return `${PREFIX}:${tenantId}:${nonce}`;
}

/**
 * Persist a nonce in Redis. Must be called immediately after signing a token,
 * before returning the token URL to the client.
 *
 * @param tenantId   - Tenant the token belongs to.
 * @param nonce      - UUID generated inside `signSitePreviewToken`.
 * @param record     - Metadata stored alongside the nonce (scope, pageId, iat).
 * @param ttlSeconds - The token's own TTL; Redis TTL = ttlSeconds + GRACE_SECONDS.
 */
export async function storePreviewNonce(
  tenantId: string,
  nonce: string,
  record: NonceRecord,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(
    nonceKey(tenantId, nonce),
    JSON.stringify(record),
    "EX",
    ttlSeconds + GRACE_SECONDS,
  );
}

/**
 * Check whether a nonce is still in the Redis allowlist.
 * Returns `true` if the key exists (nonce is valid), `false` if it has
 * expired or was revoked.
 */
export async function checkPreviewNonce(
  tenantId: string,
  nonce: string,
): Promise<boolean> {
  const val = await redis.get(nonceKey(tenantId, nonce));
  return val !== null;
}

/**
 * Immediately remove a nonce from Redis. After this call the token is rejected
 * by the public preview service on the next request.
 *
 * Fire-and-forget safe — callers can ignore the promise when best-effort
 * revocation is acceptable (e.g. editor `beforeunload`).
 */
export async function revokePreviewNonce(
  tenantId: string,
  nonce: string,
): Promise<void> {
  await redis.del(nonceKey(tenantId, nonce));
}
