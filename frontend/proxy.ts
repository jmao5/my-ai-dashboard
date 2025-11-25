import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 👇 서버 로그에 이 메시지가 찍히나 보세요!
    console.log("🔥 미들웨어 동작함! 접근 경로:", req.nextUrl.pathname);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        console.log("🔑 토큰 상태:", !!token); // 토큰이 있는지 확인
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
