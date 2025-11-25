"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query"; // useMutation 추가
import { systemApi, aiApi } from "@/services/api";
import ReactMarkdown from "react-markdown"; // 마크다운 렌더링용
import remarkGfm from "remark-gfm";

export default function LogsPage() {
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [showModal, setShowModal] = useState(false); // 모달 표시 여부
  const [analysisResult, setAnalysisResult] = useState(""); // 분석 결과 저장

  // 1. 컨테이너 목록
  const { data: containers = [] } = useQuery({
    queryKey: ["dockerContainers"],
    queryFn: systemApi.getContainers,
  });

  const defaultContainer =
    containers.find((c: any) => c.name === "dash-core") || containers[0];
  const activeContainerId = selectedContainer || defaultContainer?.id || "";

  // 2. 로그 가져오기
  const { data: logs = "Loading logs...", isLoading } = useQuery({
    queryKey: ["containerLogs", activeContainerId],
    queryFn: () => systemApi.getLogs(activeContainerId),
    enabled: !!activeContainerId,
    refetchInterval: 2000,
  });

  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showModal) {
      // 모달이 떠있을 땐 스크롤 방지
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showModal]);

  // 👇 3. AI 분석 Mutation
  const analyzeMutation = useMutation({
    mutationFn: aiApi.analyzeLog,
    onSuccess: (data) => {
      setAnalysisResult(data.reply);
    },
    onError: () => {
      setAnalysisResult("⚠️ 분석에 실패했습니다. 서버 상태를 확인해주세요.");
    },
  });

  const handleAnalyze = () => {
    if (!logs || logs === "Loading logs...") return;
    setShowModal(true);
    setAnalysisResult(""); // 결과 초기화
    analyzeMutation.mutate(logs); // 분석 요청 시작
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col relative">
      {/* 상단 헤더 */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📝 System Logs
        </h2>

        <div className="flex items-center gap-2">
          {/* 👇 [추가] AI 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={isLoading || analyzeMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition disabled:opacity-50 mr-2"
          >
            {analyzeMutation.isPending ? "분석 중... 🧠" : "🤖 AI 분석"}
          </button>

          <span className="text-sm text-gray-400">Target:</span>
          <select
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            value={activeContainerId}
            onChange={(e) => setSelectedContainer(e.target.value)}
          >
            {containers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 로그 창 */}
      <div className="flex-1 bg-black rounded-xl border border-gray-800 p-4 overflow-hidden shadow-2xl flex flex-col font-mono text-sm">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
          {!activeContainerId ? (
            <div className="text-gray-500">Waiting for container list...</div>
          ) : isLoading && logs === "Loading logs..." ? (
            <div className="text-gray-500 animate-pulse">
              Connection to Docker daemon...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-green-400 leading-relaxed">
              {logs || "No logs available."}
            </pre>
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* 👇 4. 분석 결과 모달 (Pop-up) */}
      {showModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 rounded-xl">
          <div className="bg-gray-800 w-full max-w-3xl max-h-[80%] flex flex-col rounded-2xl shadow-2xl border border-gray-600">
            {/* 모달 헤더 */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                🩺 AI Log Doctor Report
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 overflow-y-auto text-sm leading-relaxed text-gray-200">
              {analyzeMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="text-4xl animate-bounce">🔍</div>
                  <p className="text-gray-400">로그를 정밀 분석 중입니다...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-purple-300 mb-4 mt-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-blue-300 mb-3 mt-4">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-md font-bold text-green-300 mb-2 mt-3">
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-5 space-y-1 text-gray-300">
                          {children}
                        </ul>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-900 px-1 py-0.5 rounded text-yellow-300 font-mono text-xs">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto border border-gray-700 my-2">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {analysisResult}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
