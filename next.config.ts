import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 악보·교안 PDF가 서버 액션 기본 1MB를 넘으면 액션 전에 500이 난다.
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  async rewrites() {
    return [{ source: "/sorting-hat", destination: "/sorting-hat/index.html" }];
  },
};

export default nextConfig;
