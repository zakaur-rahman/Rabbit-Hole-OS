import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // assetPrefix: './' breaks nested routes (e.g. /sign-in, /auth/google) by forcing relative paths.
  // It should only be used if explicitly building for Electron's file:// protocol.
  assetPrefix: process.env.BUILD_TARGET === 'electron' ? './' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
