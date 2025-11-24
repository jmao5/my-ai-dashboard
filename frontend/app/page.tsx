"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemApi, aiApi } from "@/services/api";

export default function Home() {
  const queryClient = useQueryClient();

  // 기존 쿼리들...
  const { data: stats } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: systemApi.getStatus,
    refetchInterval: 10000,
  });

  const { data: aiData } = useQuery({
    queryKey: ["aiStatus"],
    queryFn: aiApi.getStatus,
    refetchInterval: 30000, // AI 상태는 좀 천천히
  });

  // 👇 1. 도커 컨테이너 목록 쿼리 (3초마다 갱신)
  const { data: containers = [] } = useQuery({
    queryKey: ["dockerContainers"],
    queryFn: systemApi.getContainers,
    refetchInterval: 20000,
  });

  // 👇 2. 재시작 Mutation
  const restartMutation = useMutation({
    mutationFn: systemApi.restartContainer,
    onSuccess: () => {
      alert("재시작 명령을 보냈습니다. 잠시 후 상태가 변경됩니다.");
      queryClient.invalidateQueries({ queryKey: ["dockerContainers"] });
    },
    onError: (err) => {
      alert("재시작 실패: " + err);
    },
  });

  const handleRestart = (id: string, name: string) => {
    if (confirm(`정말 '${name}' 컨테이너를 재시작하시겠습니까?`)) {
      restartMutation.mutate(id);
    }
  };

  const safeStats = stats || { cpu: 0, ram: 0 };
  const safeAiData = aiData || { status: "Check", message: "상태 확인 중..." };

  return (
    <div className="space-y-8">
      {" "}
      {/* 세로 간격 추가 */}
      {/* --- 상단 위젯 영역 (기존 코드) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 카드 1: 시스템 상태 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          {/* ... 기존 내용 (CPU/RAM) ... */}
          <h3 className="text-gray-400 text-sm font-medium mb-2">
            System Health
          </h3>
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
        </div>

        {/* 카드 2: AI 상태 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          {/* ... 기존 내용 ... */}
          <h3 className="text-gray-400 text-sm font-medium mb-2">
            AI Engine Status
          </h3>
          <div className="flex items-center justify-between">
            <span
              className={`text-2xl font-bold ${safeAiData.status === "Online" ? "text-green-400" : "text-red-400"}`}
            >
              {safeAiData.status}
            </span>
            <span className="text-4xl">🧠</span>
          </div>
          <p className="mt-4 text-sm text-gray-400">{safeAiData.message}</p>
        </div>

        {/* 카드 3: 퀵 링크 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-4">
            Quick Links
          </h3>
          <ul className="space-y-3">
            <li>
              <a
                href="http://sso.tplinkdns.com:9014"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                🏠 대시보드 홈
              </a>
            </li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                🔗 GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
      {/* --- 하단: 도커 관리 패널 (New!) --- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            🐳 Container Management
          </h3>
          <span className="text-xs text-gray-400">Auto Refresh (3s)</span>
        </div>

        <div className="p-0">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">State</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {containers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    컨테이너 정보를 불러오는 중...
                  </td>
                </tr>
              ) : (
                containers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 font-medium text-white">
                      {c.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${c.state === "running" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
                      >
                        {c.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{c.status}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRestart(c.id, c.name)}
                        disabled={restartMutation.isPending}
                        className="text-yellow-400 hover:text-yellow-300 font-medium disabled:opacity-50"
                      >
                        🔄 Restart
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
