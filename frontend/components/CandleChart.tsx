"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { commaizeNumber } from "@toss/utils"; // 숫자 포맷팅용 (없으면 toLocaleString 사용)

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
            {data.close?.toFixed(2)}
          </span>
          {/* 값이 있을 때만 렌더링 (null 체크) */}
          {data.ma5 && (
            <>
              <span className="text-yellow-400">MA5:</span>{" "}
              <span className="text-yellow-400">{data.ma5.toFixed(2)}</span>
            </>
          )}
          {data.ma20 && (
            <>
              <span className="text-purple-400">MA20:</span>{" "}
              <span className="text-purple-400">{data.ma20.toFixed(2)}</span>
            </>
          )}
          {data.ma60 && (
            <>
              <span className="text-green-500">MA60:</span>{" "}
              <span className="text-green-500">{data.ma60.toFixed(2)}</span>
            </>
          )}
          {data.ma120 && (
            <>
              <span className="text-orange-400">MA120:</span>{" "}
              <span className="text-orange-400">{data.ma120.toFixed(2)}</span>
            </>
          )}
          <div className="col-span-2 h-[1px] bg-gray-700 my-1"></div>
          <span className="text-gray-500">시가:</span>{" "}
          <span className="text-white">{data.open?.toFixed(2)}</span>
          <span className="text-gray-500">고가:</span>{" "}
          <span className="text-red-400">{data.high?.toFixed(2)}</span>
          <span className="text-gray-500">저가:</span>{" "}
          <span className="text-blue-400">{data.low?.toFixed(2)}</span>
          <span className="text-gray-500">거래량:</span>{" "}
          <span className="text-gray-300">{data.volume?.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CandleChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        데이터 수신 대기 중...
      </div>
    );
  }

  // 🚨 [핵심 수정] Y축 스케일 계산 로직 강화
  // 1. 모든 숫자 데이터(가격 + 이평선)를 하나의 배열로 모읍니다.
  // 2. null, undefined, NaN을 완벽하게 필터링합니다.
  const allValues = data
    .flatMap((d) => [d.close, d.ma5, d.ma20, d.ma60, d.ma120])
    .filter((v) => typeof v === "number" && !isNaN(v));

  // 데이터가 하나도 없으면(초기 로딩 등) 기본값 0, 100
  let minPrice = 0;
  let maxPrice = 100;

  if (allValues.length > 0) {
    minPrice = Math.min(...allValues) * 0.9995;
    maxPrice = Math.max(...allValues) * 1.0005;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
      >
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
        {/* 범례 표시 (선택사항) */}
        {/* <Legend verticalAlign="top" height={36} iconType="circle" /> */}

        {/* 1. 가격 영역 */}
        <Area
          type="monotone"
          dataKey="close"
          stroke="#10B981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPrice)"
          isAnimationActive={false}
          name="Price"
        />

        {/* 2. 이동평균선들 */}
        {/* connectNulls: 데이터가 중간에 비어도 선을 끊지 않고 이어줍니다 (중요!) */}

        {/* MA5 (노랑) */}
        <Line
          connectNulls
          type="monotone"
          dataKey="ma5"
          stroke="#FACC15"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="MA5"
        />

        {/* MA20 (보라) */}
        <Line
          connectNulls
          type="monotone"
          dataKey="ma20"
          stroke="#A78BFA"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="MA20"
        />

        {/* MA60 (초록) */}
        <Line
          connectNulls
          type="monotone"
          dataKey="ma60"
          stroke="#22C55E"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="MA60"
        />

        {/* MA120 (주황) */}
        <Line
          connectNulls
          type="monotone"
          dataKey="ma120"
          stroke="#FB923C"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="MA120"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
