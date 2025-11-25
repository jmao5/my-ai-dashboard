import type { NextConfig } from "next";
// 👇 require 대신 import 사용 (Next.js 최신 방식 호환)
import withPWA from "@ducanh2912/next-pwa";

const withPWAdefault = withPWA({
  dest: "public", // 서비스 워커 저장 위치
  cacheOnFrontEndNav: true, // 페이지 이동 시 캐싱
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // 개발 땐 끄기
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: "standalone", // 아까 추가한 설정 유지
  // ... 기타 설정들 ...
};

// 👇 설정을 withPWA로 감싸서 내보내기
export default withPWAdefault(nextConfig);
