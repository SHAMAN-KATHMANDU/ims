/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for optimized Docker builds
  // This creates a minimal production bundle with only necessary files
  output: "standalone",

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

  // Note: We're using direct API calls - no rewrites needed
};

export default nextConfig;
