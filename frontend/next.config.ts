import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // 👇 [추가] 빌드 중 ESLint 검사 무시 (메모리 절약)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
