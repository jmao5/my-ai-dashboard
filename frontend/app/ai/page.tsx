"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useScrollStore } from "@/store/useScrollStore";

export default function AiChatPage() {
  const [input, setInput] = useState("");

  // 파일 업로드 알림 메시지를 잠깐 보여주기 위한 로컬 상태
  // (DB에는 저장 안 되고 화면에만 잠시 뜸)
  const [localSystemMsg, setLocalSystemMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // 파일 선택창 제어용

  const customRef = useScrollStore((state) => state.customRef);
  const queryClient = useQueryClient();

  // ✅ 1. DB에서 채팅 기록 불러오기 (실시간 동기화)
  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: aiApi.getHistory,
    select: (data) => {
      // 데이터가 비어있으면 안내 메시지 추가
      if (!data || data.length === 0) {
        return [
          {
            role: "bot",
            text: "안녕하세요! 저는 문서를 읽고 대화할 수 있는 **Gemini AI**입니다. \n\n📎 버튼을 눌러 파일을 업로드해보세요!",
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

  // 메시지가 오거나 로컬 알림이 뜨면 스크롤 내림
  useEffect(scrollToBottom, [history, localSystemMsg]);

  // ✅ 2. 메시지 전송 Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(message),
    onSuccess: () => {
      // 전송 성공 -> DB 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error) => {
      console.error("Chat Error:", error);
      alert("메시지 전송 실패!");
    },
  });

  // ✅ 3. 파일 업로드 Mutation (RAG)
  const uploadMutation = useMutation({
    mutationFn: aiApi.uploadFile,
    onSuccess: (data) => {
      // 성공 시 시스템 메시지 표시
      setLocalSystemMsg(`📂 ${data.message}\n(내용 미리보기: ${data.preview})`);
      // 3초 뒤에 알림 메시지 끄기
      setTimeout(() => setLocalSystemMsg(null), 5000);
    },
    onError: () =>
      alert("업로드 실패! 텍스트 파일(.txt, .md, .log 등)만 가능합니다."),
  });

  // 텍스트 전송 핸들러
  const handleSendMessage = () => {
    if (!input.trim()) return;
    sendMessageMutation.mutate(input);
    setInput("");
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
    // 같은 파일을 다시 선택할 수 있게 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = sendMessageMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* 1. 헤더 */}
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
            RAG Ready
          </span>
        </div>
      </div>

      {/* 2. 메시지 영역 */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        ref={customRef}
      >
        {/* (A) DB에서 가져온 대화 기록 */}
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

        {/* (B) 파일 업로드 알림 (임시 표시) */}
        {localSystemMsg && (
          <div className="flex justify-center">
            <div className="bg-gray-600/50 text-gray-300 text-xs px-3 py-1 rounded-full animate-fade-in">
              {localSystemMsg}
            </div>
          </div>
        )}

        {/* (C) 로딩 인디케이터 */}
        {(isLoading || uploadMutation.isPending) && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg rounded-tl-none text-gray-400 text-sm animate-pulse flex items-center gap-2">
              {uploadMutation.isPending
                ? "📂 문서를 읽는 중..."
                : "🧠 Gemini가 생각 중..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. 입력창 영역 */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        {/* 숨겨진 파일 인풋 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".txt,.md,.csv,.log,.json,.conf,.py,.js,.go" // 허용할 확장자들
        />

        <div className="flex gap-2">
          {/* 파일 업로드 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || isLoading}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 rounded-lg border border-gray-600 transition flex items-center justify-center disabled:opacity-50"
            title="문서 업로드 (RAG)"
          >
            {uploadMutation.isPending ? "⏳" : "📎"}
          </button>

          {/* 텍스트 입력창 */}
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
          />

          {/* 전송 버튼 */}
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
