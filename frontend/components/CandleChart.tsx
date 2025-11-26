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

// 캔들스틱 그리는 커스텀 함수
const CandlestickShape = (props: any) => {
  // 🚨 [핵심 수정] Y축 데이터가 아직 준비 안 됐으면 아무것도 안 그림 (에러 방지)
  if (!props.yAxis || !props.yAxis.scale) {
    return null;
  }

  const { x, width, yAxis, payload } = props;

  // 데이터가 payload 안에 들어있습니다.
  const { open, close, high, low } = payload;

  const isUp = close >= open;
  const color = isUp ? "#ef4444" : "#3b82f6"; // 빨강(상승), 파랑(하락)

  // Y축 스케일 함수 (값을 픽셀 좌표로 변환)
  const yScale = yAxis.scale;

  const yHigh = yScale(high);
  const yLow = yScale(low);
  const yOpen = yScale(open);
  const yClose = yScale(close);

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.abs(yOpen - yClose) || 1; // 최소 1px

  return (
    <g>
      {/* 꼬리 (Wick) */}
      <line
        x1={x + width / 2}
        y1={yHigh}
        x2={x + width / 2}
        y2={yLow}
        stroke={color}
        strokeWidth={1}
      />
      {/* 몸통 (Body) */}
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} />
    </g>
  );
};

// 커스텀 툴팁
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.close >= data.open;
    const color = isUp ? "text-red-400" : "text-blue-400";

    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs">
        <p className="text-gray-400 mb-1 font-bold">{data.time}</p>
        <div className="space-y-1">
          <p className={color}>시가: {data.open.toFixed(2)}</p>
          <p className={color}>종가: {data.close.toFixed(2)}</p>
          <p className="text-green-400">고가: {data.high.toFixed(2)}</p>
          <p className="text-red-400">저가: {data.low.toFixed(2)}</p>
          <p className="text-gray-500">
            거래량: {data.volume?.toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function CandleChart({ data }: { data: any[] }) {
  // 데이터가 없을 때 처리
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        데이터 없음
      </div>
    );
  }

  // Y축 범위 자동 계산 (여백 0.2%)
  const minValue = Math.min(...data.map((d) => d.low)) * 0.998;
  const maxValue = Math.max(...data.map((d) => d.high)) * 1.002;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
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
          domain={[minValue, maxValue]}
          stroke="#9CA3AF"
          fontSize={11}
          tick={{ fill: "#9CA3AF" }}
          tickFormatter={(val) => val.toFixed(0)}
          width={60} // Y축 너비 확보
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
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
