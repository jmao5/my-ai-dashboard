"use client";

import { RefObject, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function FloatingButton({
  scrollTargetRef,
}: {
  scrollTargetRef: RefObject<HTMLDivElement | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // 스크롤 맨 위로 이동
  const scrollToTop = () => {
    const target = scrollTargetRef.current;

    console.log("🖱️ 스크롤 시도!");
    console.log("1. Ref 상태:", target);

    if (target) {
      console.log("2. Ref 요소의 스크롤 위치:", target.scrollTop);

      // Ref 요소 스크롤 시도
      if (target.scrollTop > 0) {
        console.log("✅ Ref 요소(Main)를 스크롤합니다.");
        target.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Ref는 잡혔는데 스크롤이 0이라면? -> Window가 스크롤 되고 있을 확률 높음
        console.log(
          "⚠️ Ref 요소 스크롤이 0입니다. Window 스크롤을 시도합니다.",
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      // Ref가 아예 안 잡힘
      console.error("❌ Ref가 null입니다! (연결 실패)");
      // 비상용: 그냥 화면 전체 스크롤
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setIsOpen(false);
  };

  // 페이지 이동
  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  // 메뉴 아이템 설정
  const menuItems = [
    { label: "Top", icon: "⬆️", onClick: scrollToTop, color: "bg-gray-700" },
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
      {/* 펼쳐지는 메뉴들 */}
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
                {/* 라벨 (마우스 올리면 보임) */}
                <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.label}
                </span>
                {/* 버튼 */}
                <button
                  className={`${item.color} w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg hover:brightness-110 transition`}
                >
                  {item.icon}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 메인 토글 버튼 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-colors duration-300 ${
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
