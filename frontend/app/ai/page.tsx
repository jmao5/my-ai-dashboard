"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/services/api";

// 👇 1. 마크다운 라이브러리 임포트
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AiChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; text: string }[]
  >([
    {
      role: "bot",
      text: "안녕하세요! 저는 **Gemini 2.5** 모델을 탑재한 AI입니다. \n\n무엇을 도와드릴까요?",
    },
  ]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(message),
    onSuccess: (data) => {
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
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    sendMessageMutation.mutate(userMsg);
  };

  const isLoading = sendMessageMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🤖 AI Assistant
        </h2>
        <span className="text-xs text-green-400 border border-green-400 px-2 py-0.5 rounded-full">
          Online
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed overflow-hidden ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-200 rounded-tl-none"
              }`}
            >
              {/* 👇 2. 기존 {msg.text}를 ReactMarkdown으로 교체 */}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // (1) 코드 블록 스타일링 (```코드```)
                  code(props) {
                    const { children, className, node, ...rest } = props;
                    // inline 코드가 아닐 경우 (블록 코드)
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                      <div className="my-2 bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-600">
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      </div>
                    ) : (
                      // 인라인 코드 (`코드`)
                      <code
                        className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-yellow-300"
                        {...rest}
                      >
                        {children}
                      </code>
                    );
                  },
                  // (2) 리스트 스타일링
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
                  // (3) 인용구 스타일링
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-500 pl-4 italic my-2 text-gray-400">
                      {children}
                    </blockquote>
                  ),
                  // (4) 링크 스타일링
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      className="text-blue-300 hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  // (5) 줄바꿈 (p 태그)
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

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse">
              Gemini가 답변을 작성 중입니다... ✍️
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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
