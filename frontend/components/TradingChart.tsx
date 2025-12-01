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
  // 👇 [추가] 데이터 타입 임포트
  CandlestickData,
  LineData,
} from "lightweight-charts";

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
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#EF4444",
      downColor: "#3B82F6",
      borderUpColor: "#EF4444",
      borderDownColor: "#3B82F6",
      wickUpColor: "#EF4444",
      wickDownColor: "#3B82F6",
    });
    candleSeriesRef.current = candleSeries;

    const ma5Series = chart.addSeries(LineSeries, {
      color: "#FACC15",
      lineWidth: 1,
      title: "MA5",
    });
    const ma20Series = chart.addSeries(LineSeries, {
      color: "#A78BFA",
      lineWidth: 1,
      title: "MA20",
    });
    const ma60Series = chart.addSeries(LineSeries, {
      color: "#10B981",
      lineWidth: 1,
      title: "MA60",
    });
    const ma120Series = chart.addSeries(LineSeries, {
      color: "#FB923C",
      lineWidth: 1,
      title: "MA120",
    });

    ma5SeriesRef.current = ma5Series;
    ma20SeriesRef.current = ma20Series;
    ma60SeriesRef.current = ma60Series;
    ma120SeriesRef.current = ma120Series;

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

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // ✅ [수정] any[] 대신 정확한 타입 명시
    const candles: CandlestickData<Time>[] = [];
    const ma5: LineData<Time>[] = [];
    const ma20: LineData<Time>[] = [];
    const ma60: LineData<Time>[] = [];
    const ma120: LineData<Time>[] = [];

    data.forEach((d) => {
      let timeValue: Time;

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
        timeValue = Math.floor(date.getTime() / 1000) as Time;
      } else {
        timeValue = d.time as Time;
      }

      candles.push({
        time: timeValue,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      });

      if (d.ma5 !== null) ma5.push({ time: timeValue, value: d.ma5 });
      if (d.ma20 !== null) ma20.push({ time: timeValue, value: d.ma20 });
      if (d.ma60 !== null) ma60.push({ time: timeValue, value: d.ma60 });
      if (d.ma120 !== null) ma120.push({ time: timeValue, value: d.ma120 });
    });

    candleSeriesRef.current?.setData(candles);
    ma5SeriesRef.current?.setData(ma5);
    ma20SeriesRef.current?.setData(ma20);
    ma60SeriesRef.current?.setData(ma60);
    ma120SeriesRef.current?.setData(ma120);

    chartRef.current.timeScale().fitContent();
  }, [data]);

  return <div ref={chartContainerRef} className="w-full h-full relative" />;
}
