import { create } from "zustand";
import { createRef, RefObject } from "react";

interface ScrollState {
  // DOM 요소를 담을 Ref 객체들
  mainRef: RefObject<HTMLDivElement | null>;
  customRef: RefObject<HTMLDivElement | null>;

  // 액션
  scrollToTop: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  // 1. 스토어 생성 시 Ref 객체를 미리 만들어둡니다.
  // (React 컴포넌트 외부에서도 Ref 객체 자체는 존재할 수 있습니다)
  mainRef: createRef<HTMLDivElement>(),
  customRef: createRef<HTMLDivElement>(),

  // 2. 스크롤 로직 (Context에 있던 것과 동일)
  scrollToTop: () => {
    const { mainRef, customRef } = get();

    // 1순위: 커스텀 영역 (예: AI 채팅창)
    if (customRef.current) {
      console.log("⬆️ Custom 영역 스크롤 (Zustand)");
      customRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    // 2순위: 메인 레이아웃 영역
    else if (mainRef.current) {
      console.log("⬆️ Main 영역 스크롤 (Zustand)");
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    // 3순위: 비상용 Window
    else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
}));
