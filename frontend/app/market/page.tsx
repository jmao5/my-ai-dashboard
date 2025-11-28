"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import { toast } from "sonner";
import ChartCard from "@/components/ChartCard";
import { useTitle } from "@/hooks/useTitle";

// ✅ 표시할 차트 목록 정의
// 심볼 정보: ES=F(S&P500 선물), BTC-USD(비트코인), KRW=X(원달러 환율)
const charts = [
  { title: "NASDAQ 100 (Futures)", symbol: "NQ=F" },
  { title: "S&P 500 (Futures)", symbol: "ES=F" },
  { title: "Bitcoin (USD)", symbol: "BTC-USD" },
  { title: "USD/KRW Exchange Rate", symbol: "KRW=X" },
];

export default function MarketPage() {
  useTitle("글로벌 마켓");
  // 이름 변경 (나스닥 -> 마켓 대시보드)
  const queryClient = useQueryClient();
  const [thresholdInput, setThresholdInput] = useState<string>("");

  // --- 기존 알림 설정 로직 (나스닥 전용) 유지 ---
  const { data: setting } = useQuery({
    queryKey: ["marketSetting"],
    queryFn: marketApi.getSetting,
  });

  const settingMutation = useMutation({
    mutationFn: (vars: { val: number; active: boolean }) =>
      marketApi.updateSetting(vars.val, vars.active),
    onSuccess: (_, variables) => {
      toast.success("설정이 저장되었습니다! ✅", {
        description: `알림 기준: ${variables.val}%, 상태: ${variables.active ? "ON" : "OFF"}`,
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["marketSetting"] });
    },
    onError: (err) => {
      toast.error("설정 저장 실패 ❌", {
        description: "서버와 연결할 수 없습니다.",
      });
      console.error(err);
    },
  });

  const handleSave = () => {
    const val = parseFloat(thresholdInput);
    if (isNaN(val)) {
      toast.warning("올바른 숫자를 입력해주세요.");
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
    toast.info(newActive ? "알림이 켜졌습니다 🔔" : "알림이 꺼졌습니다 🔕");
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🌍 Global Market Dashboard
        </h1>
        <p className="text-gray-400 text-sm">
          나스닥, S&P500, 암호화폐 및 환율 실시간 모니터링
        </p>
      </div>

      {/* ✅ 차트 그리드 레이아웃 (핵심!) */}
      {/* grid-cols-1: 모바일에서 1열 */}
      {/* md:grid-cols-2: 태블릿/데스크톱(md 이상)에서 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <ChartCard
            key={chart.symbol}
            title={chart.title}
            symbol={chart.symbol}
          />
        ))}
      </div>

      {/* 하단: 나스닥 전용 알림 설정 패널 (기존 유지) */}
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            🔔 NASDAQ(NQ=F) 변동성 알림
          </h3>
          <p className="text-sm text-gray-400">
            나스닥 선물 전일 종가 대비 등락률 감시
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
