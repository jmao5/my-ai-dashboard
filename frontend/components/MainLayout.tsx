"use client";

import { useState } from "react";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import { usePathname } from "next/navigation";
import FloatingButton from "@/components/common/FloatingButton";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 로그인 페이지면 껍데기 없이 내용만 리턴
  if (isLoginPage) {
    return <main className="h-screen w-full bg-gray-900">{children}</main>;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* 모바일 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 사이드바 */}
      <aside
        className={`
        fixed md:relative z-50 h-full w-64 bg-gray-800 flex flex-col border-r border-gray-700 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0
      `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">🚀 ServerBot</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
          >
            📊 <span>홈 (Dashboard)</span>
          </Link>
          <Link
            href="/ai"
            onClick={() => setIsSidebarOpen(false)}
            className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
          >
            🤖 <span>AI 챗봇</span>
          </Link>
          <Link
            href="/logs"
            onClick={() => setIsSidebarOpen(false)}
            className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
          >
            📝 <span>시스템 로그</span>
          </Link>
          <Link
            href="/nasdaq"
            onClick={() => setIsSidebarOpen(false)}
            className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"
          >
            📈 <span>나스닥 관제</span>
          </Link>
          {/*<Link*/}
          {/*  href="/settings"*/}
          {/*  onClick={() => setIsSidebarOpen(false)}*/}
          {/*  className="block px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2"*/}
          {/*>*/}
          {/*  ⚙️ <span>설정</span>*/}
          {/*</Link>*/}
        </nav>
        <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
          Status: <span className="text-green-400 font-bold">Online ●</span>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full relative scroll-smooth">
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold truncate">Dashboard</h2>
          </div>
          <UserMenu />
        </header>

        <div className="p-4 md:p-8">{children}</div>
      </main>

      <FloatingButton />
    </div>
  );
}
