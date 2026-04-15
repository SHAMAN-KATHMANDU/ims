/**
 * Short-lived HMAC-signed tokens for previewing unpublished tenant pages.
 *
 * Flow:
 *   - Admin (apps/web) requests a preview URL from the API for a given page id
 *   - API mints a token signed with PREVIEW_TOKEN_SECRET binding tenantId +
 *     pageId + expiry, and returns it inside the iframe URL
 *   - Tenant-site (apps/tenant-site) calls the public draft endpoint with the
 *     token; the API verifies the HMAC and returns the draft page
 *
 * The token never crosses the auth boundary — it grants read-only access to
 * exactly one (tenantId, pageId) pair until it expires. Using the same secret
 * across the API and the seal/verify code means we never have to ship the
 * raw secret to the browser or to tenant-site; only the resulting token is
 * passed through the URL.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/config/env";

const TOKEN_VERSION = "v1";
const SITE_TOKEN_VERSION = "s1";
const DEFAULT_TTL_SECONDS = 30 * 60; // 30 minutes

export interface PreviewTokenPayload {
  tenantId: string;
  pageId: string;
  exp: number;
}

/**
 * Phase 4: site-scope preview tokens. Unlike page tokens which bind a
 * specific TenantPage id, these bind a (tenantId, scope, pageId?) tuple so
 * the Framer-lite editor can preview whole-site drafts (home / products-
 * index / product-detail / ...). A distinct token version prefix ("s1"
 * vs "v1") prevents a page verifier from accepting a site token and vice
 * versa, even though both share the HMAC secret.
 */
export interface SitePreviewTokenPayload {
  tenantId: string;
  scope: string;
  /** Only present for scope="page" — the TenantPage whose override to preview. */
  pageId?: string;
  exp: number;
}

function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(body: string): string {
  const secret = env.previewTokenSecret;
  if (!secret) {
    throw new Error(
      "PREVIEW_TOKEN_SECRET (or JWT_SECRET fallback) must be set to sign preview tokens",
    );
  }
  return base64UrlEncode(createHmac("sha256", secret).update(body).digest());
}

export function signPreviewToken(
  payload: Omit<PreviewTokenPayload, "exp">,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = base64UrlEncode(
    Buffer.from(
      JSON.stringify({ ...payload, exp } satisfies PreviewTokenPayload),
      "utf8",
    ),
  );
  return `${TOKEN_VERSION}.${body}.${sign(body)}`;
}

/**
 * Verify a preview token. Returns the payload on success, null on any
 * failure (bad shape, bad signature, expired, wrong version). Constant-time
 * signature comparison.
 */
export function verifyPreviewToken(token: string): PreviewTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, body, sig] = parts;
  if (version !== TOKEN_VERSION) return null;

  let expectedSig: string;
  try {
    expectedSig = sign(body);
  } catch {
    return null;
  }
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: PreviewTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof payload?.tenantId !== "string" ||
    typeof payload?.pageId !== "string" ||
    typeof payload?.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

// ---------------------------------------------------------------------------
// Site-scope preview tokens (Phase 4)
// ---------------------------------------------------------------------------

export function signSitePreviewToken(
  payload: Omit<SitePreviewTokenPayload, "exp">,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = base64UrlEncode(
    Buffer.from(
      JSON.stringify({
        tenantId: payload.tenantId,
        scope: payload.scope,
        ...(payload.pageId ? { pageId: payload.pageId } : {}),
        exp,
      } satisfies SitePreviewTokenPayload),
      "utf8",
    ),
  );
  return `${SITE_TOKEN_VERSION}.${body}.${sign(body)}`;
}

export function verifySitePreviewToken(
  token: string,
): SitePreviewTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, body, sig] = parts;
  if (version !== SITE_TOKEN_VERSION) return null;

  let expectedSig: string;
  try {
    expectedSig = sign(body);
  } catch {
    return null;
  }
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: SitePreviewTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof payload?.tenantId !== "string" ||
    typeof payload?.scope !== "string" ||
    typeof payload?.exp !== "number"
  ) {
    return null;
  }
  if (payload.pageId !== undefined && typeof payload.pageId !== "string") {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
