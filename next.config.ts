import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The cloud workflow checks the dev server through loopback.
  allowedDevOrigins: ["127.0.0.1"],
};
export default nextConfig;
