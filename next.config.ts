import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // <-- ISSO IGNORA O ESLINT NO BUILD
  },
};

export default nextConfig;
