/* eslint-env node */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  // Multi-stage Docker builds need a minimal standalone bundle.
  output: "standalone",
  // Trust the Host header from Caddy — we need req.headers.get("host") to
  // reflect the customer-facing domain, not the docker upstream name.
  experimental: {
    trustHostHeader: true,
  },
  // Tenant sites render per-tenant content; we don't want the browser to
  // cache across tenants accidentally. ISR via cache tags handles freshness.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
