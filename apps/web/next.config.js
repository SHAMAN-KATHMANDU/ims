/* eslint-env node */
import path from "path";
import { fileURLToPath } from "url";

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

  // Redirect legacy /product paths to /products for backwards compatibility
  async redirects() {
    return [
      {
        source: "/:slug/product",
        destination: "/:slug/products",
        permanent: true,
      },
      {
        source: "/:slug/product/:path*",
        destination: "/:slug/products/:path*",
        permanent: true,
      },
    ];
  },

  // Allow next/image for variation photos (e.g. seed data from picsum.photos)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },

  // In development, proxy /api/v1 to the API server so login and API calls work without setting NEXT_PUBLIC_API_URL.
  // When NEXT_PUBLIC_API_URL is set (e.g. production), the frontend calls that URL directly; no rewrite used.
  // eslint-disable-next-line no-undef -- process is a Node.js global in config files
  ...(process.env.NODE_ENV === "development" && {
    async rewrites() {
      return [
        {
          source: "/api/v1/:path*",
          destination: "http://localhost:4000/api/v1/:path*",
        },
      ];
    },
  }),
};

export default nextConfig;
