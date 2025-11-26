"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  close: () => void;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  close,
  title,
  description,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          {/* 1. 검은 배경 (클릭 시 닫힘) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* 2. 모달 창 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              {description && (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <div className="flex border-t border-gray-700">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 text-sm font-medium text-gray-400 hover:bg-gray-700 transition active:bg-gray-600"
              >
                취소
              </button>
              <div className="w-[1px] bg-gray-700"></div>
              <button
                onClick={onConfirm}
                className="flex-1 py-3.5 text-sm font-bold text-red-400 hover:bg-red-900/20 transition active:bg-red-900/40"
              >
                확인
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
