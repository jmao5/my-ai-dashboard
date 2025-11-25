import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import QueryProvider from "@/providers/QueryProvider";
import SessionProvider from "@/providers/SessionProvider";
import UserMenu from "@/components/UserMenu";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "My AI Dashboard",
  description: "Personal Server Control Center",
  manifest: "/manifest.json", // 👈 매니페스트 연결
  icons: {
    apple: "/icon.png", // 아이폰용 아이콘
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <SessionProvider>
          <QueryProvider>
            <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
              {/* 1. 왼쪽 사이드바 */}
              <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">
                {/* 로고 영역 */}
                <div className="h-16 flex items-center justify-center border-b border-gray-700">
                  <h1 className="text-xl font-bold text-blue-400">
                    🚀 My Dashboard
                  </h1>
                </div>

                {/* 메뉴 목록 */}
                <nav className="flex-1 p-4 space-y-2">
                  <Link
                    href="/"
                    className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
                  >
                    📊 <span>홈 (Dashboard)</span>
                  </Link>
                  <Link
                    href="/ai"
                    className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
                  >
                    🤖 <span>AI 챗봇</span>
                  </Link>
                  <Link
                    href="/logs"
                    className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
                  >
                    📝 <span>시스템 로그</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
                  >
                    ⚙️ <span>설정</span>
                  </Link>
                </nav>

                {/* 하단 상태 표시 */}
                <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
                  Server Status:{" "}
                  <span className="text-green-400 font-bold">Online ●</span>
                </div>
              </aside>

              {/* 2. 오른쪽 메인 콘텐츠 영역 */}
              <main className="flex-1 flex flex-col overflow-y-auto">
                {/* 상단 헤더 */}
                <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-8 shrink-0">
                  <h2 className="text-lg font-semibold">Dashboard Overview</h2>
                  <UserMenu />
                </header>

                {/* 실제 페이지 내용이 들어가는 곳 */}
                <div className="p-8">{children}</div>
              </main>
            </div>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
