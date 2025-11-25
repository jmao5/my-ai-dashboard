"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session) return null;

  // 👇 [수정] 강력한 로그아웃 함수
  const handleLogout = async () => {
    // 1. NextAuth 내부 로그아웃 처리 (redirect: false로 막음)
    await signOut({ redirect: false });

    // 2. 브라우저 강제 새로고침 이동 (캐시 날리기)
    // 이렇게 해야 로그인 페이지로 갈 때 새 토큰을 받아옵니다.
    window.location.href = "/login";
  };

  return (
    <div className="relative">
      {/* 프로필 버튼 (기존 유지) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 focus:outline-none hover:bg-gray-700 p-2 rounded-lg transition"
      >
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-white">
            {session.user?.name || "Admin"}
          </p>
          <p className="text-xs text-gray-400">{session.user?.email}</p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-gray-600">
          {session.user?.name?.[0] || "A"}
        </div>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-700 mb-2 md:hidden">
            <p className="text-white font-bold">{session.user?.name}</p>
          </div>

          {/* 👇 [수정] onClick 핸들러 교체 */}
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition flex items-center gap-2"
          >
            🚪 로그아웃
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}
