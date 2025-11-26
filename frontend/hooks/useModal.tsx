import { useOverlay } from "@toss/use-overlay";
import CommonModal from "@/components/common/CommonModal";
import { ReactNode } from "react";

interface OpenModalOptions {
  title: string;
  content: ReactNode; // 텍스트뿐만 아니라 컴포넌트도 받음
  size?: "md" | "lg" | "xl" | "full";
}

export function useModal() {
  const overlay = useOverlay();

  const openModal = ({ title, content, size = "lg" }: OpenModalOptions) => {
    return new Promise<boolean>((resolve) => {
      overlay.open(({ isOpen, close }) => (
        <CommonModal
          isOpen={isOpen}
          close={() => {
            close();
            resolve(false); // 닫으면 false 반환 (필요시 활용)
          }}
          title={title}
          size={size}
        >
          {content}
        </CommonModal>
      ));
    });
  };

  return { openModal, close: overlay.close };
}
