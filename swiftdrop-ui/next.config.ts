import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/outbox",
        destination: "/event-stream",
        permanent: false,
      },
      {
        source: "/health",
        destination: "/system-monitoring",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
