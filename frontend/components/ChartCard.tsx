"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import dynamic from "next/dynamic";
import { commaizeNumber } from "@toss/utils";

// 캔들차트 동적 임포트 (SSR 방지)
const CandleChart = dynamic(() => import("@/components/CandleChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-gray-500 animate-pulse text-sm">
      차트 로딩 중...
    </div>
  ),
});

interface Props {
  title: string; // 예: "NASDAQ 100"
  symbol: string; // 예: "NQ=F"
}

export default function ChartCard({ title, symbol }: Props) {
  // 각 카드별로 독립적인 차트 설정 상태 관리
  const [chartConfig, setChartConfig] = useState({
    interval: "5m",
    range: "1d",
  });

  // 데이터 페칭 (쿼리키를 심볼별로 다르게 설정)
  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["marketChart", symbol, chartConfig], // 👈 심볼을 키에 추가!
    queryFn: () =>
      marketApi.getChartData(symbol, chartConfig.interval, chartConfig.range),
    refetchInterval: 60000, // 1분마다 갱신
  });

  // 현재가 계산
  const lastPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  // 소수점 처리 (환율은 2자리, 나머지는 상황에 맞게)
  const fixedPrice =
    symbol === "KRW=X"
      ? lastPrice.toFixed(2)
      : lastPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const currentPriceStr = commaizeNumber(fixedPrice);

  // 탭 버튼 스타일 함수
  const tabClass = (isActive: boolean) =>
    `px-2 py-1 text-xs rounded transition ${isActive ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`;

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[400px]">
      {/* 헤더: 제목 및 현재가 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{symbol}</p>
        </div>
        <div className="text-right">
          <span
            className={`text-xl font-mono font-bold ${lastPrice > 0 ? "text-green-400" : "text-gray-400"}`}
          >
            {symbol === "KRW=X" ? "₩" : "$"}
            {currentPriceStr}
          </span>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 기간 선택 탭 */}
        <div className="flex gap-2 mb-2 border-b border-gray-700 pb-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setChartConfig({ interval: "1m", range: "1d" })}
            className={tabClass(chartConfig.interval === "1m")}
          >
            1분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "5m", range: "1d" })}
            className={tabClass(chartConfig.interval === "5m")}
          >
            5분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "30m", range: "5d" })}
            className={tabClass(chartConfig.interval === "30m")}
          >
            30분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1d", range: "1mo" })}
            className={tabClass(chartConfig.interval === "1d")}
          >
            일봉
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1wk", range: "3mo" })}
            className={tabClass(chartConfig.interval === "1wk")}
          >
            주봉
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1mo", range: "5y" })}
            className={tabClass(chartConfig.interval === "1mo")}
          >
            월봉
          </button>
        </div>

        {/* 실제 차트 */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500 animate-pulse text-sm">
              데이터 불러오는 중...
            </div>
          ) : prices.length > 0 ? (
            <CandleChart data={prices} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
