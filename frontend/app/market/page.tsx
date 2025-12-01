"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import { toast } from "sonner";
import ChartCard from "@/components/ChartCard";
import { useTitle } from "@/hooks/useTitle";

export default function MarketPage() {
  useTitle("글로벌 마켓");

  const queryClient = useQueryClient();
  const [thresholdInput, setThresholdInput] = useState<string>("");

  // 차트 목록
  const charts = [
    { title: "NASDAQ 100 (Futures)", symbol: "NQ=F" },
    { title: "S&P 500 (Futures)", symbol: "ES=F" },
    { title: "Bitcoin (USD)", symbol: "BTC-USD" },
    { title: "USD/KRW Exchange Rate", symbol: "KRW=X" },
  ];

  // 알림 설정 데이터
  const { data: setting } = useQuery({
    queryKey: ["marketSetting"],
    queryFn: marketApi.getSetting,
  });

  // 설정 저장 Mutation
  const settingMutation = useMutation({
    mutationFn: (vars: { val: number; active: boolean }) =>
      marketApi.updateSetting(vars.val, vars.active),
    onSuccess: (_, variables) => {
      toast.success("설정이 업데이트되었습니다! 🔔", {
        description: `기준: ±${variables.val}%, 상태: ${variables.active ? "ON" : "OFF"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["marketSetting"] });
    },
    onError: () => toast.error("설정 저장 실패"),
  });

  const handleSave = () => {
    const val = parseFloat(thresholdInput);
    if (isNaN(val) || val <= 0) {
      toast.warning("0보다 큰 숫자를 입력해주세요.");
      return;
    }
    const active = setting?.is_active ?? true;
    settingMutation.mutate({ val, active });
  };

  const toggleActive = () => {
    if (!setting) return;
    const newVal = setting.threshold;
    const newActive = !setting.is_active;
    settingMutation.mutate({ val: newVal, active: newActive });
  };

  // 현재 상태 변수
  const isAlertOn = setting?.is_active ?? true;
  const currentThreshold = setting?.threshold ?? 1.0;

  return (
    <div className="space-y-8 pb-8">
      {/* 1. 페이지 타이틀 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🌍 Global Market
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            주요 지수 및 환율 실시간 모니터링 & 변동성 감지
          </p>
        </div>
      </div>

      {/* 2. [위로 이동됨] 변동성 알림 제어 패널 */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden group">
        {/* 배경 장식 효과 */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full transition-opacity duration-500 ${isAlertOn ? "opacity-100" : "opacity-0"}`}
        ></div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* 왼쪽: 설명 및 상태 표시 */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner transition-colors duration-300 ${isAlertOn ? "bg-blue-500/20 text-blue-400" : "bg-gray-700/50 text-gray-500"}`}
            >
              {isAlertOn ? "🔔" : "🔕"}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                나스닥 변동성 알림
                {/* 상태 배지 */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${isAlertOn ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-700 text-gray-400 border-gray-600"}`}
                >
                  {isAlertOn ? "Active" : "Inactive"}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                전일 종가 대비{" "}
                <span className="text-blue-300 font-medium">
                  ±{currentThreshold}%
                </span>{" "}
                이상 급등락 시 텔레그램 발송
              </p>
            </div>
          </div>

          {/* 오른쪽: 컨트롤러 */}
          <div className="flex items-center gap-3 w-full md:w-auto bg-gray-950/50 p-2 rounded-xl border border-gray-700/50">
            {/* 입력창 그룹 */}
            <div className="flex items-center gap-2 px-3 border-r border-gray-700/50">
              <span className="text-xs text-gray-500 font-medium">기준(%)</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  ±
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={currentThreshold.toString()}
                  value={thresholdInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "" && parseFloat(val) < 0) return;
                    setThresholdInput(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") {
                      e.preventDefault();
                    }
                  }}
                  className="w-20 bg-gray-800 text-white text-sm font-bold border border-gray-600 rounded-lg py-1.5 pl-6 pr-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-center"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={settingMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>

            {/* ON/OFF 토글 버튼 */}
            <div className="px-2">
              <button
                onClick={toggleActive}
                disabled={settingMutation.isPending}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${isAlertOn ? "bg-green-600" : "bg-gray-600"}`}
                title={isAlertOn ? "알림 끄기" : "알림 켜기"}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isAlertOn ? "translate-x-6" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 차트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <ChartCard
            key={chart.symbol}
            title={chart.title}
            symbol={chart.symbol}
          />
        ))}
      </div>
    </div>
  );
}
