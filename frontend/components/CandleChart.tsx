"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// 커스텀 툴팁 (마우스 올렸을 때 상세 정보 표시)
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs z-50">
        <p className="text-gray-300 mb-2 font-bold border-b border-gray-700 pb-1">
          {data.time}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">현재가:</span>{" "}
          <span className="text-green-400 font-bold">
            {data.close.toFixed(2)}
          </span>
          <span className="text-gray-500">시가:</span>{" "}
          <span className="text-white">{data.open.toFixed(2)}</span>
          <span className="text-gray-500">고가:</span>{" "}
          <span className="text-red-400">{data.high.toFixed(2)}</span>
          <span className="text-gray-500">저가:</span>{" "}
          <span className="text-blue-400">{data.low.toFixed(2)}</span>
          <span className="text-gray-500">거래량:</span>{" "}
          <span className="text-gray-300">{data.volume?.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CandleChart({ data }: { data: any[] }) {
  // 데이터가 없을 때
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        데이터 수신 대기 중...
      </div>
    );
  }

  // Y축 스케일 자동 조정을 위한 최소/최대값 계산 (여백 0.05%)
  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices) * 0.9995;
  const maxPrice = Math.max(...prices) * 1.0005;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        {/* 배경 그라데이션 정의 */}
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#374151"
          vertical={false}
        />

        <XAxis
          dataKey="time"
          stroke="#9CA3AF"
          fontSize={11}
          tick={{ fill: "#9CA3AF" }}
          minTickGap={30}
        />

        <YAxis
          domain={[minPrice, maxPrice]}
          stroke="#9CA3AF"
          fontSize={11}
          tick={{ fill: "#9CA3AF" }}
          tickFormatter={(val) => val.toFixed(0)}
          width={60}
          allowDataOverflow={true}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* 캔들 대신 꽉 찬 영역 차트 (가장 안전한 방식) */}
        <Area
          type="monotone"
          dataKey="close"
          stroke="#10B981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPrice)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
