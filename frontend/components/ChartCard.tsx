"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/services/api";
import dynamic from "next/dynamic";
import { commaizeNumber } from "@toss/utils";

// 👇 TradingChart 동적 임포트 (SSR 끄기 필수)
const TradingChart = dynamic(() => import("@/components/TradingChart"), {
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
  // 차트 설정 상태
  const [chartConfig, setChartConfig] = useState({
    interval: "5m",
    range: "1d",
  });

  const {
    data: prices = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["marketChart", symbol, chartConfig],
    queryFn: () =>
      marketApi.getChartData(symbol, chartConfig.interval, chartConfig.range),
    refetchInterval: 3000, // 3초마다 갱신
  });

  // 현재가 계산 (마지막 데이터의 close 값)
  const lastPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;

  // 소수점 및 콤마 포맷팅
  const fixedPrice =
    symbol === "KRW=X"
      ? lastPrice.toFixed(2)
      : lastPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const currentPriceStr = commaizeNumber(fixedPrice);

  // 탭 버튼 스타일
  const tabClass = (isActive: boolean) =>
    `px-2 py-1 text-xs rounded transition whitespace-nowrap ${isActive ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`;

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[400px]">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
            {/* 상태 표시 (로딩 중 스피너 / 대기 중 핑) */}
            {isFetching ? (
              <span
                className="text-blue-400 text-xs animate-spin"
                title="갱신 중..."
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
              <span className="relative flex h-2.5 w-2.5 ml-1" title="실시간">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{symbol}</p>
        </div>

        <div className="text-right">
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
        {/* 기간 선택 탭 */}
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

        {/* TradingChart 컴포넌트 */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500 animate-pulse text-sm">
              데이터 로딩 중...
            </div>
          ) : prices.length > 0 ? (
            <TradingChart data={prices} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              데이터 없음
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
