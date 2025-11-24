"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query"; // 👈 핵심 훅 임포트
import { aiApi } from "@/services/api";

export default function AiChatPage() {
  // 메시지 목록 상태 관리
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; text: string }[]
  >([
    {
      role: "bot",
      text: "안녕하세요! 저는 당신의 AI 비서입니다. 무엇을 도와드릴까요?",
    },
  ]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 스크롤 자동 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // ✨ TanStack Query Mutation 설정 (데이터 전송 전용)
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(message), // API 함수 연결
    onSuccess: (data) => {
      // 성공 시 봇의 응답을 메시지 목록에 추가
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    },
    onError: (error) => {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "죄송합니다. 서버 연결에 실패했습니다. 😢" },
      ]);
    },
  });

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // 1. 내 메시지 즉시 화면에 표시 (Optimistic UI)
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput(""); // 입력창 비우기

    // 2. 리액트 쿼리를 통해 서버로 전송
    sendMessageMutation.mutate(userMsg);
  };

  // 로딩 상태는 mutation 객체 안에 들어있습니다.
  const isLoading = sendMessageMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* 1. 헤더 */}
      <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🤖 AI Assistant
        </h2>
        <span className="text-xs text-green-400 border border-green-400 px-2 py-0.5 rounded-full">
          Online
        </span>
      </div>

      {/* 2. 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-200 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* 로딩 표시 (isPending 활용) */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse">
              답변 생각 중... 🤔
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. 입력창 영역 */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
