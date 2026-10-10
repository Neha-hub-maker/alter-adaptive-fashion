import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const value = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"
      ? [{ source: "/style-guide/:path*", headers: value }]
      : [{ source: "/:path*", headers: value }];
  },
  // The cloud workflow checks the dev server through loopback.
  allowedDevOrigins: ["127.0.0.1"],
};
export default nextConfig;
