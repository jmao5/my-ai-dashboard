"use client";

import { useEffect, useRef } from "react";
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

export default function TradingChart({ data }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma5SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma120SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // 1. 차트 초기화
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1F2937" }, // 배경색
        textColor: "#D1D5DB", // 텍스트 밝은 회색
      },
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        borderColor: "#4B5563",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: "#4B5563" },
    });

    chartRef.current = chart;

    // 캔들스틱 설정
    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#EF4444",
      downColor: "#3B82F6",
      borderUpColor: "#EF4444",
      borderDownColor: "#3B82F6",
      wickUpColor: "#EF4444",
      wickDownColor: "#3B82F6",
    });

    // 이평선 설정 (두께를 2로 키워서 선명하게!)
    ma5SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#FACC15",
      lineWidth: 2,
      title: "MA5",
    }); // 노랑
    ma20SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#A78BFA",
      lineWidth: 2,
      title: "MA20",
    }); // 보라
    ma60SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#10B981",
      lineWidth: 2,
      title: "MA60",
    }); // 초록
    ma120SeriesRef.current = chart.addSeries(LineSeries, {
      color: "#FB923C",
      lineWidth: 2,
      title: "MA120",
    }); // 주황

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

  // 2. 데이터 업데이트
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // [Type Guard] 값 유효성 검사 (null, undefined, NaN, Infinity 차단)
    const isValid = (num: any): boolean => {
      return (
        num !== null &&
        num !== undefined &&
        !isNaN(Number(num)) &&
        isFinite(Number(num))
      );
    };

    // 1. 데이터 전처리 (시간 변환 및 정렬 준비)
    const parsedData = data.map((d) => {
      let timeValue: UTCTimestamp;

      // 시간 파싱 (HH:MM -> Unix Timestamp)
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
        // YYYY-MM-DD 등은 문자열 그대로 사용해도 되지만, 안전하게 Timestamp로 변환 추천
        // 여기서는 라이브러리가 string date를 지원하므로 그대로 둠 (단, 정렬을 위해 Date 변환 비교 필요)
        // *중요*: Lightweight chart에서 string time을 쓸 때는 포맷이 정확해야 함.
        // 가장 안전한 건 다 Timestamp로 바꾸는 것임.
        const date = new Date(d.time);
        timeValue = Math.floor(date.getTime() / 1000) as UTCTimestamp;
      }
      return { ...d, timeValue };
    });

    // 2. 시간순 정렬 (필수!)
    // 중복 시간 제거를 위해 Map 사용
    const uniqueMap = new Map();
    parsedData.forEach((item) => {
      if (!isNaN(item.timeValue)) uniqueMap.set(item.timeValue, item);
    });
    const sortedData = Array.from(uniqueMap.values()).sort(
      (a: any, b: any) => a.timeValue - b.timeValue,
    );

    // 3. 시리즈별 데이터 분리
    const candles: CandlestickData<Time>[] = [];
    const ma5: LineData<Time>[] = [];
    const ma20: LineData<Time>[] = [];
    const ma60: LineData<Time>[] = [];
    const ma120: LineData<Time>[] = [];

    sortedData.forEach((d: any) => {
      // 캔들
      if (isValid(d.open) && isValid(d.close)) {
        candles.push({
          time: d.timeValue,
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
        });
      }
      // 이평선 (값이 있을 때만 push)
      if (isValid(d.ma5)) ma5.push({ time: d.timeValue, value: Number(d.ma5) });
      if (isValid(d.ma20))
        ma20.push({ time: d.timeValue, value: Number(d.ma20) });
      if (isValid(d.ma60))
        ma60.push({ time: d.timeValue, value: Number(d.ma60) });
      if (isValid(d.ma120))
        ma120.push({ time: d.timeValue, value: Number(d.ma120) });
    });

    // 4. 차트에 데이터 주입 (에러 방지)
    try {
      candleSeriesRef.current?.setData(candles);
      ma5SeriesRef.current?.setData(ma5);
      ma20SeriesRef.current?.setData(ma20);
      ma60SeriesRef.current?.setData(ma60);
      ma120SeriesRef.current?.setData(ma120);

      // 약간의 지연 후 범위 맞춤 (UI 렌더링 안정화)
      // requestAnimationFrame(() => chartRef.current?.timeScale().fitContent());
      // -> 실시간 데이터에서는 fitContent를 매번 하면 깜빡일 수 있으니,
      //    데이터 개수가 확 바뀌었을 때만 하는 게 좋지만, 일단은 그냥 둡니다.
    } catch (err) {
      console.error("Chart Update Error:", err);
    }
  }, [data]);

  return <div ref={chartContainerRef} className="w-full h-full relative" />;
}
