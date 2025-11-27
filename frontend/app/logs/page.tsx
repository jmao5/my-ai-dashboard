"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { aiApi, systemApi } from "@/services/api";
import { toast } from "sonner";
import { useModal } from "@/hooks/useModal";
import LogViewer from "@/components/LogViewer";

export default function LogsPage() {
  // 1. 상태 관리
  const [selectedContainer, setSelectedContainer] = useState<string>("");

  // 2. 공통 모달 훅 가져오기
  const { openModal } = useModal();

  // 3. 컨테이너 목록 조회
  const { data: containers = [] } = useQuery({
    queryKey: ["dockerContainers"],
    queryFn: systemApi.getContainers,
  });

  // 선택된 ID 계산 (유저 선택 -> dash-core -> 첫 번째 순서)
  const defaultContainer =
    containers.find((c: any) => c.name === "dash-core") || containers[0];
  const activeContainerId = selectedContainer || defaultContainer?.id || "";

  // 4. 실시간 로그 조회 (2초 간격)
  const { data: logs = "Loading logs...", isLoading } = useQuery({
    queryKey: ["containerLogs", activeContainerId],
    queryFn: () => systemApi.getLogs(activeContainerId),
    enabled: !!activeContainerId,
    refetchInterval: 2000,
  });

  // 로그 스크롤 자동 이동
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 5. AI 분석 Mutation
  const analyzeMutation = useMutation({
    mutationFn: aiApi.analyzeLog,
    onSuccess: async (data) => {
      // ✅ 성공 시 공통 모달 호출!
      // title과 content(컴포넌트)를 넘겨주면 됩니다.
      await openModal({
        title: "🩺 AI Log Doctor Report",
        content: <LogViewer content={data.reply} />,
        size: "lg",
      });
    },
    onError: () => {
      toast.error("분석 실패: 서버 상태를 확인해주세요.");
    },
  });

  // 분석 버튼 핸들러
  const handleAnalyze = () => {
    if (!logs || logs === "Loading logs...") {
      toast.warning("분석할 로그가 없습니다.");
      return;
    }

    // 로딩 토스트 표시하며 요청 시작
    toast.promise(analyzeMutation.mutateAsync(logs), {
      loading: "AI가 로그를 분석 중입니다... 🧠",
      success: "분석 완료! 결과를 확인하세요.",
      error: "분석 중 오류가 발생했습니다.",
    });
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col relative">
      {/* 상단 헤더 (컨트롤 바) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-800 p-4 rounded-xl border border-gray-700 gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📝 System Logs
        </h2>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={isLoading || analyzeMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-purple-900/20"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "🤖 AI 분석"}
          </button>

          {/* 타겟 선택 드롭다운 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 hidden md:inline">
              Target:
            </span>
            <select
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 transition max-w-[150px] truncate"
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
      </div>

      {/* 로그 터미널 창 */}
      <div className="flex-1 bg-[#0d1117] rounded-xl border border-gray-700 p-4 overflow-hidden shadow-2xl flex flex-col font-mono text-sm relative group">
        {/* 터미널 상단 장식 (맥OS 스타일) */}
        <div className="absolute top-3 right-4 flex gap-1.5 opacity-50 group-hover:opacity-100 transition">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>

        {/* 로그 텍스트 영역 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mt-2">
          {!activeContainerId ? (
            <div className="text-gray-500 flex h-full items-center justify-center">
              Waiting for container list...
            </div>
          ) : isLoading && logs === "Loading logs..." ? (
            <div className="text-gray-500 animate-pulse flex h-full items-center justify-center">
              Connection to Docker daemon...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-green-400/90 leading-relaxed font-medium selection:bg-green-900 selection:text-white">
              {logs || "No logs available."}
            </pre>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
