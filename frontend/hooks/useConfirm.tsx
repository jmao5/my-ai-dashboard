import { useOverlay } from "@toss/use-overlay";
import { useRef } from "react";
import ConfirmModal from "@/components/common/ConfirmModal";

interface ConfirmOptions {
  title: string;
  description?: string;
}

export function useConfirm() {
  const overlay = useOverlay();
  // Promise의 resolve 함수를 저장할 ref
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const openConfirm = (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;

      overlay.open(({ isOpen, close }) => (
        <ConfirmModal
          isOpen={isOpen}
          close={close}
          title={options.title}
          description={options.description}
          onConfirm={() => {
            resolve(true);
            close();
          }}
          onCancel={() => {
            resolve(false);
            close();
          }}
        />
      ));
    });
  };

  return openConfirm;
}
