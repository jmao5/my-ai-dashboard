"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // useQueryClient 추가
import { aiApi } from "@/services/api";

export default function AiChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient(); // 데이터 갱신을 위해 필요

  // 1. DB에서 채팅 기록 불러오기 (useQuery)
  const { data: history = [] } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: aiApi.getHistory,
    // 처음 로딩될 때 기본 메시지 하나 추가해서 보여주기
    select: (data) => {
      if (data.length === 0) {
        return [
          {
            role: "bot",
            text: "안녕하세요! 저는 기억력이 생긴 AI 비서입니다.",
          },
        ];
      }
      return data;
    },
  });

  // 스크롤 자동 이동 (history가 바뀔 때마다)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // 2. 메시지 전송 (useMutation)
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(message),
    onSuccess: (data) => {
      // 성공하면 'chatHistory' 쿼리를 무효화 -> 자동으로 다시 fetch해서 화면 갱신
      // (이렇게 하면 내가 보낸 것과 AI 답장이 DB에서 다시 로드됨)
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error) => {
      console.error(error);
      alert("전송 실패!");
    },
  });

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // 낙관적 업데이트(Optimistic Update)를 하면 더 빠르지만,
    // 지금은 DB 저장을 확실히 보여주기 위해 전송 후 갱신 방식을 씁니다.
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const isLoading = sendMessageMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🤖 AI Assistant (DB 연동됨)
        </h2>
        <span className="text-xs text-green-400 border border-green-400 px-2 py-0.5 rounded-full">
          Connected
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* history 데이터를 그대로 뿌려줍니다 */}
        {history.map((msg: any, idx: number) => (
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
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse">
              저장 및 생각 중... 💾
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
