"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // DB 연동 필수 훅
import { aiApi } from "@/services/api";
import ReactMarkdown from "react-markdown"; // 마크다운
import remarkGfm from "remark-gfm";

export default function AiChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // ✅ 1. DB에서 채팅 기록 불러오기 (부활!)
  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: aiApi.getHistory,
    // 데이터가 없을 때 안내 문구 추가
    select: (data) => {
      if (!data || data.length === 0) {
        return [
          {
            role: "bot",
            text: "안녕하세요! 저는 기억력이 있는 **Gemini AI**입니다. \n\n무엇을 도와드릴까요?",
          },
        ];
      }
      return data;
    },
  });

  // 스크롤 자동 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [history]); // 기록이 로드되거나 갱신되면 스크롤

  // ✅ 2. 메시지 전송 (DB 저장 및 목록 갱신)
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(message),
    onSuccess: (data) => {
      // 전송 성공 시 'chatHistory'를 상하게 만들어서(invalidate) 다시 받아오게 함
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error) => {
      console.error("Chat Error:", error);
      alert("서버 연결 실패!");
    },
  });

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // 일단 서버로 보냄 (화면 갱신은 DB가 처리)
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const isLoading = sendMessageMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🤖 AI Assistant
        </h2>
        <div className="flex items-center gap-2">
          {isHistoryLoading && (
            <span className="text-xs text-yellow-500 animate-pulse">
              Loading...
            </span>
          )}
          <span className="text-xs text-green-400 border border-green-400 px-2 py-0.5 rounded-full">
            DB Connected
          </span>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ✅ history 데이터를 화면에 뿌림 (messages 상태 대신 사용) */}
        {history.map((msg: any, idx: number) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-lg text-sm leading-relaxed overflow-hidden ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-200 rounded-tl-none"
              }`}
            >
              {/* ✅ 마크다운 적용 */}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                      <div className="my-2 bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-600">
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      </div>
                    ) : (
                      <code
                        className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-yellow-300"
                        {...rest}
                      >
                        {children}
                      </code>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc ml-4 my-2 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-4 my-2 space-y-1">
                      {children}
                    </ol>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      className="text-blue-300 hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {/* 로딩 표시 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse">
              Gemini가 생각 중입니다... 🧠
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
