"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Shield,
  Layers,
  BarChart3,
  RefreshCw,
  Radio,
  CheckCircle2,
  Compass,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { FinancialChart } from "@/components/charts/FinancialChart";

const STATE_NAMES = {
  0: "FLAT",
  1: "PUT",
  2: "CALL",
};

export default function DashboardPage() {
  const [quote, setQuote] = useState(null);
  const [marketStatus, setMarketStatus] = useState(null);
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [strategyState, setStrategyState] = useState(null);
  const [latestSignal, setLatestSignal] = useState(null);
  const [openPosition, setOpenPosition] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const loadData = async () => {
    try {
      const [quoteRes, statusRes, candlesRes, indicatorsRes, signalRes, paperPosRes] = await Promise.allSettled([
        fetch("/api/market/quote"),
        fetch("/api/market/status"),
        fetch("/api/market/candles?limit=10"),
        fetch("/api/indicators/current"),
        fetch("/api/signals/latest"),
        fetch("/api/paper-trading/open-position"),
      ]);

      if (quoteRes.status === "fulfilled" && quoteRes.value.ok) {
        const data = await quoteRes.value.json();
        setQuote(data.quote);
      }

      if (statusRes.status === "fulfilled" && statusRes.value.ok) {
        const data = await statusRes.value.json();
        setMarketStatus(data);
      }

      if (candlesRes.status === "fulfilled" && candlesRes.value.ok) {
        const data = await candlesRes.value.json();
        const rawCandles = data.candles || [];
        // Sort descending: most recent candle on top
        const sorted = [...rawCandles].sort(
          (a, b) => new Date(b.candleTimestamp) - new Date(a.candleTimestamp)
        );
        setCandles(sorted);
      }

      if (indicatorsRes.status === "fulfilled" && indicatorsRes.value.ok) {
        const data = await indicatorsRes.value.json();
        setIndicators(data.snapshot);
        if (data.strategyState) {
          setStrategyState(data.strategyState);
        }
      }

      if (signalRes.status === "fulfilled" && signalRes.value.ok) {
        const data = await signalRes.value.json();
        setLatestSignal(data.signal);
      }

      if (paperPosRes.status === "fulfilled" && paperPosRes.value.ok) {
        const data = await paperPosRes.value.json();
        setOpenPosition(data.position || null);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/market/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: "5d" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.data?.totalFetched} candles (${data.data?.newInserted} new)!`);
        // Trigger strategy evaluation
        await fetch("/api/strategies/evaluate", { method: "POST" });
        await loadData();
      } else {
        setSyncMessage("Sync failed: " + (data.error || "Unknown"));
      }
    } catch {
      setSyncMessage("Sync failed: Network error");
    } finally {
      setIsSyncing(false);
    }
  };

  const isPositive = quote && quote.change >= 0;
  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;

  const tradeState = strategyState?.tradeState ?? 0;
  const tradeStateLabel =
    tradeState === 1 ? "PUT ACTIVE" : tradeState === 2 ? "CALL ACTIVE" : "FLAT (NO TRADE)";
  const tradeStateVariant =
    tradeState === 2 ? "buy" : tradeState === 1 ? "sell" : "neutral";

  const getSignalBadge = (sig) => {
    if (!sig) return <Badge variant="terminal">STATE: IDLE</Badge>;
    switch (sig.signalType) {
      case "BUY CALL":
        return (
          <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-400 gap-1 font-mono">
            <ArrowUpRight className="h-3.5 w-3.5" /> BUY CALL
          </Badge>
        );
      case "BUY PUT":
        return (
          <Badge className="border-red-500/40 bg-red-500/15 text-red-400 gap-1 font-mono">
            <ArrowDownRight className="h-3.5 w-3.5" /> BUY PUT
          </Badge>
        );
      case "EXIT CALL":
        return (
          <Badge className="border-orange-500/40 bg-orange-500/15 text-orange-400 gap-1 font-mono">
            <LogOut className="h-3 w-3" /> EXIT CALL
          </Badge>
        );
      case "EXIT PUT":
        return (
          <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-400 gap-1 font-mono">
            <LogOut className="h-3 w-3" /> EXIT PUT
          </Badge>
        );
      default:
        return <Badge variant="terminal">{sig.signalType}</Badge>;
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner / Session Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Intraday Terminal
            <Badge variant="terminal" className="text-slate-400 font-mono text-[10px]">
              {marketStatus?.provider?.mode || "MARKET DATA READY"}
            </Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            NIFTY Option Buyer (Pine Script v6: VWAP + EMA 9) &bull; Completed 5m interval stream
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="h-8 text-xs gap-1.5 border-border bg-slate-900/60 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-emerald-400" : "text-slate-400"}`} />
            <span>{isSyncing ? "Syncing..." : "Sync 5m Candles"}</span>
          </Button>
          <Badge
            variant={marketStatus?.market?.isOpen ? "buy" : "neutral"}
            className="text-[11px] font-mono"
          >
            {marketStatus?.market?.state || "CHECKING MARKET"}
          </Badge>
        </div>
      </div>

      {/* Active Paper Position Quick Banner (GEMINI.md Section 13) */}
      {openPosition && (
        <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">LIVE PAPER POSITION</span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={openPosition.optionType === "CE" ? "buy" : "sell"}
                  className="text-[10px] px-1.5 py-0 font-bold"
                >
                  {openPosition.optionType === "CE" ? "LONG CE" : "LONG PE"}
                </Badge>
                <span className="font-bold text-slate-100">{openPosition.optionSymbol}</span>
                <span className="text-slate-400">@ ₹{openPosition.entryPremium?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Unrealized P&amp;L</span>
              <span
                className={`font-bold ${
                  (openPosition.unrealizedPnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {(openPosition.unrealizedPnl || 0) >= 0 ? "+" : ""}₹{openPosition.unrealizedPnl?.toFixed(2)} (
                {openPosition.returnPercentage >= 0 ? "+" : ""}
                {openPosition.returnPercentage?.toFixed(2)}%)
              </span>
            </div>
            <Link
              href="/paper-trading"
              className="text-xs bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50 px-2.5 py-1 rounded font-semibold transition-colors"
            >
              Terminal &rarr;
            </Link>
          </div>
        </div>
      )}

      {syncMessage && (
        <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Grid: Key Market & Strategy Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* 1. NIFTY Spot Price */}
        <Card className="bg-slate-900/60 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-[11px]">
              <span>NIFTY 50 SPOT</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </CardDescription>
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1">
              {quote ? `₹${quote.price.toLocaleString("en-IN")}` : "--"}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={`text-[11px] font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {quote ? `${isPositive ? "+" : ""}${quote.change} (${isPositive ? "+" : ""}${quote.changePercent}%)` : "Awaiting quote"}
            </p>
          </CardContent>
        </Card>

        {/* 2. Latest 5m Candle Close */}
        <Card className="bg-slate-900/60 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-[11px]">
              <span>LATEST 5M CLOSE</span>
              <Layers className="h-3.5 w-3.5 text-sky-400" />
            </CardDescription>
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1">
              {latestCandle ? `₹${latestCandle.close.toLocaleString("en-IN")}` : "--"}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] font-mono text-slate-400">
              Completed 5m interval
            </p>
          </CardContent>
        </Card>

        {/* 3. Session VWAP Value */}
        <Card className="bg-slate-900/60 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-[11px]">
              <span>SESSION VWAP</span>
              <Activity className="h-3.5 w-3.5 text-amber-400" />
            </CardDescription>
            <div className="text-xl sm:text-2xl font-mono font-bold text-amber-400 mt-1">
              {indicators ? `₹${indicators.vwap.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "--"}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] font-mono text-slate-400">
              Session Volume-Weighted Avg
            </p>
          </CardContent>
        </Card>

        {/* 4. Active Trade State */}
        <Card className="bg-slate-900/60 border-border">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-[11px]">
              <span>OPTION BUYER STATE</span>
              <Radio className={`h-3.5 w-3.5 ${tradeState === 2 ? "text-emerald-400 animate-pulse" : tradeState === 1 ? "text-red-400 animate-pulse" : "text-slate-400"}`} />
            </CardDescription>
            <div className="mt-1">
              <Badge variant={tradeStateVariant} className="text-xs sm:text-sm font-mono px-2.5 py-0.5">
                {tradeStateLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] font-mono text-slate-400">
              State: {tradeState} (0: FLAT, 1: PUT, 2: CALL)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Secondary Indicators & Strategy Parameters */}
      {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-900/40 border border-border/80">
          <div className="text-[11px] font-mono text-slate-400">EMA 9 (Fast)</div>
          <div className="text-sm font-mono font-semibold text-cyan-400 mt-0.5">
            {indicators?.ema9 ? `₹${indicators.ema9.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "--"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Exit Trail on Cross</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-border/80">
          <div className="text-[11px] font-mono text-slate-400">Strategy Version</div>
          <div className="text-sm font-mono font-semibold text-slate-200 mt-0.5">
            Pine Script v6 (2.0.0)
          </div>
          <div className="text-[10px] text-slate-400 mt-1">NIFTY Option Buyer</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-border/80">
          <div className="text-[11px] font-mono text-slate-400">Historical Bars</div>
          <div className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">
            {indicators?.isWarmedUp ? `Ready (${indicators.totalCandlesAnalyzed} bars)` : "Warming up"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Atlas Ingestion Feed</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-border/80">
          <div className="text-[11px] font-mono text-slate-400">Market Data Feed</div>
          <div className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">
            {marketStatus?.provider?.active === "yahoo" ? "Yahoo Finance (Free Demo)" : "Kite Connect"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Zero-cost Demo Mode</div>
        </div>
      </div> */}

      {/* Interactive 5-Minute Technical Chart (Temporarily commented out) */}
      {/*
      <Card className="bg-slate-900/50 border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>NIFTY 50 Technical Chart (Lightweight Charts)</span>
              <Badge variant="buy" className="text-[10px]">5M TIMEFRAME</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-amber-400">&bull; VWAP (HLC3)</span>
              <span className="text-cyan-400">&bull; EMA 9 (Fast)</span>
              <span className="text-sky-400">&bull; EMA 20 (Slow)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <FinancialChart defaultLimit={150} />
        </CardContent>
      </Card>
      */}

      {/* Main Section: Recent Candles & Latest Signal Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent 5-Minute Ingested Candles Table */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-border">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Verified 5-Minute Candle Feed (MongoDB Atlas)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Real completed 5m intervals stored with financial invariant verification
                </CardDescription>
              </div>
              <Badge variant="terminal" className="text-slate-400">
                TIMEFRAME: 5M
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 border-b border-border/80 text-[11px] font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Time (IST)</th>
                    <th className="py-2.5 px-3">Open</th>
                    <th className="py-2.5 px-3">High</th>
                    <th className="py-2.5 px-3">Low</th>
                    <th className="py-2.5 px-3">Close</th>
                    <th className="py-2.5 px-3">Volume</th>
                    <th className="py-2.5 px-4 text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {candles.map((c, idx) => {
                    const isBullish = Number(c.close) >= Number(c.open);
                    const diff = Number(c.close) - Number(c.open);

                    return (
                      <tr
                        key={c._id || idx}
                        className={`transition-colors border-l-2 ${
                          isBullish
                            ? "bg-emerald-950/20 hover:bg-emerald-950/35 border-l-emerald-500"
                            : "bg-red-950/20 hover:bg-red-950/35 border-l-red-500"
                        }`}
                      >
                        <td className="py-2.5 px-4 text-slate-300 font-medium">
                          {new Date(c.candleTimestamp).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">₹{c.open}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-medium">₹{c.high}</td>
                        <td className="py-2.5 px-3 text-red-400 font-medium">₹{c.low}</td>
                        <td className={`py-2.5 px-3 font-bold ${isBullish ? "text-emerald-400" : "text-red-400"}`}>
                          ₹{c.close}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {c.volume ? c.volume.toLocaleString("en-IN") : 0}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isBullish
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {isBullish ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {candles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No candles loaded yet. Click &quot;Sync 5m Candles&quot; above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Latest Signal & Strategy State Card */}
        <div className="space-y-4">
          <Card className="bg-slate-900/50 border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Latest Option Alert</span>
                {getSignalBadge(latestSignal)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {latestSignal ? (
                <div className="rounded-md border border-border/80 bg-slate-950/60 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Candle Close:</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      ₹{latestSignal.candleClose?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Session VWAP:</span>
                    <span className="font-mono text-amber-400">₹{latestSignal.vwap}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">EMA 9:</span>
                    <span className="font-mono text-cyan-400">₹{latestSignal.ema9}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Transition:</span>
                    <span className="font-mono text-slate-300">
                      {STATE_NAMES[latestSignal.previousState] || "FLAT"} &rarr; {STATE_NAMES[latestSignal.newState] || "FLAT"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                    <span className="text-slate-400 font-mono">Alert Time:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(latestSignal.candleTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} IST
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4 text-center">
                  <p className="text-xs text-slate-400">No active signal generated today.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Signals trigger strictly on completed 5-minute candle condition changes.
                  </p>
                </div>
              )}

              {/* Strategy Rules Criteria Status */}
              <div className="space-y-1.5 text-xs pt-1">
                <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-slate-400" />
                  Pine Script Strategy Architecture:
                </span>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/40">
                    <span className="text-slate-400">Bearish Entry:</span>
                    <span className="text-red-400">Crossunder VWAP &rarr; BUY PUT</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/40">
                    <span className="text-slate-400">Bullish Entry:</span>
                    <span className="text-emerald-400">Crossover VWAP &rarr; BUY CALL</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/40">
                    <span className="text-slate-400">Exit PUT:</span>
                    <span className="text-amber-400">Crossover EMA 9 &rarr; EXIT</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/40">
                    <span className="text-slate-400">Exit CALL:</span>
                    <span className="text-orange-400">Crossunder EMA 9 &rarr; EXIT</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="rounded-lg border border-border/80 bg-slate-950/60 p-3.5 flex items-start gap-3">
        <Shield className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Execution Safety Guarantee:</strong> This application generates personal notifications only and does NOT place, modify, or execute trades automatically on any broker. All trading decisions and order executions must be placed manually by you.
        </div>
      </div>
    </div>
  );
}
