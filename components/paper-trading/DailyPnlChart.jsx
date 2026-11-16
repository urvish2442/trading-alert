"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function DailyPnlChart({ data = [] }) {
  const maxAbsPnl = useMemo(() => {
    if (!data || data.length === 0) return 1000;
    const maxVal = Math.max(...data.map((d) => Math.abs(d.netPnl || 0)));
    return maxVal > 0 ? maxVal : 1000;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-border">
        <CardContent className="p-6 text-center text-xs text-slate-500 font-mono">
          No daily closed trades available to display yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/60 border-border">
      <CardHeader className="p-4 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span>Daily Realized Net P&amp;L Performance</span>
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-400">Past 30 Days (IST)</span>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Bars Container */}
        <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 overflow-x-auto">
          {data.map((item) => {
            const pnl = item.netPnl || 0;
            const isProfit = pnl >= 0;
            const heightPct = Math.min(100, Math.max(8, Math.round((Math.abs(pnl) / maxAbsPnl) * 100)));

            const shortDate = item.date.slice(5); // MM-DD

            return (
              <div
                key={item.date}
                className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-950 border border-border p-1.5 rounded shadow-xl pointer-events-none text-[10px] font-mono whitespace-nowrap">
                  <span className="text-slate-400">{item.date}</span>
                  <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfit ? "+" : ""}₹{pnl.toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-500">{item.tradesCount} trade(s)</span>
                </div>

                {/* Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t transition-all ${
                    isProfit
                      ? "bg-emerald-500/80 hover:bg-emerald-400 group-hover:brightness-125"
                      : "bg-rose-500/80 hover:bg-rose-400 group-hover:brightness-125"
                  }`}
                />

                {/* Date Label */}
                <span className="text-[9px] font-mono text-slate-500 mt-1 truncate w-full text-center">
                  {shortDate}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
