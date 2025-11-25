"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export default function NasdaqPage() {
  const queryClient = useQueryClient();
  const [thresholdInput, setThresholdInput] = useState<string>("");

  // 1. 시장 데이터 (1분마다 갱신)
  const { data: prices = [] } = useQuery({
    queryKey: ["marketHistory"],
    queryFn: marketApi.getHistory,
    refetchInterval: 60000, // 1분
  });

  // 2. 설정 데이터
  const { data: setting } = useQuery({
    queryKey: ["marketSetting"],
    queryFn: marketApi.getSetting,
  });

  // 3. 설정 저장 Mutation
  const settingMutation = useMutation({
    mutationFn: (vars: { val: number; active: boolean }) =>
      marketApi.updateSetting(vars.val, vars.active),
    onSuccess: () => {
      toast.success("알림 설정이 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["marketSetting"] });
    },
    onError: () => toast.error("저장 실패"),
  });

  const handleSave = () => {
    const val = parseFloat(thresholdInput) || setting?.threshold;
    const active = setting?.is_active ?? true;
    settingMutation.mutate({ val, active });
  };

  const toggleActive = () => {
    if (!setting) return;
    settingMutation.mutate({
      val: setting.threshold,
      active: !setting.is_active,
    });
  };

  // 현재가 계산
  const currentPrice =
    prices.length > 0
      ? prices[prices.length - 1].price.toFixed(2)
      : "Loading...";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          📈 NASDAQ 100 Futures (NQ=F)
        </h1>
        <span className="text-3xl font-mono text-green-400 font-bold">
          ${currentPrice}
        </span>
      </div>

      {/* 차트 영역 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={prices}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              fontSize={12}
              tick={{ fill: "#9CA3AF" }}
            />
            <YAxis
              domain={["auto", "auto"]} // 값에 따라 자동으로 범위 조절
              stroke="#9CA3AF"
              fontSize={12}
              tick={{ fill: "#9CA3AF" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                borderColor: "#374151",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
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
                placeholder={setting?.threshold.toString()}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-center focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition"
              >
                저장
              </button>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-gray-600 mx-2"></div>

          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 mb-1">작동 상태</span>
            <button
              onClick={toggleActive}
              className={`px-3 py-1 rounded text-sm font-bold transition ${setting?.is_active ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
            >
              {setting?.is_active ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
