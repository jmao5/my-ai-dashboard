"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemApi, aiApi } from "@/services/api";
import SystemChart from "@/components/SystemChart"; // 차트 컴포넌트

export default function Home() {
  const queryClient = useQueryClient();

  // 1. 시스템 상태 (2초마다 갱신)
  const { data: stats } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: systemApi.getStatus,
    refetchInterval: 2000,
  });

  // 2. AI 상태 (5초마다 갱신)
  const { data: aiData } = useQuery({
    queryKey: ["aiStatus"],
    queryFn: aiApi.getStatus,
    refetchInterval: 5000,
  });

  // 3. 도커 컨테이너 목록 (3초마다 갱신)
  const { data: containers = [] } = useQuery({
    queryKey: ["dockerContainers"],
    queryFn: systemApi.getContainers,
    refetchInterval: 3000,
  });

  // 4. 컨테이너 재시작 Mutation
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

  // 👇 5. [추가] 스트레스 테스트 버튼 핸들러
  const handleStressTest = async () => {
    if (
      confirm("⚠️ 주의: 5초간 CPU 부하를 유발하여 알림을 테스트하시겠습니까?")
    ) {
      try {
        await systemApi.triggerStress();
        alert("🔥 부하 테스트 시작! 텔레그램을 확인하세요.");
      } catch (error) {
        console.error(error);
        alert("요청 실패");
      }
    }
  };

  // 데이터 안전 가드
  const safeStats = stats || { cpu: 0, ram: 0 };
  const safeAiData = aiData || { status: "Check", message: "상태 확인 중..." };

  return (
    <div className="space-y-8">
      {/* --- 상단 위젯 영역 --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 카드 1: 시스템 상태 & 테스트 버튼 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-400 text-sm font-medium">System Health</h3>
            {/* 👇 여기에 테스트 버튼 추가! */}
            <button
              onClick={handleStressTest}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition animate-pulse"
              title="알림 시스템 테스트용 CPU 부하 유발"
            >
              🔥 알림 테스트
            </button>
          </div>

          <div className="flex items-end space-x-2 mt-4">
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
            <span>RAM Usage</span>
            <span className="text-white">{safeStats.ram}%</span>
          </div>
        </div>

        {/* 카드 2: AI 상태 */}
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
            <p className="text-sm text-gray-300 leading-relaxed truncate">
              {safeAiData.model
                ? `Model: ${safeAiData.model}`
                : safeAiData.message}
            </p>
          </div>
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
                className="flex items-center text-blue-400 hover:underline"
              >
                🏠 대시보드 홈
              </a>
            </li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                className="flex items-center text-blue-400 hover:underline"
              >
                🔗 GitHub 저장소
              </a>
            </li>
            <li>
              <a
                href="http://sso.tplinkdns.com"
                target="_blank"
                className="flex items-center text-blue-400 hover:underline"
              >
                ⚙️ 공유기 설정
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* --- 중단: 차트 영역 (Recharts) --- */}
      <SystemChart />

      {/* --- 하단: 도커 관리 패널 --- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            🐳 Container Management
          </h3>
          <span className="text-xs text-gray-400">Auto Refresh (3s)</span>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300 min-w-[600px]">
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
                        className="text-yellow-400 hover:text-yellow-300 font-medium disabled:opacity-50 transition"
                      >
                        {restartMutation.isPending ? "Wait..." : "🔄 Restart"}
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
