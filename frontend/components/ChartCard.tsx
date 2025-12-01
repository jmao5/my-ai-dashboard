"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import dynamic from "next/dynamic";
import { commaizeNumber } from "@toss/utils";

// 캔들차트 동적 임포트
const CandleChart = dynamic(() => import("@/components/CandleChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-gray-500 animate-pulse text-sm">
      차트 로딩 중...
    </div>
  ),
});

interface Props {
  title: string;
  symbol: string;
}

export default function ChartCard({ title, symbol }: Props) {
  const [chartConfig, setChartConfig] = useState({
    interval: "5m",
    range: "1d",
  });

  const {
    data: prices = [],
    isLoading,
    isFetching, // 👈 [핵심] 백그라운드에서 데이터를 가져오는 중인지 확인하는 변수
  } = useQuery({
    queryKey: ["marketChart", symbol, chartConfig],
    queryFn: () =>
      marketApi.getChartData(symbol, chartConfig.interval, chartConfig.range),
    refetchInterval: 3000, // 👈 [수정] 3초마다 갱신 (Live 느낌)
  });

  const lastPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const fixedPrice =
    symbol === "KRW=X"
      ? lastPrice.toFixed(2)
      : lastPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const currentPriceStr = commaizeNumber(fixedPrice);

  const tabClass = (isActive: boolean) =>
    `px-2 py-1 text-xs rounded transition ${isActive ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`;

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[400px]">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
            {/* 👇 [추가] 상태 표시기 */}
            {isFetching ? (
              // 1. 데이터 갱신 중일 때: 회전하는 스피너
              <span
                className="text-blue-400 text-xs animate-spin"
                title="데이터 갱신 중..."
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </span>
            ) : (
              // 2. 대기 중일 때: 깜빡이는 초록 점 (Live)
              <span
                className="relative flex h-2.5 w-2.5 ml-1"
                title="실시간 연결됨"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
            {symbol}
            {isFetching && (
              <span className="text-blue-400 text-[10px] animate-pulse">
                updating...
              </span>
            )}
          </p>
        </div>

        <div className="text-right">
          {/* 가격 표시 (갱신 중일 때 살짝 투명해지며 깜빡임 효과) */}
          <span
            className={`text-xl font-mono font-bold transition-opacity duration-300 ${lastPrice > 0 ? "text-green-400" : "text-gray-400"} ${isFetching ? "opacity-70" : "opacity-100"}`}
          >
            {symbol === "KRW=X" ? "₩" : "$"}
            {currentPriceStr}
          </span>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex gap-2 mb-2 border-b border-gray-700 pb-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setChartConfig({ interval: "1m", range: "1d" })}
            className={tabClass(chartConfig.interval === "1m")}
          >
            1분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "5m", range: "5d" })}
            className={tabClass(chartConfig.interval === "5m")}
          >
            5분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "30m", range: "1mo" })}
            className={tabClass(chartConfig.interval === "30m")}
          >
            30분
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1d", range: "1y" })}
            className={tabClass(chartConfig.interval === "1d")}
          >
            일봉
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1wk", range: "5y" })}
            className={tabClass(chartConfig.interval === "1wk")}
          >
            주봉
          </button>
          <button
            onClick={() => setChartConfig({ interval: "1mo", range: "max" })}
            className={tabClass(chartConfig.interval === "1mo")}
          >
            월봉
          </button>
        </div>

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
