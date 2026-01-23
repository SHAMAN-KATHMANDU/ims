/** @type {import('next').NextConfig} */

// Note: `process` is not a guaranteed global in all lint environments.
// Use `globalThis.process` to avoid `no-undef` while still working in Node.
const isDockerEnv = globalThis.process?.env?.DOCKER_ENV === "true";

const nextConfig = {
  // Standalone output for optimized Docker builds
  // This creates a minimal production bundle with only necessary files
  output: "standalone",

  // Note: We're using direct API calls - no rewrites needed

  // Transpile packages that might have ES modules
  transpilePackages: ["zustand"],

  // Fix Turbopack root directory for Docker only
  turbopack: isDockerEnv ? { root: "/app/apps/web" } : {},

  // Webpack configuration to handle module resolution in monorepo
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution for monorepo
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ensure zustand is properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    return config;
  },
};

export default nextConfig;
