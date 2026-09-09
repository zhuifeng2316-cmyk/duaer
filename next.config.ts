import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "duaer.com" }],
        destination: "https://www.duaer.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
