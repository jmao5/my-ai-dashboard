"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

// 시간 포맷팅 헬퍼 함수 (현재 시간 구하기용)
const getCurrentTime = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

export default function AiChatPage() {
  const [input, setInput] = useState("");
  const [localSystemMsg, setLocalSystemMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 1. DB 데이터 가져오기
  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: aiApi.getHistory,
    select: (data) => {
      if (!data || data.length === 0) {
        // 초기 안내 메시지에도 시간 추가
        return [
          {
            role: "bot",
            text: "안녕하세요! 저는 문서를 읽고 대화할 수 있는 **Gemini AI**입니다. \n\n📎 버튼을 눌러 파일을 업로드해보세요!",
            timestamp: getCurrentTime(),
          },
        ];
      }
      return data;
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [history, localSystemMsg]);

  // 2. 메시지 전송 Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error) => {
      console.error("Chat Error:", error);
      toast.error("메시지 전송 실패!");
    },
  });

  // 3. 파일 업로드 Mutation
  const uploadMutation = useMutation({
    mutationFn: aiApi.uploadFile,
    onSuccess: (data) => {
      setLocalSystemMsg(`📂 ${data.message}`);
      setTimeout(() => setLocalSystemMsg(null), 5000);
    },
    onError: () => toast.error("업로드 실패! 텍스트 파일만 가능합니다."),
  });

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // ✨ [UX 개선] 내가 보낸 메시지를 화면에 즉시 표시 (낙관적 업데이트 느낌)
    // 실제로는 DB 데이터가 오기 전까지 깜빡일 수 있으나, UX상 입력창 비우기가 우선
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              Syncing...
            </span>
          )}
          <span className="text-xs text-green-400 border border-green-400 px-2 py-0.5 rounded-full">
            Online
          </span>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        id="ai-scroll-area"
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
      >
        {history.map((msg: any, idx: number) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* 말풍선 */}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-lg text-sm leading-relaxed overflow-hidden shadow-md ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-gray-700 text-gray-200 rounded-tl-none"
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props;
                    return (
                      <div className="my-2 bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-600">
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      </div>
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

            {/* 👇 [추가] 타임스탬프 표시 */}
            <span
              className={`text-[10px] text-gray-500 mt-1 ${msg.role === "user" ? "mr-1" : "ml-1"}`}
            >
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* 시스템 알림 */}
        {localSystemMsg && (
          <div className="flex justify-center">
            <div className="bg-gray-600/50 text-gray-300 text-xs px-3 py-1 rounded-full animate-fade-in">
              {localSystemMsg}
            </div>
          </div>
        )}

        {/* 로딩바 */}
        {(isLoading || uploadMutation.isPending) && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse flex items-center gap-2 shadow-md">
              {uploadMutation.isPending
                ? "📂 문서를 읽는 중..."
                : "🧠 생각하는 중..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".txt,.md,.csv,.log,.json,.conf,.py,.js,.go"
        />

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || isLoading}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 rounded-lg border border-gray-600 transition flex items-center justify-center disabled:opacity-50"
            title="문서 업로드"
          >
            {uploadMutation.isPending ? "⏳" : "📎"}
          </button>

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
