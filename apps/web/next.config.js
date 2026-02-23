import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Monorepo root so Turbopack resolves next and tailwindcss from one place (root has tailwindcss for this)
const monorepoRoot = path.resolve(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },

  // Disable source maps in production to avoid 404s (standalone output excludes .map files)
  productionBrowserSourceMaps: false,

  // Standalone output for optimized Docker builds
  // This creates a minimal production bundle with only necessary files
  output: "standalone",

  // Allow next/image for variation photos and production CDN assets.
  // Add production hostnames (e.g. S3, CloudFront) as needed. Use NEXT_PUBLIC_CDN_HOST if set.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
        pathname: "/**",
      },
    ],
  },

  // Explicitly disable source maps in webpack (belt-and-suspenders with productionBrowserSourceMaps)
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.devtool = false;
    }
    return config;
  },

  // Proxy /api/v1 to API server for same-origin cookies (access_token HttpOnly).
  // Set API_SERVER_URL for Docker (e.g. http://api:4000); default localhost:4000.
  // When using proxy, set NEXT_PUBLIC_API_URL=/api/v1 so client uses same origin.
  async rewrites() {
    const apiServer =
      globalThis.process?.env?.API_SERVER_URL || "http://localhost:4000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiServer}/api/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: globalThis.process?.env?.SENTRY_ORG,
  project: globalThis.process?.env?.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  // Disable source maps to avoid 404s (standalone output + Sentry deletes them after upload)
  sourcemaps: { disable: true },
});
