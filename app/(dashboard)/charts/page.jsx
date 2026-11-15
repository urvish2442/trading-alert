"use client";

import { CandlestickChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FinancialChart } from "@/components/charts/FinancialChart";

export default function ChartsPage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <CandlestickChart className="h-5 w-5 text-emerald-400" />
            NIFTY 50 Financial Charts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            TradingView Lightweight Charts &bull; 5-Minute Candlesticks with Session VWAP, EMA 9, EMA 20, and Signal Markers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="terminal" className="text-slate-300">TIMEFRAME: 5 MIN</Badge>
          <Badge variant="terminal" className="text-emerald-400">PINE SCRIPT V6 OPTION BUYER</Badge>
        </div>
      </div>

      {/* Main Interactive Chart Card */}
      <Card className="bg-slate-900/50 border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>NIFTY 50 Intraday Technical Terminal</span>
                <Badge variant="buy" className="text-[10px]">LIVE CHART</Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Calculated strictly server-side by the unified calculation engine. Crossovers trigger deterministic state transitions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-amber-400">&bull; VWAP (HLC3)</span>
              <span className="text-cyan-400">&bull; EMA 9 (Fast)</span>
              <span className="text-sky-400">&bull; EMA 20 (Slow)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <FinancialChart defaultLimit={200} />
        </CardContent>
      </Card>
    </div>
  );
}
