"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import {
  Maximize2,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FinancialChart({ defaultLimit = 200 }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const vwapSeriesRef = useRef(null);
  const ema9SeriesRef = useRef(null);
  const ema20SeriesRef = useRef(null);
  const markersRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(defaultLimit);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA20, setShowEMA20] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [storedSignals, setStoredSignals] = useState([]);

  // Legend State for hover crosshair values
  const [legendData, setLegendData] = useState(null);

  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [historyRes, signalsRes] = await Promise.all([
        fetch(`/api/indicators/history?limit=${limit}`),
        fetch(`/api/signals?limit=100`),
      ]);

      const historyData = await historyRes.json();
      const signalsData = await signalsRes.json();

      const rawIndicators = historyData.indicators || [];
      const signals = signalsData.signals || [];
      setStoredSignals(signals);

      if (rawIndicators.length === 0) {
        setIsLoading(false);
        return;
      }

      // 1. Deduplicate & Sort Candles by UTC timestamp (seconds)
      const timeMap = new Map();
      rawIndicators.forEach((item) => {
        const time = Math.floor(new Date(item.candleTimestamp).getTime() / 1000);
        if (!timeMap.has(time)) {
          timeMap.set(time, item);
        }
      });

      const sortedBars = Array.from(timeMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([time, item]) => ({ ...item, time }));

      // 2. Prepare Series Data
      const candleData = sortedBars.map((b) => ({
        time: b.time,
        open: Number(b.open),
        high: Number(b.high),
        low: Number(b.low),
        close: Number(b.close),
      }));

      const vwapData = sortedBars
        .filter((b) => typeof b.vwap === "number")
        .map((b) => ({ time: b.time, value: b.vwap }));

      const ema9Data = sortedBars
        .filter((b) => typeof b.ema9 === "number")
        .map((b) => ({ time: b.time, value: b.ema9 }));

      const ema20Data = sortedBars
        .filter((b) => typeof b.ema20 === "number")
        .map((b) => ({ time: b.time, value: b.ema20 }));

      // 3. Prepare Markers matching completed bars
      const candleTimesSet = new Set(candleData.map((c) => c.time));
      const markersList = [];

      signals.forEach((sig) => {
        const time = Math.floor(new Date(sig.candleTimestamp).getTime() / 1000);
        if (candleTimesSet.has(time)) {
          const isBuyCall = sig.signalType === "BUY CALL";
          const isBuyPut = sig.signalType === "BUY PUT";
          const isExitCall = sig.signalType === "EXIT CALL";
          const isExitPut = sig.signalType === "EXIT PUT";
          const isUp = isBuyCall || isExitPut;

          markersList.push({
            time,
            position: isUp ? "belowBar" : "aboveBar",
            color: isBuyCall
              ? "#10b981"
              : isBuyPut
              ? "#ef4444"
              : isExitCall
              ? "#f97316"
              : "#f59e0b",
            shape: isUp ? "arrowUp" : "arrowDown",
            text: sig.signalType,
          });
        }
      });

      markersList.sort((a, b) => a.time - b.time);

      // 4. Update Lightweight Charts Series
      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(candleData);
      }
      if (vwapSeriesRef.current) {
        vwapSeriesRef.current.setData(vwapData);
      }
      if (ema9SeriesRef.current) {
        ema9SeriesRef.current.setData(ema9Data);
      }
      if (ema20SeriesRef.current) {
        ema20SeriesRef.current.setData(ema20Data);
      }

      // Update Markers
      if (markersRef.current) {
        markersRef.current.setMarkers(showMarkers ? markersList : []);
      }

      // Set default legend to most recent candle
      const latest = sortedBars[sortedBars.length - 1];
      if (latest) {
        setLegendData({
          time: new Date(latest.candleTimestamp).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
          vwap: latest.vwap,
          ema9: latest.ema9,
          ema20: latest.ema20,
        });
      }

      // Fit chart time scale
      if (chartInstanceRef.current) {
        chartInstanceRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error("Failed to load chart data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, showMarkers]);

  // Initialize Lightweight Chart Instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Destroy existing instance if any
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const { clientWidth } = container;

    const chart = createChart(container, {
      width: clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: "#080c14" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "monospace",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.4)" },
        horzLines: { color: "rgba(30, 41, 59, 0.4)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(56, 189, 248, 0.5)",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(56, 189, 248, 0.5)",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(51, 65, 85, 0.6)",
        scaleMargins: { top: 0.1, bottom: 0.15 },
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(51, 65, 85, 0.6)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
    });

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // 2. Session VWAP Series (Amber)
    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "VWAP",
      priceLineVisible: false,
    });

    // 3. EMA 9 Series (Cyan)
    const ema9Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      title: "EMA 9",
      priceLineVisible: false,
    });

    // 4. EMA 20 Series (Sky Blue)
    const ema20Series = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 1.5,
      title: "EMA 20",
      priceLineVisible: false,
    });

    // 5. Attach Markers
    const markers = createSeriesMarkers(candleSeries, []);

    // Save refs
    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    vwapSeriesRef.current = vwapSeries;
    ema9SeriesRef.current = ema9Series;
    ema20SeriesRef.current = ema20Series;
    markersRef.current = markers;

    // Crosshair Hover Legend Subscription
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;

      const candleBar = param.seriesData.get(candleSeries);
      const vwapBar = param.seriesData.get(vwapSeries);
      const ema9Bar = param.seriesData.get(ema9Series);
      const ema20Bar = param.seriesData.get(ema20Series);

      if (candleBar) {
        const istDate = new Date(Number(param.time) * 1000).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        setLegendData({
          time: istDate,
          open: candleBar.open,
          high: candleBar.high,
          low: candleBar.low,
          close: candleBar.close,
          vwap: vwapBar?.value,
          ema9: ema9Bar?.value,
          ema20: ema20Bar?.value,
        });
      }
    });

    // Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chart.applyOptions({ width });
      }
    });

    resizeObserver.observe(container);

    loadChartData();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [loadChartData]);

  // Toggle Visibility of Lines
  useEffect(() => {
    if (vwapSeriesRef.current) {
      vwapSeriesRef.current.applyOptions({ visible: showVWAP });
    }
  }, [showVWAP]);

  useEffect(() => {
    if (ema9SeriesRef.current) {
      ema9SeriesRef.current.applyOptions({ visible: showEMA9 });
    }
  }, [showEMA9]);

  useEffect(() => {
    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.applyOptions({ visible: showEMA20 });
    }
  }, [showEMA20]);

  const handleResetZoom = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  return (
    <div className="space-y-3">
      {/* Chart Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
        {/* Dynamic Hover Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <span className="text-slate-400 font-semibold">{legendData?.time || "NIFTY 50"}</span>
          {legendData && (
            <>
              <span className="text-slate-400">
                O: <strong className="text-slate-200">₹{legendData.open}</strong>
              </span>
              <span className="text-slate-400">
                H: <strong className="text-emerald-400">₹{legendData.high}</strong>
              </span>
              <span className="text-slate-400">
                L: <strong className="text-red-400">₹{legendData.low}</strong>
              </span>
              <span className="text-slate-400">
                C: <strong className="text-slate-100 font-bold">₹{legendData.close}</strong>
              </span>
              {legendData.vwap && (
                <span className="text-amber-400 font-semibold">
                  VWAP: ₹{legendData.vwap}
                </span>
              )}
              {legendData.ema9 && (
                <span className="text-cyan-400 font-semibold">
                  EMA9: ₹{legendData.ema9}
                </span>
              )}
              {legendData.ema20 && (
                <span className="text-sky-400 font-semibold">
                  EMA20: ₹{legendData.ema20}
                </span>
              )}
            </>
          )}
        </div>

        {/* Controls: Limits & Indicators Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Indicator Toggle Pills */}
          <Button
            variant={showVWAP ? "default" : "outline"}
            size="sm"
            onClick={() => setShowVWAP(!showVWAP)}
            className={`h-7 px-2 text-[10px] font-mono border ${
              showVWAP
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "border-slate-800 text-slate-500"
            }`}
          >
            {showVWAP ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            VWAP
          </Button>

          <Button
            variant={showEMA9 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEMA9(!showEMA9)}
            className={`h-7 px-2 text-[10px] font-mono border ${
              showEMA9
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "border-slate-800 text-slate-500"
            }`}
          >
            {showEMA9 ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            EMA 9
          </Button>

          <Button
            variant={showEMA20 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEMA20(!showEMA20)}
            className={`h-7 px-2 text-[10px] font-mono border ${
              showEMA20
                ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                : "border-slate-800 text-slate-500"
            }`}
          >
            {showEMA20 ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            EMA 20
          </Button>

          {/* Bar Range Limits */}
          <div className="flex items-center gap-1 border-l border-border/80 pl-1.5">
            {[75, 150, 300].map((val) => (
              <Button
                key={val}
                variant={limit === val ? "default" : "ghost"}
                size="sm"
                onClick={() => setLimit(val)}
                className={`h-7 px-2 text-[10px] font-mono ${
                  limit === val ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-400"
                }`}
              >
                {val}m
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetZoom}
            className="h-7 w-7 text-slate-400"
            title="Reset Zoom / Fit Content"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={loadChartData}
            disabled={isLoading}
            className="h-7 w-7 text-slate-400"
            title="Refresh Chart"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Lightweight Charts DOM Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-border/70 bg-[#080c14]">
        {isLoading && (
          <div className="absolute inset-0 bg-[#080c14]/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading NIFTY 50 5-Minute Series...</span>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-[480px]" />
      </div>

      {/* Chart Footer Indicator Legend Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 px-1 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>Bullish Bar</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            <span>Bearish Bar</span>
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="h-0.5 w-3 bg-amber-500 inline-block" />
            <span>Session VWAP (HLC3)</span>
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="h-0.5 w-3 bg-cyan-400 inline-block" />
            <span>EMA 9 (Fast)</span>
          </span>
          <span className="flex items-center gap-1 text-sky-400">
            <span className="h-0.5 w-3 bg-sky-400 inline-block" />
            <span>EMA 20 (Slow)</span>
          </span>
        </div>
        <div>
          <span>Timeframe: <strong>5-Minute Confirmed Candles</strong></span>
        </div>
      </div>
    </div>
  );
}

