"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  isOpen: boolean;
  close: () => void;
  title: string; // 모달 제목
  children: ReactNode; // 모달 안에 들어갈 내용 (무엇이든 가능)
  size?: "md" | "lg" | "xl" | "full"; // 사이즈 조절용
}

export default function CommonModal({
  isOpen,
  close,
  title,
  children,
  size = "lg",
}: Props) {
  // 사이즈별 너비 설정
  const maxWidthClass = {
    md: "max-w-md",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw]",
  }[size];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          {/* 1. 배경 (Backdrop) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* 2. 모달 컨테이너 */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`relative bg-gray-800 w-full ${maxWidthClass} max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-gray-600 overflow-hidden`}
          >
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {title}
              </h3>
              <button
                onClick={close}
                className="text-gray-400 hover:text-white text-2xl leading-none p-1 rounded hover:bg-gray-700 transition"
              >
                &times;
              </button>
            </div>

            {/* 바디 (스크롤 가능 영역) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {children}
            </div>

            {/* 푸터 (선택사항: 닫기 버튼 등) */}
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 shrink-0 flex justify-end">
              <button
                onClick={close}
                className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg transition font-medium"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
