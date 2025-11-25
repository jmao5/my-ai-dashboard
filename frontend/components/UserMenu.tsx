"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // 로그인 정보가 없으면 아무것도 안 보여줌
  if (!session) return null;

  return (
    <div className="relative">
      {/* 1. 유저 프로필 버튼 */}
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

      {/* 2. 드롭다운 메뉴 (로그아웃) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-700 mb-2 md:hidden">
            <p className="text-white font-bold">{session.user?.name}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition flex items-center gap-2"
          >
            🚪 로그아웃
          </button>
        </div>
      )}

      {/* 메뉴 닫기용 투명 배경 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}
