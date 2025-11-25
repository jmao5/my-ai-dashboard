"use client";

import { useQuery } from "@tanstack/react-query";
import { systemApi } from "@/services/api";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function SystemChart() {
  // 5초마다 데이터 갱신
  const { data = [] } = useQuery({
    queryKey: ["metricsHistory"],
    queryFn: systemApi.getHistory,
    refetchInterval: 5000,
  });

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-gray-400 text-sm font-medium">
          System Performance (Last 20 ticks)
        </h3>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1 text-blue-400">● CPU</span>
          <span className="flex items-center gap-1 text-purple-400">● RAM</span>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              fontSize={12}
              tick={{ fill: "#9CA3AF" }}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              domain={[0, 100]}
              tick={{ fill: "#9CA3AF" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                borderColor: "#374151",
                color: "#fff",
              }}
              itemStyle={{ color: "#fff" }}
            />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="#60A5FA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="ram"
              stroke="#A78BFA"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
