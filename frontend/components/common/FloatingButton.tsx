"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollStore } from "@/store/useScrollStore";
import { usePathname } from "next/navigation";

export default function FloatingButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollToTop, mainRef, customRef } = useScrollStore();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      // 1. 스크롤 대상 식별
      // customRef(AI채팅) -> mainRef(메인) -> window(비상용) 순서
      const target =
        customRef.current || mainRef.current || document.documentElement;

      // 2. 현재 스크롤 위치 가져오기
      // window일 경우 scrollY, 일반 요소일 경우 scrollTop 사용
      const currentScroll =
        target === document.documentElement ? window.scrollY : target.scrollTop;

      // 3. 현재 화면(뷰포트)의 높이 가져오기
      const viewHeight =
        target === document.documentElement
          ? window.innerHeight
          : target.clientHeight;

      // 4. [핵심] 화면 높이의 30% 이상 내려갔을 때만 보이게 설정
      // (예: 화면 높이가 800px이면 240px 이상 스크롤 시 등장)
      const threshold = viewHeight * 0.3;

      if (currentScroll > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // 이벤트 리스너 부착 대상 찾기 (window는 addEventListener 사용)
    const scrollTarget = customRef.current || mainRef.current || window;

    // 스크롤 감지 시작
    scrollTarget.addEventListener("scroll", handleScroll);

    // 초기 상태 체크
    handleScroll();

    // 뒷정리
    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, mainRef, customRef]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full shadow-xl flex items-center justify-center bg-white text-black border border-gray-200 transition-colors hover:bg-gray-50"
          title="맨 위로 이동"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 15.75 7.5-7.5 7.5 7.5"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
