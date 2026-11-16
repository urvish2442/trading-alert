"use client";

import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  DollarSign,
  Activity,
  Layers,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PaperSummaryCards({ summary }) {
  if (!summary) return null;

  const realizedNet = summary.totalRealizedNetPnl || 0;
  const unrealized = summary.currentUnrealizedPnl || 0;
  const combinedNet = summary.totalCombinedNetPnl || 0;
  const isRealizedPositive = realizedNet >= 0;
  const isUnrealizedPositive = unrealized >= 0;
  const isCombinedPositive = combinedNet >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 1. Total Net P&L (Combined) */}
      <Card className="bg-slate-900/60 border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Total Combined P&amp;L</span>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div
            className={`text-xl md:text-2xl font-bold font-mono ${
              isCombinedPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isCombinedPositive ? "+" : ""}₹{combinedNet.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Realized + Open Mark-to-Market
          </p>
        </CardContent>
      </Card>

      {/* 2. Realized Net P&L */}
      <Card className="bg-slate-900/60 border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Realized Net P&amp;L</span>
            {isRealizedPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div
            className={`text-xl md:text-2xl font-bold font-mono ${
              isRealizedPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isRealizedPositive ? "+" : ""}₹{realizedNet.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            From {summary.totalTrades || 0} closed trades
          </p>
        </CardContent>
      </Card>

      {/* 3. Win Rate */}
      <Card className="bg-slate-900/60 border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Win Rate</span>
            <Percent className="h-4 w-4 text-sky-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-xl md:text-2xl font-bold font-mono text-slate-100">
            {summary.winRate || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            <span className="text-emerald-400">{summary.winningTrades || 0}W</span> /{" "}
            <span className="text-rose-400">{summary.losingTrades || 0}L</span>
          </p>
        </CardContent>
      </Card>

      {/* 4. Active Position State */}
      <Card className="bg-slate-900/60 border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Active Position</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center gap-2 mt-0.5">
            {summary.openPosition ? (
              <Badge
                variant={summary.openPosition.optionType === "CE" ? "buy" : "sell"}
                className="text-xs px-2.5 py-0.5 font-bold font-mono"
              >
                {summary.openPosition.optionType === "CE" ? "LONG CE" : "LONG PE"}
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-xs px-2 py-0.5 font-mono">
                FLAT (NO TRADE)
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
            {summary.openPosition ? (
              <span className={isUnrealizedPositive ? "text-emerald-400" : "text-rose-400"}>
                Unrealized: {isUnrealizedPositive ? "+" : ""}₹{unrealized.toLocaleString("en-IN")}
              </span>
            ) : (
              "Waiting for next signal"
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

