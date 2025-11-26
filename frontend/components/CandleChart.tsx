"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

// 캔들스틱 그리는 커스텀 함수 (막대 + 위아래 꼬리)
const CandlestickShape = (props: any) => {
  const { x, y, width, height, open, close, high, low } = props;
  const isUp = close >= open;
  const color = isUp ? "#ef4444" : "#3b82f6"; // 한국식: 상승(빨강), 하락(파랑)
  // 미국식(상승 초록, 하락 빨강)을 원하시면 위 색상을 '#10B981' : '#EF4444' 로 바꾸세요.

  // Y축 스케일 비율 계산
  // (props의 y, height는 막대(body) 기준이므로 전체 꼬리 위치를 다시 계산해야 함)
  // Recharts가 내부적으로 계산해준 좌표를 역산하는 방식보다
  // stroke로 꼬리를 그리고, rect로 몸통을 그립니다.

  // Recharts에서 Custom Shape에 넘겨주는 props를 활용
  const { yAxis } = props;
  const yScale = yAxis.scale;

  const yHigh = yScale(high);
  const yLow = yScale(low);
  const yOpen = yScale(open);
  const yClose = yScale(close);

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.abs(yOpen - yClose) || 1; // 최소 1px 보장

  return (
    <g>
      {/* 꼬리 (Wick) - 고가와 저가를 잇는 선 */}
      <line
        x1={x + width / 2}
        y1={yHigh}
        x2={x + width / 2}
        y2={yLow}
        stroke={color}
        strokeWidth={1}
      />
      {/* 몸통 (Body) - 시가와 종가 사이 박스 */}
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} />
    </g>
  );
};

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.close >= data.open;
    const color = isUp ? "text-red-400" : "text-blue-400";

    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs">
        <p className="text-gray-400 mb-1">{data.time}</p>
        <p className={color}>시가: {data.open.toFixed(2)}</p>
        <p className={color}>종가: {data.close.toFixed(2)}</p>
        <p className="text-green-400">고가: {data.high.toFixed(2)}</p>
        <p className="text-red-400">저가: {data.low.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function CandleChart({ data }: { data: any[] }) {
  // Y축 범위 자동 계산 (차트가 너무 납작해지지 않게)
  const minValue = Math.min(...data.map((d) => d.low)) * 0.999;
  const maxValue = Math.max(...data.map((d) => d.high)) * 1.001;

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
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
        />

        {/* 바 차트를 캔들스틱 모양으로 변신시킴 */}
        <Bar
          dataKey="close" // 값 자체는 close를 쓰지만 shape에서 다 그림
          shape={<CandlestickShape />}
          isAnimationActive={false} // 깜빡임 방지
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
