import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow the loopback address used by the e2e runner in dev.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
