"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  TickMarkType,
} from "lightweight-charts";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Custom Lightweight Charts Primitive for Drawing Session/Date Break Blue Dotted Lines
 * Only draws a crisp blue dotted vertical line where the date changes in Asia/Kolkata
 */
class DateBreakPrimitive {
  constructor() {
    this._chart = null;
    this._series = null;
    this._breakPoints = []; // Array of timestamps in seconds
    this._requestUpdate = null;
  }

  setData(breakPoints) {
    this._breakPoints = breakPoints || [];
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  attached(param) {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  updateAllViews() { }

  paneViews() {
    if (this._breakPoints.length === 0) {
      return [];
    }

    return [
      {
        renderer: () => ({
          draw: (target) => {
            target.useBitmapCoordinateSpace((scope) => {
              if (!this._chart) return;
              const ctx = scope.context;
              const timeScale = this._chart.timeScale();
              const height = scope.bitmapSize.height;
              const hpr = scope.horizontalPixelRatio || 1;
              const vpr = scope.verticalPixelRatio || 1;

              ctx.save();
              // Blue dotted line (no background highlight, no date badge)
              ctx.strokeStyle = "rgba(59, 130, 246, 0.65)";
              ctx.lineWidth = Math.max(1, Math.round(1 * hpr));
              ctx.setLineDash([2 * vpr, 4 * vpr]);

              for (const time of this._breakPoints) {
                const x = timeScale.timeToCoordinate(time);
                if (x === null || x < 0 || x > scope.mediaSize.width) continue;
                const pixelX = Math.round(x * hpr);

                ctx.beginPath();
                ctx.moveTo(pixelX, 0);
                ctx.lineTo(pixelX, height);
                ctx.stroke();
              }
              ctx.restore();
            });
          },
        }),
      },
    ];
  }

  priceAxisViews() {
    return [];
  }

  timeAxisViews() {
    return [];
  }
}

/**
 * Custom Lightweight Charts Primitive for Drawing Highlighted Signal Badges
 * Renders high-visibility glowing pill badges for BUY CALL, BUY PUT, EXIT CALL, EXIT PUT
 */
class SignalBadgesPrimitive {
  constructor() {
    this._chart = null;
    this._series = null;
    this._signals = [];
    this._visible = true;
    this._requestUpdate = null;
  }

  setData(signals) {
    this._signals = signals || [];
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  setVisible(visible) {
    this._visible = visible;
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  attached(param) {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  updateAllViews() { }

  paneViews() {
    if (!this._visible || this._signals.length === 0) {
      return [];
    }

    return [
      {
        renderer: () => ({
          draw: (target) => {
            target.useBitmapCoordinateSpace((scope) => {
              if (!this._chart || !this._series || !this._visible) return;
              const ctx = scope.context;
              const timeScale = this._chart.timeScale();
              const series = this._series;
              const hpr = scope.horizontalPixelRatio || 1;
              const vpr = scope.verticalPixelRatio || 1;

              ctx.save();
              ctx.font = `bold ${Math.round(10 * vpr)}px monospace`;
              ctx.textBaseline = "middle";

              for (const sig of this._signals) {
                const x = timeScale.timeToCoordinate(sig.time);
                if (x === null || x < 0 || x > scope.mediaSize.width) continue;
                const pixelX = Math.round(x * hpr);

                const isBuyCall = sig.signalType === "BUY CALL";
                const isBuyPut = sig.signalType === "BUY PUT";
                const isExitCall = sig.signalType === "EXIT CALL";

                const isBelow = isBuyCall || sig.signalType === "EXIT PUT";
                const priceRef = isBelow ? (sig.low ?? sig.close) : (sig.high ?? sig.close);
                const yCoord = series.priceToCoordinate(priceRef);
                if (yCoord === null) continue;
                const pixelY = Math.round(yCoord * vpr);

                // Configure Badge Styling
                let text = "";
                let bgColor = "";
                let borderColor = "";
                let textColor = "";
                let shadowColor = "";

                if (isBuyCall) {
                  text = "▲ BUY CALL";
                  bgColor = "rgba(6, 78, 59, 0.94)";
                  borderColor = "rgba(16, 185, 129, 0.95)";
                  textColor = "#34d399";
                  shadowColor = "rgba(16, 185, 129, 0.4)";
                } else if (isBuyPut) {
                  text = "▼ BUY PUT";
                  bgColor = "rgba(127, 29, 29, 0.94)";
                  borderColor = "rgba(239, 68, 68, 0.95)";
                  textColor = "#f87171";
                  shadowColor = "rgba(239, 68, 68, 0.4)";
                } else if (isExitCall) {
                  text = "✕ EXIT CALL";
                  bgColor = "rgba(124, 45, 18, 0.94)";
                  borderColor = "rgba(249, 115, 22, 0.95)";
                  textColor = "#fb923c";
                  shadowColor = "rgba(249, 115, 22, 0.4)";
                } else {
                  text = "✕ EXIT PUT";
                  bgColor = "rgba(124, 45, 18, 0.94)";
                  borderColor = "rgba(245, 158, 11, 0.95)";
                  textColor = "#fbbf24";
                  shadowColor = "rgba(245, 158, 11, 0.4)";
                }

                const textWidth = ctx.measureText(text).width;
                const padX = 6 * hpr;
                const badgeW = textWidth + padX * 2;
                const badgeH = 18 * vpr;
                const badgeX = pixelX - badgeW / 2;

                const offsetDistance = 14 * vpr;
                const badgeY = isBelow
                  ? pixelY + offsetDistance
                  : pixelY - offsetDistance - badgeH;

                // Draw connector line from candle wick to badge
                ctx.shadowColor = "transparent";
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1 * hpr;
                ctx.setLineDash([]);
                ctx.beginPath();
                if (isBelow) {
                  ctx.moveTo(pixelX, pixelY + 2 * vpr);
                  ctx.lineTo(pixelX, badgeY);
                } else {
                  ctx.moveTo(pixelX, pixelY - 2 * vpr);
                  ctx.lineTo(pixelX, badgeY + badgeH);
                }
                ctx.stroke();

                // Draw Badge Rounded Rectangle with Glow
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = 6 * hpr;
                ctx.fillStyle = bgColor;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1.5 * hpr;

                ctx.beginPath();
                if (ctx.roundRect) {
                  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 * hpr);
                } else {
                  ctx.rect(badgeX, badgeY, badgeW, badgeH);
                }
                ctx.fill();
                ctx.stroke();

                // Draw Text inside Badge
                ctx.shadowColor = "transparent";
                ctx.fillStyle = textColor;
                ctx.fillText(text, badgeX + padX, badgeY + badgeH / 2);
              }
              ctx.restore();
            });
          },
        }),
      },
    ];
  }

  priceAxisViews() {
    return [];
  }

  timeAxisViews() {
    return [];
  }
}

export function FinancialChart({ defaultLimit = 200 }) {
  const chartWrapperRef = useRef(null);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const vwapSeriesRef = useRef(null);
  const ema9SeriesRef = useRef(null);
  const ema20SeriesRef = useRef(null);
  const dateBreakPrimitiveRef = useRef(null);
  const signalBadgesPrimitiveRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(defaultLimit);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA20, setShowEMA20] = useState(false); // Initially hidden as requested
  const [showSignals, setShowSignals] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Legend State for hover crosshair values
  const [legendData, setLegendData] = useState(null);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Exit fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

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

      // 2. Identify Date Change Points in Asia/Kolkata for Blue Dotted Lines
      const dateBreakTimestamps = [];
      for (let i = 1; i < sortedBars.length; i++) {
        const prev = sortedBars[i - 1];
        const curr = sortedBars[i];

        const prevDateStr = new Date(prev.candleTimestamp).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
        const currDateStr = new Date(curr.candleTimestamp).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

        if (prevDateStr !== currDateStr) {
          dateBreakTimestamps.push(curr.time);
        }
      }

      // 3. Prepare Series Data
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

      // 4. Prepare Highlighted Signal Badges matching completed bars
      const candleTimesMap = new Map(sortedBars.map((c) => [c.time, c]));
      const signalBadgesList = [];

      signals.forEach((sig) => {
        const time = Math.floor(new Date(sig.candleTimestamp).getTime() / 1000);
        const candle = candleTimesMap.get(time);
        if (candle) {
          signalBadgesList.push({
            time,
            signalType: sig.signalType,
            close: Number(candle.close),
            high: Number(candle.high),
            low: Number(candle.low),
          });
        }
      });

      signalBadgesList.sort((a, b) => a.time - b.time);

      // 5. Update Lightweight Charts Series
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

      // Update Custom Primitives
      if (dateBreakPrimitiveRef.current) {
        dateBreakPrimitiveRef.current.setData(dateBreakTimestamps);
      }
      if (signalBadgesPrimitiveRef.current) {
        signalBadgesPrimitiveRef.current.setData(signalBadgesList);
      }

      // Set default legend to most recent candle with IST time
      const latest = sortedBars[sortedBars.length - 1];
      if (latest) {
        const istFormatted = new Date(latest.candleTimestamp).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        setLegendData({
          time: `${istFormatted} IST`,
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
  }, [limit]);

  // Initialize Lightweight Chart Instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Destroy existing instance if any
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const { clientWidth, clientHeight } = container;

    const initialHeight = isFullscreen ? Math.max(300, clientHeight || 600) : 480;

    const chart = createChart(container, {
      width: clientWidth,
      height: initialHeight,
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
      // Localization: Strictly displays IST (Asia/Kolkata) across tooltips and crosshairs
      localization: {
        locale: "en-IN",
        dateFormat: "dd MMM yyyy",
        timeFormatter: (time) => {
          const date = new Date(Number(time) * 1000);
          const dateStr = date.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
          });
          const timeStr = date.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return `${dateStr} ${timeStr} IST`;
        },
      },
      // Time Scale: Formats ticks in IST (Asia/Kolkata)
      timeScale: {
        borderColor: "rgba(51, 65, 85, 0.6)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        tickMarkFormatter: (time, tickMarkType) => {
          const date = new Date(Number(time) * 1000);
          if (tickMarkType === TickMarkType.Year) {
            return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" });
          }
          if (tickMarkType === TickMarkType.Month) {
            return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
          }
          if (tickMarkType === TickMarkType.DayOfMonth) {
            return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" });
          }
          return date.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        },
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

    // 2. Attach Custom Date Break Primitive (Clean Blue Dotted Line only)
    const dateBreakPrimitive = new DateBreakPrimitive();
    candleSeries.attachPrimitive(dateBreakPrimitive);
    dateBreakPrimitiveRef.current = dateBreakPrimitive;

    // 3. Attach Custom Signal Badges Primitive (Highlighted Badges with Borders & Glow)
    const signalBadgesPrimitive = new SignalBadgesPrimitive();
    candleSeries.attachPrimitive(signalBadgesPrimitive);
    signalBadgesPrimitiveRef.current = signalBadgesPrimitive;

    // 4. Session VWAP Series (Amber)
    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "VWAP",
      priceLineVisible: false,
    });

    // 5. EMA 9 Series (Cyan)
    const ema9Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      title: "EMA 9",
      priceLineVisible: false,
    });

    // 6. EMA 20 Series (Sky Blue) - Initialized with visible: false (hidden by default)
    const ema20Series = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 1.5,
      title: "EMA 20",
      priceLineVisible: false,
      visible: showEMA20,
    });

    // Save refs
    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    vwapSeriesRef.current = vwapSeries;
    ema9SeriesRef.current = ema9Series;
    ema20SeriesRef.current = ema20Series;

    // Crosshair Hover Legend Subscription (Formatted strictly in IST)
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
          hour12: false,
        });

        setLegendData({
          time: `${istDate} IST`,
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
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      } else if (width > 0) {
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
  }, [loadChartData, isFullscreen]);

  // Toggle Visibility of Indicators & Badges
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

  useEffect(() => {
    if (signalBadgesPrimitiveRef.current) {
      signalBadgesPrimitiveRef.current.setVisible(showSignals);
    }
  }, [showSignals]);

  const handleResetZoom = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  return (
    <div
      ref={chartWrapperRef}
      className={`transition-all duration-200 ${isFullscreen
          ? "fixed inset-0 z-50 bg-[#080c14] flex flex-col p-3 sm:p-5 w-screen h-screen overflow-hidden"
          : "space-y-3"
        }`}
    >
      {/* Chart Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
        {/* Dynamic Hover Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <span className="text-slate-400 font-semibold">{legendData?.time || "NIFTY 50 (IST)"}</span>
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
              {showEMA20 && legendData.ema20 && (
                <span className="text-sky-400 font-semibold">
                  EMA20: ₹{legendData.ema20}
                </span>
              )}
            </>
          )}
        </div>

        {/* Controls: Limits & Indicators Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Signal Badges Toggle */}
          <Button
            variant={showSignals ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSignals(!showSignals)}
            className={`h-7 px-2 text-[10px] font-mono border ${showSignals
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "border-slate-800 text-slate-500"
              }`}
            title="Toggle Highlighted Signal Badges"
          >
            <Layers className="h-3 w-3 mr-1" />
            Signals
          </Button>

          {/* Indicator Toggle Pills */}
          <Button
            variant={showVWAP ? "default" : "outline"}
            size="sm"
            onClick={() => setShowVWAP(!showVWAP)}
            className={`h-7 px-2 text-[10px] font-mono border ${showVWAP
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
            className={`h-7 px-2 text-[10px] font-mono border ${showEMA9
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "border-slate-800 text-slate-500"
              }`}
          >
            {showEMA9 ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            EMA 9
          </Button>

          {/* EMA 20 (Hidden initially, click to toggle on) */}
          <Button
            variant={showEMA20 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEMA20(!showEMA20)}
            className={`h-7 px-2 text-[10px] font-mono border ${showEMA20
                ? "bg-sky-500/20 text-sky-400 border-sky-500/40 font-semibold"
                : "border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            title={showEMA20 ? "Hide EMA 20" : "Show EMA 20"}
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
                className={`h-7 px-2 text-[10px] font-mono ${limit === val ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-400"
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

          {/* Mobile & Desktop Fullscreen Toggle Button */}
          <Button
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            onClick={toggleFullscreen}
            className={`h-7 px-2 text-[10px] font-mono border flex items-center gap-1 ${isFullscreen
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                : "border-slate-800 text-slate-300 hover:text-white"
              }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Lightweight Charts DOM Canvas */}
      <div
        className={`relative rounded-lg overflow-hidden border border-border/70 bg-[#080c14] ${isFullscreen ? "flex-1 w-full min-h-0" : "w-full"
          }`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-[#080c14]/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading NIFTY 50 5-Minute Series...</span>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className={isFullscreen ? "w-full h-full" : "w-full h-[400px] sm:h-[480px]"}
        />
      </div>

      {/* Chart Footer Indicator Legend Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 px-1 pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>▲ BUY CALL</span>
          </span>
          <span className="flex items-center gap-1 text-red-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            <span>▼ BUY PUT</span>
          </span>
          <span className="flex items-center gap-1 text-orange-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            <span>✕ EXIT CALL/PUT</span>
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="h-0.5 w-3 bg-amber-500 inline-block" />
            <span>VWAP</span>
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="h-0.5 w-3 bg-cyan-400 inline-block" />
            <span>EMA 9</span>
          </span>
          {showEMA20 && (
            <span className="flex items-center gap-1 text-sky-400">
              <span className="h-0.5 w-3 bg-sky-400 inline-block" />
              <span>EMA 20</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-blue-400">
            <span className="h-2.5 w-0.5 border-r border-dotted border-blue-400 inline-block" />
            <span>Day Break (09:15)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Timezone: <strong>IST (Asia/Kolkata)</strong></span>
          <span>&bull;</span>
          <span>Timeframe: <strong>5m Confirmed</strong></span>
        </div>
      </div>
    </div>
  );
}
