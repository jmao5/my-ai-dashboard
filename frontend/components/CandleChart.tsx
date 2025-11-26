"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// 캔들스틱 그리는 함수
const CandlestickShape = (props: any) => {
  const { x, y, width, height, yAxis, payload } = props;

  // 데이터가 없으면 그리지 않음
  if (!payload || !yAxis || !yAxis.scale) {
    return null;
  }

  const { open, close, high, low } = payload;

  // 데이터가 유효한지 한번 더 체크
  if (
    [open, close, high, low].some(
      (v) => v === undefined || v === null || isNaN(v),
    )
  ) {
    return null;
  }

  // Y축 좌표 변환 함수
  const yScale = yAxis.scale;

  const yHigh = yScale(high);
  const yLow = yScale(low);
  const yOpen = yScale(open);
  const yClose = yScale(close);

  // 좌표가 숫자가 아니면(NaN) 그리지 않음
  if ([yHigh, yLow, yOpen, yClose].some(isNaN)) return null;

  const isUp = close >= open;
  const candleColor = isUp ? "#ef4444" : "#3b82f6"; // 빨강(상승), 파랑(하락)

  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  let bodyHeight = bodyBottom - bodyTop;

  // 높이가 0이면 최소 1px
  if (bodyHeight < 1) bodyHeight = 1;

  // 🚨 [핵심 수정] 너비가 너무 좁으면 최소 3px로 강제 조정 (중앙 정렬 보정)
  const safeWidth = Math.max(width, 4);
  const safeX = x + (width - safeWidth) / 2;

  return (
    <g>
      {/* 꼬리 (세로선) */}
      <line
        x1={x + width / 2}
        y1={yHigh}
        x2={x + width / 2}
        y2={yLow}
        stroke={candleColor}
        strokeWidth={1}
      />
      {/* 몸통 (네모) */}
      <rect
        x={safeX}
        y={bodyTop}
        width={safeWidth}
        height={bodyHeight}
        fill={candleColor}
      />
    </g>
  );
};

// 툴팁 컴포넌트
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.close >= data.open;
    const colorClass = isUp ? "text-red-400" : "text-blue-400";

    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs z-50">
        <p className="text-gray-300 mb-2 font-bold border-b border-gray-700 pb-1">
          {data.time}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">시가:</span>{" "}
          <span className={colorClass}>{data.open.toFixed(2)}</span>
          <span className="text-gray-500">종가:</span>{" "}
          <span className={colorClass}>{data.close.toFixed(2)}</span>
          <span className="text-gray-500">고가:</span>{" "}
          <span className="text-green-400">{data.high.toFixed(2)}</span>
          <span className="text-gray-500">저가:</span>{" "}
          <span className="text-red-400">{data.low.toFixed(2)}</span>
          <span className="text-gray-500">거래량:</span>{" "}
          <span className="text-white">{data.volume?.toLocaleString()}</span>
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

  // Y축 범위 정밀 계산
  const allLows = data.map((d) => d.low).filter((v) => v > 0);
  const allHighs = data.map((d) => d.high).filter((v) => v > 0);

  // 데이터가 아직 로딩 안 됐을 때 방어
  if (allLows.length === 0) return null;

  const minVal = Math.min(...allLows);
  const maxVal = Math.max(...allHighs);
  const padding = (maxVal - minVal) * 0.1; // 10% 여백

  const minY = Math.floor(minVal - padding);
  const maxY = Math.ceil(maxVal + padding);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          type="number"
          domain={[minY, maxY]}
          stroke="#9CA3AF"
          fontSize={11}
          tick={{ fill: "#9CA3AF" }}
          tickFormatter={(val) => val.toFixed(0)}
          width={60}
          allowDataOverflow={true}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          isAnimationActive={false}
        />

        <Bar
          dataKey="close"
          shape={<CandlestickShape />}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
