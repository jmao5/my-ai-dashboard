import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 환경 변수에 설정한 비밀번호와 일치하는지 확인
        const correctPassword = process.env.ADMIN_PASSWORD;

        if (credentials?.password === correctPassword) {
          // 로그인 성공 시 유저 객체 반환
          return { id: "1", name: "Admin User", email: "admin@dashboard.com" };
        }
        // 실패 시 null 반환
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login", // 커스텀 로그인 페이지 경로
  },
  callbacks: {
    async jwt({ token, user }) {
      return token;
    },
    async session({ session, token }) {
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
