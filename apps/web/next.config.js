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

  // Note: We're using direct API calls - no rewrites needed
};

export default withSentryConfig(nextConfig, {
  org: globalThis.process?.env?.SENTRY_ORG,
  project: globalThis.process?.env?.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
});
