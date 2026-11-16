"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertCircle,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OpenPositionCard({ position, onManualExit, isExiting }) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!position) {
    return (
      <Card className="bg-slate-900/40 border-border border-dashed">
        <CardContent className="p-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-slate-800/80 text-slate-400 mb-1">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Active Paper Position</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The paper-trading engine is running in idle mode. When the strategy detects a confirmed
            5-minute signal, an In-The-Money (ITM) option position will open automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isCall = position.optionType === "CE";
  const unrealizedPnl = position.unrealizedPnl || 0;
  const isProfit = unrealizedPnl >= 0;
  const returnPct = position.returnPercentage || 0;
  const pointDiff = (position.currentPremium || position.entryPremium) - position.entryPremium;

  const entryTimeFormatted = position.entryTimestamp
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date(position.entryTimestamp))
    : "--";

  const expiryFormatted = position.expiryDate
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(position.expiryDate))
    : "--";

  return (
    <Card className="bg-slate-900/80 border-emerald-500/30 shadow-lg relative overflow-hidden">
      {/* Accent Top Bar */}
      <div
        className={`absolute top-0 inset-x-0 h-1 ${
          isCall ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />

      <CardHeader className="p-4 md:p-5 pb-3 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Badge
              variant={isCall ? "buy" : "sell"}
              className="text-xs px-2.5 py-1 font-bold font-mono tracking-wide"
            >
              {isCall ? "BUY CALL (CE)" : "BUY PUT (PE)"}
            </Badge>
            <span className="font-mono text-sm md:text-base font-bold text-slate-100">
              {position.optionSymbol}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Entry: {entryTimeFormatted} IST</span>
          </div>
        </div>
        <CardDescription className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
          <span>Strike: {position.strikePrice}</span>
          <span>•</span>
          <span>Expiry: {expiryFormatted}</span>
          <span>•</span>
          <span>
            Qty: {position.totalQuantity} ({position.numberOfLots} Lot{position.numberOfLots > 1 ? "s" : ""})
          </span>
          <span>•</span>
          <span>Fill: {position.entryFillMethod || "ASK"}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Price & P&L Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-border/60">
            <span className="text-[11px] text-slate-400 block">Entry Premium</span>
            <span className="text-base font-bold text-slate-200">
              ₹{position.entryPremium?.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 block">Spot @ {position.entrySpotPrice}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-border/60">
            <span className="text-[11px] text-slate-400 block">Current Premium</span>
            <span className="text-base font-bold text-slate-100">
              ₹{(position.currentPremium || position.entryPremium)?.toFixed(2)}
            </span>
            <span className={`text-[10px] font-semibold block ${pointDiff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {pointDiff >= 0 ? "+" : ""}{pointDiff.toFixed(2)} pts
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-border/60 col-span-2 sm:col-span-2 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[11px] text-slate-400">Live Unrealized P&amp;L</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                  isProfit ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                }`}
              >
                {isProfit ? "+" : ""}{returnPct.toFixed(2)}%
              </span>
            </div>
            <div
              className={`text-xl md:text-2xl font-bold ${
                isProfit ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isProfit ? "+" : ""}₹{unrealizedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Action Controls & Safety Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Single-Position Guaranteed • Simulated Paper Execution Only</span>
          </div>

          <div className="flex items-center gap-2">
            {!showConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="text-xs border-rose-500/40 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 gap-1.5 font-semibold h-8"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Manual Paper Exit</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    onManualExit(position.tradeId);
                    setShowConfirm(false);
                  }}
                  disabled={isExiting}
                  className="text-xs h-8 gap-1.5 font-bold"
                >
                  {isExiting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  <span>Confirm Exit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirm(false)}
                  className="text-xs h-8 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

