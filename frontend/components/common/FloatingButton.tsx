"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useScrollStore } from "@/store/useScrollStore"; // 👈 Zustand 스토어 사용

export default function FloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // ✅ Zustand에서 스크롤 액션 가져오기
  // (이제 Props나 Context 없이 전역 상태에서 함수를 바로 꺼내 씁니다)
  const scrollToTop = useScrollStore((state) => state.scrollToTop);

  const handleScrollTop = () => {
    scrollToTop(); // 스크롤 실행
    setIsOpen(false); // 메뉴 닫기
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  // 메뉴 아이템 정의
  const menuItems = [
    {
      label: "Top",
      icon: "⬆️",
      onClick: handleScrollTop,
      color: "bg-gray-700",
    },
    {
      label: "Logs",
      icon: "📝",
      onClick: () => navigateTo("/logs"),
      color: "bg-green-600",
    },
    {
      label: "AI",
      icon: "🤖",
      onClick: () => navigateTo("/ai"),
      color: "bg-purple-600",
    },
    {
      label: "Home",
      icon: "🏠",
      onClick: () => navigateTo("/"),
      color: "bg-blue-600",
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* 펼쳐지는 서브 메뉴들 */}
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col gap-3 items-end mb-2">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 group cursor-pointer"
                onClick={item.onClick}
              >
                {/* 라벨 (마우스 호버 시 표시) */}
                <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-600">
                  {item.label}
                </span>
                {/* 원형 버튼 */}
                <button
                  className={`${item.color} w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg hover:brightness-110 transition border border-white/10`}
                >
                  {item.icon}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 메인 토글 버튼 (+ 모양) */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 border-2 border-white/10 ${
          isOpen
            ? "bg-gray-600 rotate-45"
            : "bg-gradient-to-r from-blue-500 to-purple-600"
        }`}
      >
        <span className="text-white">➕</span>
      </motion.button>
    </div>
  );
}
