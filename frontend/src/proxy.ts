import { withAuth } from "next-auth/middleware";

export default withAuth({
  // 로그인 안 된 사용자가 접근하면 여기로 보냄
  pages: {
    signIn: "/login",
  },
});

// 보호할 경로 설정 (로그인 페이지랑 API, 정적 파일 빼고 다 막음)
export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 경로에 미들웨어 적용:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (로그인 페이지)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
