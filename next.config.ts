import type { NextConfig } from "next";
import {
  resolveTongdokOrigin,
  tongdokRewriteDestination,
} from "./src/lib/platform/tongdok-proxy";
import {
  resolveTrainingOrigin,
  trainingRewriteDestination,
} from "./src/lib/platform/training-proxy";

const nextConfig: NextConfig = {
  experimental: {
    // 악보·교안 PDF가 서버 액션 기본 1MB를 넘으면 액션 전에 500이 난다.
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  async rewrites() {
    const rules: { source: string; destination: string }[] = [
      { source: "/sorting-hat", destination: "/sorting-hat/index.html" },
    ];

    const trainingOrigin = resolveTrainingOrigin();
    if (trainingOrigin) {
      const dest = trainingRewriteDestination(trainingOrigin);
      rules.push(
        { source: "/training", destination: dest },
        { source: "/training/:path*", destination: `${dest}/:path*` },
      );
    }

    const tongdokOrigin = resolveTongdokOrigin();
    if (tongdokOrigin) {
      const dest = tongdokRewriteDestination(tongdokOrigin);
      rules.push(
        { source: "/tongdok", destination: dest },
        { source: "/tongdok/:path*", destination: `${dest}/:path*` },
      );
    }

    return rules;
  },
};

export default nextConfig;
