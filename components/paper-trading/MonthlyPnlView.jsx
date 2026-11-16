"use client";

import { useState } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MonthlyPnlView({
  monthlyData,
  selectedYear,
  selectedMonth,
  onMonthChange,
  isLoading,
}) {
  const months = [
    { num: 1, name: "January" },
    { num: 2, name: "February" },
    { num: 3, name: "March" },
    { num: 4, name: "April" },
    { num: 5, name: "May" },
    { num: 6, name: "June" },
    { num: 7, name: "July" },
    { num: 8, name: "August" },
    { num: 9, name: "September" },
    { num: 10, name: "October" },
    { num: 11, name: "November" },
    { num: 12, name: "December" },
  ];

  const years = [2024, 2025, 2026, 2027];

  const totalNet = monthlyData?.totalNetPnl || 0;
  const isNetPositive = totalNet >= 0;

  return (
    <div className="space-y-4">
      {/* Month & Year Selectors Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/60 border border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Monthly Performance Analytics</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(selectedYear, parseInt(e.target.value, 10))}
            className="text-xs bg-slate-950 border border-border rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            aria-label="Select month"
          >
            {months.map((m) => (
              <option key={m.num} value={m.num}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => onMonthChange(parseInt(e.target.value, 10), selectedMonth)}
            className="text-xs bg-slate-950 border border-border rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            aria-label="Select year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monthly Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-border font-mono">
          <span className="text-[11px] text-slate-400 block">Monthly Realized Net</span>
          <span
            className={`text-lg md:text-xl font-bold block mt-0.5 ${
              isNetPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isNetPositive ? "+" : ""}₹{totalNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Gross: ₹{monthlyData?.totalGrossPnl?.toLocaleString("en-IN") || 0}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-border font-mono">
          <span className="text-[11px] text-slate-400 block">Monthly Win Rate</span>
          <span className="text-lg md:text-xl font-bold text-slate-100 block mt-0.5">
            {monthlyData?.winRate || 0}%
          </span>
          <span className="text-[10px] text-slate-400 block">
            <span className="text-emerald-400">{monthlyData?.winningTrades || 0}W</span> /{" "}
            <span className="text-rose-400">{monthlyData?.losingTrades || 0}L</span> of{" "}
            {monthlyData?.totalTrades || 0}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-border font-mono">
          <span className="text-[11px] text-slate-400 block">Avg Winning Trade</span>
          <span className="text-lg md:text-xl font-bold text-emerald-400 block mt-0.5">
            +₹{monthlyData?.avgWinner?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || 0}
          </span>
          <span className="text-[10px] text-slate-500 block">Per winning execution</span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-border font-mono">
          <span className="text-[11px] text-slate-400 block">Avg Losing Trade</span>
          <span className="text-lg md:text-xl font-bold text-rose-400 block mt-0.5">
            -₹{monthlyData?.avgLoser?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || 0}
          </span>
          <span className="text-[10px] text-slate-500 block">Per losing execution</span>
        </div>
      </div>

      {/* Date-wise Breakdown Table */}
      <div className="rounded-lg border border-border bg-slate-900/60 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-border uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Trading Date (IST)</th>
              <th className="py-2.5 px-3 text-center">Trades Closed</th>
              <th className="py-2.5 px-3 text-center">Win / Loss</th>
              <th className="py-2.5 px-3 text-right">Gross P&amp;L</th>
              <th className="py-2.5 px-3 text-right">Charges</th>
              <th className="py-2.5 px-3 text-right">Net Realized P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {!monthlyData?.dailyBreakdown || monthlyData.dailyBreakdown.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  {isLoading ? "Loading monthly data..." : "No closed trades recorded in this month."}
                </td>
              </tr>
            ) : (
              monthlyData.dailyBreakdown.map((row) => {
                const isDayPositive = (row.netPnl || 0) >= 0;
                return (
                  <tr key={row.date} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{row.date}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{row.tradesCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-emerald-400">{row.winningCount}W</span>{" "}
                      <span className="text-slate-500">/</span>{" "}
                      <span className="text-rose-400">{row.losingCount}L</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      ₹{row.grossPnl?.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      ₹{row.charges?.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isDayPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isDayPositive ? "+" : ""}₹{row.netPnl?.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 font-mono">
        * Note: Under standard financial accounting rules, a trade is counted in realized P&amp;L on its <strong>exit date</strong> in Asia/Kolkata timezone.
      </p>
    </div>
  );
}

