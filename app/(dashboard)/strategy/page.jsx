"use client";

import { useState, useEffect } from "react";
import {
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  ShieldCheck,
  Database,
  Power,
  Code2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StrategyPage() {
  const [strategy, setStrategy] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function loadStrategy() {
      try {
        const res = await fetch("/api/strategies");
        if (res.ok) {
          const data = await res.json();
          setStrategy(data.strategy);
        }
      } catch {
        // Fallback
      }
    }
    loadStrategy();
  }, []);

  const handleToggle = async () => {
    if (!strategy) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/strategies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !strategy.enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategy);
      }
    } catch {
      // Fallback
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-400" />
            NIFTY Option Buyer Strategy
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pine Script v6 Specification: &quot;NIFTY Option Buyer - VWAP EMA9 Reversal Strategy&quot;
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="terminal" className="text-emerald-400">
            VERSION {strategy?.version || "3.0.0"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isUpdating}
            className={`h-8 text-xs gap-1.5 border font-semibold ${
              strategy?.enabled
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                : "border-slate-700 text-slate-400 bg-slate-900"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{strategy?.enabled ? "STRATEGY ENABLED" : "STRATEGY DISABLED"}</span>
          </Button>
        </div>
      </div>

      {/* 3 Core States Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* State 0: FLAT */}
        <Card className="bg-slate-900/50 border-slate-700/60">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>STATE 0: No Active Trade (FLAT)</span>
              <Badge variant="neutral">IDLE</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Evaluates initial breakout across Session VWAP
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-red-400 font-semibold block">vwapDown (Crossunder VWAP):</span>
              <span className="text-slate-300 text-[11px]">&rarr; BUY PUT (State 1)</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-emerald-400 font-semibold block">vwapUp (Crossover VWAP):</span>
              <span className="text-slate-300 text-[11px]">&rarr; BUY CALL (State 2)</span>
            </div>
          </CardContent>
        </Card>

        {/* State 1: PUT ACTIVE */}
        <Card className="bg-slate-900/50 border-red-500/30">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold text-red-400 flex items-center justify-between">
              <span>STATE 1: PUT Active</span>
              <Badge variant="buyPut">BEARISH</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Active PUT option position (Bearish trend)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40">
              <span className="text-emerald-400 font-semibold block">vwapUp and close &gt; ema9:</span>
              <span className="text-slate-300 text-[11px]">&rarr; BUY CALL (State 2 Reversal)</span>
            </div>
            <div className="p-2.5 rounded bg-red-950/20 border border-red-900/40">
              <span className="text-amber-400 font-semibold block">emaUp (Crossover EMA 9 only):</span>
              <span className="text-slate-300 text-[11px]">&rarr; EXIT PUT (State 0 Flat)</span>
            </div>
          </CardContent>
        </Card>

        {/* State 2: CALL ACTIVE */}
        <Card className="bg-slate-900/50 border-emerald-500/30">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center justify-between">
              <span>STATE 2: CALL Active</span>
              <Badge variant="buyCall">BULLISH</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Active CALL option position (Bullish trend)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40">
              <span className="text-red-400 font-semibold block">vwapDown and close &lt; ema9:</span>
              <span className="text-slate-300 text-[11px]">&rarr; BUY PUT (State 1 Reversal)</span>
            </div>
            <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40">
              <span className="text-orange-400 font-semibold block">emaDown (Crossunder EMA 9 only):</span>
              <span className="text-slate-300 text-[11px]">&rarr; EXIT CALL (State 0 Flat)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pine Script Reference */}
      <Card className="bg-slate-900/50 border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span>Pine Script v6 Reference Code (&quot;NIFTY Option Buyer - VWAP EMA9 Reversal Strategy&quot;)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Exact mathematical and crossover logic replicated deterministically in the Node.js backend
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <pre className="p-4 rounded-md bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800 leading-relaxed">
{`//@version=6
indicator("NIFTY Option Buyer - VWAP EMA9 Reversal Strategy", overlay=true, max_labels_count=200)

// SETTINGS
emaLength = input.int(9, "EMA Length")

// INDICATORS
ema9 = ta.ema(close, emaLength)
vwapValue = ta.vwap(hlc3)

// CHART
plot(vwapValue, "VWAP", color=color.orange, linewidth=2)
plot(ema9, "9 EMA", color=color.aqua, linewidth=2)

// STATE
// 0 = No active trade
// 1 = PUT active
// 2 = CALL active

var int state = 0

// CROSSOVER CONDITIONS
vwapUp = ta.crossover(close, vwapValue)
vwapDown = ta.crossunder(close, vwapValue)

emaUp = ta.crossover(close, ema9)
emaDown = ta.crossunder(close, ema9)

// SIGNALS
bool buyPut = false
bool buyCall = false
bool exitPut = false
bool exitCall = false

if barstate.isconfirmed

    // NO ACTIVE TRADE
    if state == 0

        if vwapDown
            buyPut := true
            state := 1

        else if vwapUp
            buyCall := true
            state := 2

    // PUT ACTIVE - BEARISH TREND
    else if state == 1

        // REVERSE: VWAP AND EMA9 BOTH CROSSED UP
        if vwapUp and close > ema9
            buyCall := true
            state := 2

        // EXIT PUT: EMA9 CROSSED UP ONLY
        else if emaUp
            exitPut := true
            state := 0

    // CALL ACTIVE - BULLISH TREND
    else if state == 2

        // REVERSE: VWAP AND EMA9 BOTH CROSSED DOWN
        if vwapDown and close < ema9
            buyPut := true
            state := 1

        // EXIT CALL: EMA9 CROSSED DOWN ONLY
        else if emaDown
            exitCall := true
            state := 0`}
          </pre>
          <div className="pt-3 flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Executed only on confirmed (completed) 5-minute candles. Bar repaint is impossible.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
