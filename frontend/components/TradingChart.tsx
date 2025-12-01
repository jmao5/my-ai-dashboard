"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickSeries,
  LineSeries,
  CandlestickData,
  LineData,
  UTCTimestamp,
  MouseEventParams,
} from "lightweight-charts";

// 데이터 타입 정의
export interface MarketData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
}

interface ChartProps {
  data: MarketData[];
}

// 레전드 표시용 상태 타입
interface LegendData {
  open: string;
  high: string;
  low: string;
  close: string;
  ma5: string;
  ma20: string;
  ma60: string;
  ma120: string;
  color: string;
}

export default function TradingChart({ data }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // 시리즈 참조
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma5SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma120SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // 상단 레전드 상태
  const [legend, setLegend] = useState<LegendData | null>(null);

  // 1. 차트 초기화
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1F2937" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: "#9CA3AF", style: 3 },
        horzLine: { visible: false, labelVisible: false },
      },
      // 👇 [수정] 시간축 설정 (여백 제거 및 꽉 채우기 준비)
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2, // 오른쪽 여백 최소화 (기본값은 꽤 큼)
        barSpacing: 10, // 기본 캔들 간격 (fitContent 호출 시 무시되지만 초기값으로 좋음)
        fixLeftEdge: true, // 왼쪽 공백 방지 (데이터 시작점부터 보여줌)
      },
      rightPriceScale: {
        borderColor: "#374151",
        scaleMargins: {
          top: 0.2,
          bottom: 0.1,
        },
      },
    });

    chartRef.current = chart;

    // 시리즈 추가
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#EF4444",
      downColor: "#3B82F6",
      borderUpColor: "#EF4444",
      borderDownColor: "#3B82F6",
      wickUpColor: "#EF4444",
      wickDownColor: "#3B82F6",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    candleSeriesRef.current = candleSeries;

    const maOption = {
      lineWidth: 2 as const,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    };

    const ma5Series = chart.addSeries(LineSeries, {
      color: "#FACC15",
      ...maOption,
    });
    const ma20Series = chart.addSeries(LineSeries, {
      color: "#A78BFA",
      ...maOption,
    });
    const ma60Series = chart.addSeries(LineSeries, {
      color: "#10B981",
      ...maOption,
    });
    const ma120Series = chart.addSeries(LineSeries, {
      color: "#FB923C",
      ...maOption,
    });

    ma5SeriesRef.current = ma5Series;
    ma20SeriesRef.current = ma20Series;
    ma60SeriesRef.current = ma60Series;
    ma120SeriesRef.current = ma120Series;

    // 마우스 이벤트 (레전드)
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (
        param.time === undefined ||
        param.point === undefined ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        updateLegendToLatest();
      } else {
        updateLegend(param);
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // 레전드 업데이트 함수
  const updateLegend = (param: MouseEventParams) => {
    const candleData = param.seriesData.get(
      candleSeriesRef.current!,
    ) as CandlestickData;
    const ma5Data = param.seriesData.get(ma5SeriesRef.current!) as LineData;
    const ma20Data = param.seriesData.get(ma20SeriesRef.current!) as LineData;
    const ma60Data = param.seriesData.get(ma60SeriesRef.current!) as LineData;
    const ma120Data = param.seriesData.get(ma120SeriesRef.current!) as LineData;

    if (candleData) {
      setLegend({
        open: candleData.open.toFixed(2),
        high: candleData.high.toFixed(2),
        low: candleData.low.toFixed(2),
        close: candleData.close.toFixed(2),
        ma5: ma5Data?.value ? ma5Data.value.toFixed(2) : "-",
        ma20: ma20Data?.value ? ma20Data.value.toFixed(2) : "-",
        ma60: ma60Data?.value ? ma60Data.value.toFixed(2) : "-",
        ma120: ma120Data?.value ? ma120Data.value.toFixed(2) : "-",
        color:
          candleData.close >= candleData.open
            ? "text-red-500"
            : "text-blue-500",
      });
    }
  };

  const updateLegendToLatest = () => {
    if (!candleSeriesRef.current) return;
    if (data.length > 0) {
      const last = data[data.length - 1];
      setLegend({
        open: last.open.toFixed(2),
        high: last.high.toFixed(2),
        low: last.low.toFixed(2),
        close: last.close.toFixed(2),
        ma5: last.ma5 ? last.ma5.toFixed(2) : "-",
        ma20: last.ma20 ? last.ma20.toFixed(2) : "-",
        ma60: last.ma60 ? last.ma60.toFixed(2) : "-",
        ma120: last.ma120 ? last.ma120.toFixed(2) : "-",
        color: last.close >= last.open ? "text-red-500" : "text-blue-500",
      });
    }
  };

  // 4. 데이터 업데이트
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const isValid = (num: any): boolean => {
      return (
        num !== null &&
        num !== undefined &&
        !isNaN(Number(num)) &&
        isFinite(Number(num))
      );
    };

    const parsedData = data.map((d) => {
      let timeValue: UTCTimestamp;
      if (d.time.includes(":") && !d.time.includes("-")) {
        const now = new Date();
        const [h, m] = d.time.split(":").map(Number);
        const date = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h,
          m,
        );
        timeValue = Math.floor(date.getTime() / 1000) as UTCTimestamp;
      } else {
        const date = new Date(d.time);
        timeValue = Math.floor(date.getTime() / 1000) as UTCTimestamp;
      }
      return { ...d, timeValue };
    });

    const uniqueMap = new Map();
    parsedData.forEach((item) => {
      if (!isNaN(item.timeValue)) uniqueMap.set(item.timeValue, item);
    });
    const sortedData = Array.from(uniqueMap.values()).sort(
      (a: any, b: any) => a.timeValue - b.timeValue,
    );

    const candles: CandlestickData<Time>[] = [];
    const ma5: LineData<Time>[] = [];
    const ma20: LineData<Time>[] = [];
    const ma60: LineData<Time>[] = [];
    const ma120: LineData<Time>[] = [];

    sortedData.forEach((d: any) => {
      if (isValid(d.open) && isValid(d.close)) {
        candles.push({
          time: d.timeValue,
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
        });
      }
      if (isValid(d.ma5)) ma5.push({ time: d.timeValue, value: Number(d.ma5) });
      if (isValid(d.ma20))
        ma20.push({ time: d.timeValue, value: Number(d.ma20) });
      if (isValid(d.ma60))
        ma60.push({ time: d.timeValue, value: Number(d.ma60) });
      if (isValid(d.ma120))
        ma120.push({ time: d.timeValue, value: Number(d.ma120) });
    });

    try {
      candleSeriesRef.current?.setData(candles);
      ma5SeriesRef.current?.setData(ma5);
      ma20SeriesRef.current?.setData(ma20);
      ma60SeriesRef.current?.setData(ma60);
      ma120SeriesRef.current?.setData(ma120);

      updateLegendToLatest();

      // 👇 [핵심] 데이터가 들어오면 화면에 꽉 차게 줌(Zoom)을 당겨줍니다!
      // (약간의 지연을 줘서 렌더링 후 실행)
      setTimeout(() => {
        chartRef.current?.timeScale().fitContent();
      }, 0);
    } catch (err) {
      console.error("Chart Update Error:", err);
    }
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-2 z-10 bg-gray-900/80 p-2 rounded border border-gray-700 text-xs font-mono shadow-lg pointer-events-none">
        {legend ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className={`flex gap-2 ${legend.color}`}>
              <span>O: {legend.open}</span>
              <span>H: {legend.high}</span>
              <span>L: {legend.low}</span>
              <span>C: {legend.close}</span>
            </div>
            <div className="flex gap-3 text-gray-400">
              <span className="text-yellow-400">MA5: {legend.ma5}</span>
              <span className="text-purple-400">MA20: {legend.ma20}</span>
              <span className="text-green-500">MA60: {legend.ma60}</span>
              <span className="text-orange-400">MA120: {legend.ma120}</span>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">Loading...</span>
        )}
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
