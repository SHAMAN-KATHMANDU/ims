/* eslint-env node */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "..", "..");

/**
 * Frame-ancestors allowlist for /preview/* routes. The admin console
 * embeds these routes in an iframe, so the default SAMEORIGIN lockdown
 * would block it. Set ALLOWED_FRAME_ANCESTORS in the deployment env to a
 * space-separated list of allowed origins (e.g. "https://admin.example.com
 * https://staging-admin.example.com"). Unset/empty falls back to "*"
 * because the preview routes are HMAC-token gated — the token is the auth
 * and origin restriction is a defense-in-depth layer, not a hard barrier.
 */
const rawAllowedFrameAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();
const frameAncestors =
  rawAllowedFrameAncestors && rawAllowedFrameAncestors.length > 0
    ? rawAllowedFrameAncestors
    : "*";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  // Multi-stage Docker builds need a minimal standalone bundle.
  output: "standalone",
  // Host-header passthrough: Next 16 respects the incoming Host header by
  // default, so middleware.ts / proxy.ts sees the customer-facing domain
  // from Caddy. No experimental flag needed (Next 15's trustHostHeader was
  // dropped in 16; the behavior is now the default).
  //
  // Tenant sites render per-tenant content; we don't want the browser to
  // cache across tenants accidentally. ISR via cache tags handles freshness.
  async headers() {
    return [
      // Global lockdown for everything except /preview/* — matches via
      // negative-lookahead regex so the preview routes can be independently
      // configured below without worrying about rule ordering or merging.
      {
        source: "/((?!preview/).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Preview routes: HMAC-token gated, embeddable from the admin. Uses
      // CSP frame-ancestors (preferred over the legacy X-Frame-Options
      // header; modern browsers ignore X-Frame-Options when a CSP
      // frame-ancestors directive is present, so the inherited
      // SAMEORIGIN from the default lockdown above doesn't bite us even
      // if Next emits it alongside).
      {
        source: "/preview/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
