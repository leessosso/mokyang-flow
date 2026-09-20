import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/sorting-hat", destination: "/sorting-hat/index.html" }];
  },
};

export default nextConfig;
