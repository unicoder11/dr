import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://177.93.129.153/api/:path*" },
      { source: "/media/:path*", destination: "http://177.93.129.153/media/:path*" },
    ];
  },
};

export default nextConfig;
