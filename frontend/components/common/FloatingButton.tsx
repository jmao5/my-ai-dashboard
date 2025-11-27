"use client";

import { motion } from "framer-motion";
import { useScrollStore } from "@/store/useScrollStore";

export default function FloatingButton() {
  // ✅ Zustand에서 스크롤 액션 가져오기
  const scrollToTop = useScrollStore((state) => state.scrollToTop);

  return (
    <motion.button
      onClick={scrollToTop}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white bg-gray-700 hover:bg-gray-600 border-2 border-white/10 transition-colors"
      title="맨 위로 이동"
    >
      {/* 깔끔한 화살표 아이콘 (SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className="w-7 h-7"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
        />
      </svg>
    </motion.button>
  );
}
