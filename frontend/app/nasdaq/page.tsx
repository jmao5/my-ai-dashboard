"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
// 👇 캔들차트 임포트 (SSR 끄기 필수)
import dynamic from "next/dynamic";
const CandleChart = dynamic(() => import("@/components/CandleChart"), {
  ssr: false,
});
import { toast } from "sonner";

export default function NasdaqPage() {
  const queryClient = useQueryClient();
  const [thresholdInput, setThresholdInput] = useState<string>("");

  // 👇 [추가] 차트 설정 상태 (기본: 5분봉, 1일치)
  const [chartConfig, setChartConfig] = useState({
    interval: "5m",
    range: "1d",
  });

  // 1. 차트 데이터 가져오기 (설정이 바뀔 때마다 자동 갱신)
  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["marketChart", chartConfig],
    queryFn: () =>
      marketApi.getChartData(chartConfig.interval, chartConfig.range),
    refetchInterval: 60000, // 1분마다 갱신
  });

  // 2. 설정 데이터
  const { data: setting } = useQuery({
    queryKey: ["marketSetting"],
    queryFn: marketApi.getSetting,
  });

  const settingMutation = useMutation({
    mutationFn: (vars: { val: number; active: boolean }) =>
      marketApi.updateSetting(vars.val, vars.active),
    onSuccess: () => {
      toast.success("설정 저장 완료");
      queryClient.invalidateQueries({ queryKey: ["marketSetting"] });
    },
    onError: () => toast.error("저장 실패"),
  });

  // 버튼 핸들러들...
  const handleSave = () => {
    /* 기존 코드 */
    const val = parseFloat(thresholdInput) || setting?.threshold;
    const active = setting?.is_active ?? true;
    settingMutation.mutate({ val, active });
  };
  const toggleActive = () => {
    /* 기존 코드 */
    if (!setting) return;
    settingMutation.mutate({
      val: setting.threshold,
      active: !setting.is_active,
    });
  };

  const currentPrice =
    prices.length > 0 ? prices[prices.length - 1].close.toFixed(2) : "...";

  // 차트 탭 버튼 스타일
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
        {/* 차트 컨트롤러 (분봉/일봉 선택) */}
        <div className="flex gap-2 mb-4 border-b border-gray-700 pb-3">
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

        {/* 캔들 차트 */}
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

      {/* 알림 설정 패널 (기존 코드 유지) */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* ... (기존 알림 설정 UI 그대로 두세요) ... */}
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            🔔 변동성 알림 설정
          </h3>
          <p className="text-sm text-gray-400">전일 종가 대비 등락률 감시</p>
        </div>
        <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-600">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              placeholder={setting?.threshold.toString()}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-center"
            />
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              저장
            </button>
          </div>
          <button
            onClick={toggleActive}
            className={`px-3 py-1 rounded text-sm font-bold ${setting?.is_active ? "bg-green-600" : "bg-red-600"}`}
          >
            {setting?.is_active ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
