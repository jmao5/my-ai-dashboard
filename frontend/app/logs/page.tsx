"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { systemApi } from "@/services/api";

export default function LogsPage() {
  // 유저가 직접 선택한 컨테이너 ID (초기값은 비어있음)
  const [selectedContainer, setSelectedContainer] = useState<string>("");

  // 1. 컨테이너 목록 가져오기
  const { data: containers = [] } = useQuery({
    queryKey: ["dockerContainers"],
    queryFn: systemApi.getContainers,
  });

  // ✅ [수정 핵심] useEffect 대신 '계산된 변수(Derived State)' 사용
  // 1) 유저가 선택한 게 있으면 그걸 쓰고,
  // 2) 없으면 'dash-core'를 찾아서 쓰고,
  // 3) 그것도 없으면 목록의 첫 번째를 씁니다.
  const defaultContainer =
    containers.find((c: any) => c.name === "dash-core") || containers[0];
  const activeContainerId = selectedContainer || defaultContainer?.id || "";

  // 2. 로그 가져오기 (activeContainerId 사용)
  const { data: logs = "Loading logs...", isLoading } = useQuery({
    queryKey: ["containerLogs", activeContainerId], // 👈 여기가 바뀌면 자동으로 다시 가져옴
    queryFn: () => systemApi.getLogs(activeContainerId),
    enabled: !!activeContainerId, // ID가 있을 때만 실행
    refetchInterval: 2000,
  });

  // 스크롤 자동 이동
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* 상단 헤더 & 선택기 */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📝 System Logs
        </h2>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Target:</span>
          <select
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            value={activeContainerId} // 👈 계산된 ID 사용
            onChange={(e) => setSelectedContainer(e.target.value)}
          >
            {containers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.state})
              </option>
            ))}
          </select>
          {/* 상태 표시 점 */}
          <span className="relative flex h-3 w-3 ml-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLoading ? "bg-yellow-400" : "bg-green-400"}`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${isLoading ? "bg-yellow-500" : "bg-green-500"}`}
            ></span>
          </span>
        </div>
      </div>

      {/* 터미널 창 */}
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
    </div>
  );
}
