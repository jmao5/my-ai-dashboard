"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function FloatingButton() {
  const [isVisible, setIsVisible] = useState(false);
  // 현재 감지된 스크롤 타겟을 저장
  const targetRef = useRef<HTMLElement | Window | null>(null);
  const pathname = usePathname();

  // ✅ 스크롤 타겟 자동 탐지 및 리스너 등록
  useEffect(() => {
    // DOM 렌더링이 끝난 후 찾기 위해 약간의 지연(Time Yield)을 줌
    const timer = setTimeout(() => {
      // 1. 'overflow-y-auto' 클래스를 가진 모든 요소 검색
      const scrollables = document.querySelectorAll(".overflow-y-auto");

      // 2. 우선순위 결정:
      // - 요소가 있으면: 가장 마지막 요소 (가장 깊은 자식 = 채팅창, 로그창 등) 선택
      // - 없으면: window (전체 화면)
      const target =
        scrollables.length > 0
          ? (scrollables[scrollables.length - 1] as HTMLElement)
          : window;

      targetRef.current = target;

      console.log(
        "🎯 스크롤 타겟 자동 감지:",
        target === window ? "Window" : target,
      );

      // 3. 스크롤 핸들러 정의
      const handleScroll = () => {
        const currentScroll =
          target === window
            ? window.scrollY
            : (target as HTMLElement).scrollTop;

        // 높이 감지 (window는 innerHeight, 요소는 clientHeight)
        const viewHeight =
          target === window
            ? window.innerHeight
            : (target as HTMLElement).clientHeight;

        // 화면 높이의 30% 이상 내려가면 표시
        if (currentScroll > viewHeight * 0.3) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      };

      // 4. 리스너 등록
      target.addEventListener("scroll", handleScroll);
      handleScroll(); // 초기 상태 체크

      // 클린업: 페이지 이동 시 리스너 제거 (중요!)
      return () => {
        target.removeEventListener("scroll", handleScroll);
      };
    }, 100); // 0.1초 뒤 실행 (React 렌더링 대기)

    return () => clearTimeout(timer);
  }, [pathname]); // 페이지 바뀔 때마다 다시 탐색

  // ✅ 클릭 시 스크롤 올리기
  const scrollToTop = () => {
    const target = targetRef.current;
    if (target) {
      target.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
