/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for optimized Docker builds
  // This creates a minimal production bundle with only necessary files
  output: "standalone",

  // Note: We're using direct API calls - no rewrites needed
};

export default nextConfig;
