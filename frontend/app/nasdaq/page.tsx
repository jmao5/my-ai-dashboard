"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import dynamic from "next/dynamic";
import { toast } from "sonner"; // 👈 토스트 라이브러리 임포트

// 캔들차트 SSR 끄고 불러오기
const CandleChart = dynamic(() => import("@/components/CandleChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-gray-500 animate-pulse">
      차트 로딩 중...
    </div>
  ),
});

export default function NasdaqPage() {
  const queryClient = useQueryClient();
  const [thresholdInput, setThresholdInput] = useState<string>("");

  // 차트 설정 상태
  const [chartConfig, setChartConfig] = useState({
    interval: "5m",
    range: "1d",
  });

  // 1. 차트 데이터 가져오기
  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["marketChart", chartConfig],
    queryFn: () =>
      marketApi.getChartData(chartConfig.interval, chartConfig.range),
    refetchInterval: 60000,
  });

  // 2. 설정 데이터 가져오기
  const { data: setting } = useQuery({
    queryKey: ["marketSetting"],
    queryFn: marketApi.getSetting,
  });

  // 👇 3. [수정] 설정 저장 Mutation (토스트 적용)
  const settingMutation = useMutation({
    mutationFn: (vars: { val: number; active: boolean }) =>
      marketApi.updateSetting(vars.val, vars.active),
    onSuccess: (_, variables) => {
      // 저장 성공 시 토스트 띄우기
      toast.success("설정이 저장되었습니다! ✅", {
        description: `알림 기준: ${variables.val}%, 상태: ${variables.active ? "ON" : "OFF"}`,
        duration: 3000, // 3초간 표시
      });
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ["marketSetting"] });
    },
    onError: (err) => {
      // 실패 시 에러 토스트
      toast.error("설정 저장 실패 ❌", {
        description: "서버와 연결할 수 없습니다.",
      });
      console.error(err);
    },
  });

  // 저장 버튼 핸들러
  const handleSave = () => {
    const val = parseFloat(thresholdInput);

    // 입력값이 없거나 숫자가 아니면 경고
    if (isNaN(val)) {
      toast.warning("올바른 숫자를 입력해주세요.");
      return;
    }

    const active = setting?.is_active ?? true;

    // 로딩 토스트 (선택사항, 여기선 바로 mutation 호출)
    settingMutation.mutate({ val, active });
  };

  // ON/OFF 토글 핸들러
  const toggleActive = () => {
    if (!setting) return;
    const newVal = setting.threshold;
    const newActive = !setting.is_active;

    settingMutation.mutate({ val: newVal, active: newActive });

    // 토글 시에는 즉각적인 피드백을 위해 별도 메시지 (Mutation onSuccess에서 덮어씌워질 수 있음)
    toast.info(newActive ? "알림이 켜졌습니다 🔔" : "알림이 꺼졌습니다 🔕");
  };

  const currentPrice =
    prices.length > 0 ? prices[prices.length - 1].close.toFixed(2) : "...";

  // 탭 버튼 스타일
  const tabClass = (isActive: boolean) =>
    `px-3 py-1 text-xs rounded transition ${isActive ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          📈 NASDAQ 100 (NQ=F)
        </h1>
        <div className="text-right">
          <span className="text-3xl font-mono text-green-400 font-bold">
            ${currentPrice}
          </span>
          <div className="text-xs text-gray-500">Real-time Futures</div>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg h-[500px] flex flex-col">
        <div className="flex gap-2 mb-4 border-b border-gray-700 pb-3 overflow-x-auto">
          <button
            onClick={() => setChartConfig({ interval: "1m", range: "1d" })}
            className={tabClass(chartConfig.interval === "1m")}
          >
            1분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "5m", range: "1d" })}
            className={tabClass(chartConfig.interval === "5m")}
          >
            5분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "30m", range: "5d" })}
            className={tabClass(chartConfig.interval === "30m")}
          >
            30분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1d", range: "1mo" })}
            className={tabClass(chartConfig.interval === "1d")}
          >
            일봉 (1달)
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1wk", range: "3mo" })}
            className={tabClass(chartConfig.interval === "1wk")}
          >
            주봉 (3달)
          </button>
        </div>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500 animate-pulse">
              데이터 불러오는 중...
            </div>
          ) : (
            <CandleChart data={prices} />
          )}
        </div>
      </div>

      {/* 알림 설정 패널 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            🔔 변동성 알림 설정
          </h3>
          <p className="text-sm text-gray-400">
            전일 종가 대비 등락률이 설정값을 넘으면 텔레그램을 보냅니다.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-600">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">알림 기준 (±%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                placeholder={setting?.threshold?.toString() || "1.0"}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-center focus:border-blue-500 outline-none transition"
              />
              <button
                onClick={handleSave}
                disabled={settingMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50"
              >
                {settingMutation.isPending ? "저장..." : "저장"}
              </button>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-gray-600 mx-2"></div>

          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-1">작동 상태</span>
            <button
              onClick={toggleActive}
              disabled={settingMutation.isPending}
              className={`px-4 py-1.5 rounded text-sm font-bold transition shadow-lg ${setting?.is_active ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
            >
              {setting?.is_active ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
