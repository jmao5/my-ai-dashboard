"use client";

import { useQuery } from "@tanstack/react-query"; // 👈 핵심
import { systemApi, aiApi } from "@/services/api";

export default function Home() {
  // 1. Go 시스템 데이터 (2초마다 자동 갱신)
  const { data: stats, isLoading: isSysLoading } = useQuery({
    queryKey: ["systemStatus"], // 이 이름으로 데이터를 캐싱함
    queryFn: systemApi.getStatus,
    refetchInterval: 5000,
  });

  // 2. AI 상태 데이터 (2초마다 자동 갱신)
  const { data: aiData, isLoading: isAiLoading } = useQuery({
    queryKey: ["aiStatus"],
    queryFn: aiApi.getStatus,
    refetchInterval: 5000,
  });

  // 로딩 상태 통합
  const loading = isSysLoading || isAiLoading;

  // 데이터가 없을 때 기본값 처리 (Safe Guard)
  const safeStats = stats || { cpu: 0, ram: 0 };
  const safeAiData = aiData || { status: "Check", message: "상태 확인 중..." };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 카드 1: 시스템 상태 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500 transition duration-300">
        <h3 className="text-gray-400 text-sm font-medium mb-2">
          System Health
        </h3>
        {loading ? (
          <div className="text-gray-500 animate-pulse">데이터 수신 중...</div>
        ) : (
          <>
            <div className="flex items-end space-x-2">
              <span className="text-4xl font-bold text-white">
                {safeStats.cpu}%
              </span>
              <span className="text-gray-500 mb-1">CPU</span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${safeStats.cpu}%` }}
              ></div>
            </div>
            <div className="mt-3 flex justify-between text-sm text-gray-400">
              <span>RAM</span>
              <span className="text-white">{safeStats.ram}%</span>
            </div>
          </>
        )}
      </div>

      {/* 카드 2: AI 엔진 상태 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-purple-500 transition duration-300">
        <h3 className="text-gray-400 text-sm font-medium mb-2">
          AI Engine Status
        </h3>
        <div className="flex items-center justify-between">
          <span
            className={`text-2xl font-bold ${safeAiData.status === "Online" ? "text-green-400" : "text-red-400"}`}
          >
            {safeAiData.status}
          </span>
          <span className="text-4xl animate-bounce">🤖</span>
        </div>
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300 leading-relaxed">
            {safeAiData.message}
          </p>
        </div>
      </div>

      {/* 카드 3: 퀵 링크 (기존 유지) */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h3 className="text-gray-400 text-sm font-medium mb-4">Quick Links</h3>
        <ul className="space-y-3">
          <li>
            <a
              href="https://github.com"
              target="_blank"
              className="flex items-center text-blue-400 hover:underline"
            >
              🔗 GitHub
            </a>
          </li>
          <li>
            <a
              href="http://sso.tplinkdns.com"
              target="_blank"
              className="flex items-center text-blue-400 hover:underline"
            >
              ⚙️ Router
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
