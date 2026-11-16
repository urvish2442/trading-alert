"use client";

import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TradeHistoryTable({
  trades,
  total,
  page,
  totalPages,
  onPageChange,
  filters,
  onFilterChange,
  isLoading,
}) {
  const formatTime = (ts) => {
    if (!ts) return "--";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  };

  return (
    <div className="space-y-3">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Option Type Filter */}
          <select
            value={filters.optionType || "ALL"}
            onChange={(e) => onFilterChange("optionType", e.target.value === "ALL" ? "" : e.target.value)}
            className="text-xs bg-slate-900 border border-border rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            aria-label="Filter by option type"
          >
            <option value="ALL">All Contracts</option>
            <option value="CE">Call Options (CE)</option>
            <option value="PE">Put Options (PE)</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={filters.outcome || "ALL"}
            onChange={(e) => onFilterChange("outcome", e.target.value === "ALL" ? "" : e.target.value)}
            className="text-xs bg-slate-900 border border-border rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            aria-label="Filter by outcome"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WINNING">Winning Trades</option>
            <option value="LOSING">Losing Trades</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status || "ALL"}
            onChange={(e) => onFilterChange("status", e.target.value === "ALL" ? "" : e.target.value)}
            className="text-xs bg-slate-900 border border-border rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {trades.length} of {total} trade{total === 1 ? "" : "s"}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-border bg-slate-900/60 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-border uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Contract / Type</th>
              <th className="py-2.5 px-3">Entry Time</th>
              <th className="py-2.5 px-3">Exit Time</th>
              <th className="py-2.5 px-3 text-right">Entry / Exit (₹)</th>
              <th className="py-2.5 px-3 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Net P&amp;L</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3">Exit Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {isLoading ? "Loading paper trades..." : "No paper trades found matching the filters."}
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const isCall = t.optionType === "CE";
                const isClosed = t.status === "CLOSED" || t.status === "EXPIRED";
                const isProfit = (t.netPnl || 0) > 0;
                const isLoss = (t.netPnl || 0) < 0;

                return (
                  <tr key={t.tradeId || t._id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Contract */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={isCall ? "buy" : "sell"}
                          className="text-[10px] px-1.5 py-0 font-bold"
                        >
                          {t.optionType}
                        </Badge>
                        <span className="font-bold text-slate-100">{t.optionSymbol}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Strike: {t.strikePrice}
                      </span>
                    </td>

                    {/* Entry Time */}
                    <td className="py-2.5 px-3 text-slate-300">
                      {formatTime(t.entryTimestamp)}
                    </td>

                    {/* Exit Time */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {t.exitTimestamp ? formatTime(t.exitTimestamp) : <span className="text-emerald-400">In Progress</span>}
                    </td>

                    {/* Prices */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="text-slate-200">
                        ₹{t.entryPremium?.toFixed(2)} &rarr; {t.exitPremium ? `₹${t.exitPremium.toFixed(2)}` : "--"}
                      </div>
                      {isClosed && (
                        <span
                          className={`text-[10px] ${
                            isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"
                          }`}
                        >
                          {t.returnPercentage >= 0 ? "+" : ""}
                          {t.returnPercentage?.toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      <span>{t.totalQuantity}</span>
                      <span className="text-[10px] text-slate-500 block">({t.numberOfLots}L)</span>
                    </td>

                    {/* Net P&L */}
                    <td className="py-2.5 px-3 text-right">
                      {isClosed ? (
                        <div
                          className={`font-bold ${
                            isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"
                          }`}
                        >
                          {t.netPnl >= 0 ? "+" : ""}₹{t.netPnl?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          ₹{t.unrealizedPnl?.toFixed(2)} (Open)
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant={t.status === "OPEN" ? "terminal" : t.status === "EXPIRED" ? "neutral" : "outline"}
                        className={`text-[10px] uppercase ${
                          t.status === "OPEN" ? "text-emerald-400 border-emerald-500/40" : "text-slate-400"
                        }`}
                      >
                        {t.status}
                      </Badge>
                    </td>

                    {/* Exit Reason */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {t.exitReason || "--"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="text-xs h-8 border-border bg-slate-900 gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </Button>

          <span className="text-xs font-mono text-slate-400">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="text-xs h-8 border-border bg-slate-900 gap-1"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

