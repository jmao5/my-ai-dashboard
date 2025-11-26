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
  const { fill, x, width, yAxis, payload } = props;

  // 1. 데이터나 축 정보가 없으면 그리지 않음 (에러 방지)
  if (!yAxis || !yAxis.scale || !payload) {
    return null;
  }

  const { open, close, high, low } = payload;

  // 2. Y축 좌표 변환 함수 (값 -> 픽셀)
  const yScale = yAxis.scale;

  // 좌표 계산
  const yHigh = yScale(high);
  const yLow = yScale(low);
  const yOpen = yScale(open);
  const yClose = yScale(close);

  // 3. 상승/하락 색상 및 박스 크기 계산
  const isUp = close >= open;
  const candleColor = isUp ? "#ef4444" : "#3b82f6"; // 빨강(상승), 파랑(하락)

  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  let bodyHeight = bodyBottom - bodyTop;

  // 높이가 0이면(시가=종가) 최소 1px로 보여줌
  if (bodyHeight === 0) bodyHeight = 1;

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
        x={x}
        y={bodyTop}
        width={width}
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
  console.log("data", data);
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        데이터 없음
      </div>
    );
  }

  // 👇 [수정] 안전한 최소/최대값 계산
  // 데이터가 비정상적일 경우를 대비해 기본값 설정
  const lows = data.map((d) => d.low).filter((v) => v > 0); // 0보다 큰 값만
  const highs = data.map((d) => d.high).filter((v) => v > 0);

  // 데이터가 유효하지 않으면 기본 범위 설정
  const minValue = lows.length > 0 ? Math.min(...lows) * 0.998 : 0;
  const maxValue = highs.length > 0 ? Math.max(...highs) * 1.002 : 100;

  // domain이 [0, 0]이나 [Infinity, -Infinity]가 되지 않도록 방어
  const yDomain: [number, number] = [
    isFinite(minValue) ? minValue : ("auto" as any),
    isFinite(maxValue) ? maxValue : ("auto" as any),
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }} // 여백 조정
      >
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
          minTickGap={30} // 라벨 겹침 방지
        />

        <YAxis
          domain={yDomain} // 👈 수정된 domain 적용
          stroke="#9CA3AF"
          fontSize={11}
          tick={{ fill: "#9CA3AF" }}
          tickFormatter={(val) => val.toFixed(0)}
          width={60}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          isAnimationActive={false}
        />

        {/* Bar 컴포넌트에 dataKey로 'close'를 주되, 
            shape props에 우리가 만든 커스텀 함수를 전달하여 캔들을 그림 
        */}
        <Bar
          dataKey="close"
          shape={<CandlestickShape />}
          isAnimationActive={false} // 애니메이션 끔 (성능 최적화)
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
