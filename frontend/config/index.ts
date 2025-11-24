// 환경 변수 불러오기 (없으면 기본값)
export const API_CONFIG = {
  // Go 시스템 백엔드 주소
  GO_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:9015",
  // Python AI 백엔드 주소
  AI_API_URL: process.env.NEXT_PUBLIC_AI_URL || "http://localhost:9016",
} as const;
