"use client";

import { useState, useRef, useEffect } from "react";
import { aiApi } from "@/services/api"; // 👈 API 서비스 사용

export default function AiChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; text: string }[]
  >([
    {
      role: "bot",
      text: "안녕하세요! 저는 당신의 AI 비서입니다. 무엇을 도와드릴까요?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      // 👇 Axios로 교체된 API 호출 (코드가 훨씬 짧아짐)
      const data = await aiApi.sendMessage(userMsg);

      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (error) {
      console.error("채팅 전송 실패:", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "죄송합니다. 서버 연결에 실패했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ... (HTML 부분은 기존과 100% 동일하므로 그대로 두셔도 됩니다) ...
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🤖 AI Assistant
        </h2>
        <span className="text-xs text-green-400 border border-green-400 px-2 py-0.5 rounded-full">
          Online
        </span>
      </div>

      {/* 메시지 목록 */}
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
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse">
              답변 생각 중... 🤔
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
