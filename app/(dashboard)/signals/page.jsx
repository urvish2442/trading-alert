"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATE_NAMES = {
  0: "FLAT",
  1: "PUT",
  2: "CALL",
};

export default function SignalsPage() {
  const [signals, setSignals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  const fetchSignals = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      let url = `/api/signals?page=${page}&limit=15`;
      if (typeFilter !== "ALL") {
        url += `&type=${encodeURIComponent(typeFilter)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSignals(data.signals || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setErrorMessage(data.error || "Failed to load signals from server");
      }
    } catch (err) {
      setErrorMessage("Network error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSignals = async () => {
    if (!confirm("Are you sure you want to delete all historical signals from MongoDB?")) {
      return;
    }
    setIsClearing(true);
    setActionMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/signals", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "All signals cleared from MongoDB!");
        setSignals([]);
        setTotal(0);
        setTotalPages(1);
      } else {
        setErrorMessage(data.error || "Failed to clear signals");
      }
    } catch (err) {
      setErrorMessage("Error: " + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleReplayStrategy = async () => {
    setIsReplaying(true);
    setActionMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/strategies/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "replay" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Replayed Option Buyer Strategy: Generated ${data.signalsGenerated || 0} signals across ${data.totalCandles || 0} candles.`);
        await fetchSignals();
      } else {
        setErrorMessage(data.error || "Failed to evaluate strategy");
      }
    } catch (err) {
      setErrorMessage("Error: " + err.message);
    } finally {
      setIsReplaying(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [page, typeFilter]);

  const getSignalBadge = (type) => {
    switch (type) {
      case "BUY CALL":
        return (
          <Badge variant="buyCall" className="gap-1 font-bold tracking-wider text-[11px] border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            BUY CALL
          </Badge>
        );
      case "BUY PUT":
        return (
          <Badge variant="buyPut" className="gap-1 font-bold tracking-wider text-[11px] border-red-500/40 bg-red-500/15 text-red-400">
            <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
            BUY PUT
          </Badge>
        );
      case "EXIT CALL":
        return (
          <Badge variant="exitCall" className="gap-1 font-bold tracking-wider text-[11px] border-orange-500/40 bg-orange-500/15 text-orange-400">
            <LogOut className="h-3 w-3 text-orange-400" />
            EXIT CALL
          </Badge>
        );
      case "EXIT PUT":
        return (
          <Badge variant="exitPut" className="gap-1 font-bold tracking-wider text-[11px] border-amber-500/40 bg-amber-500/15 text-amber-400">
            <LogOut className="h-3 w-3 text-amber-400" />
            EXIT PUT
          </Badge>
        );
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  const formatTransition = (sig) => {
    const from = STATE_NAMES[sig.previousState] || "FLAT";
    const to = STATE_NAMES[sig.newState] || "FLAT";
    const isReversal =
      (sig.previousState === 1 && sig.newState === 2) ||
      (sig.previousState === 2 && sig.newState === 1);

    return (
      <span className="text-[11px] text-slate-300">
        {from} &rarr; <span className="font-semibold text-slate-100">{to}</span>
        {isReversal && (
          <span className="ml-1 text-[10px] text-amber-400 font-normal">(Reversal)</span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-400" />
            NIFTY Option Buyer Signals
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified signals generated by Pine Script v6: BUY CALL, BUY PUT, EXIT CALL, and EXIT PUT
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplayStrategy}
            disabled={isReplaying || isClearing}
            className="h-8 text-xs gap-1.5 border-emerald-500/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30"
          >
            <Play className={`h-3.5 w-3.5 ${isReplaying ? "animate-spin" : ""}`} />
            <span>{isReplaying ? "Replaying..." : "Replay Strategy"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSignals}
            disabled={isClearing || isReplaying || total === 0}
            className="h-8 text-xs gap-1.5 border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-900/30"
          >
            <Trash2 className={`h-3.5 w-3.5 ${isClearing ? "animate-spin" : ""}`} />
            <span>{isClearing ? "Clearing..." : "Clear All"}</span>
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-md bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <Button variant="ghost" size="sm" onClick={fetchSignals} className="h-6 text-[11px] text-red-300 underline">
            Retry
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            variant={typeFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTypeFilter("ALL"); setPage(1); }}
            className="h-8 text-xs border-border"
          >
            All ({total})
          </Button>
          <Button
            variant={typeFilter === "BUY CALL" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTypeFilter("BUY CALL"); setPage(1); }}
            className={`h-8 text-xs border-emerald-500/30 ${typeFilter === "BUY CALL" ? "bg-emerald-600 text-slate-950 font-semibold" : "text-emerald-400 bg-emerald-950/20"}`}
          >
            BUY CALL
          </Button>
          <Button
            variant={typeFilter === "BUY PUT" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTypeFilter("BUY PUT"); setPage(1); }}
            className={`h-8 text-xs border-red-500/30 ${typeFilter === "BUY PUT" ? "bg-red-600 text-slate-950 font-semibold" : "text-red-400 bg-red-950/20"}`}
          >
            BUY PUT
          </Button>
          <Button
            variant={typeFilter === "EXIT CALL" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTypeFilter("EXIT CALL"); setPage(1); }}
            className={`h-8 text-xs border-orange-500/30 ${typeFilter === "EXIT CALL" ? "bg-orange-600 text-slate-950 font-semibold" : "text-orange-400 bg-orange-950/20"}`}
          >
            EXIT CALL
          </Button>
          <Button
            variant={typeFilter === "EXIT PUT" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTypeFilter("EXIT PUT"); setPage(1); }}
            className={`h-8 text-xs border-amber-500/30 ${typeFilter === "EXIT PUT" ? "bg-amber-600 text-slate-950 font-semibold" : "text-amber-400 bg-amber-950/20"}`}
          >
            EXIT PUT
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchSignals}
          disabled={isLoading}
          className="h-8 w-8 text-slate-400"
          aria-label="Refresh signals"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Signal List Table */}
      <Card className="bg-slate-900/50 border-border">
        <CardHeader className="p-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Verified Alert Stream (MongoDB Atlas)</span>
              <Badge variant="terminal">{total} TOTAL SIGNALS</Badge>
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">
              Page {page} of {totalPages}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Consecutive signals in the same direction are strictly suppressed to guarantee transition alerts only.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 border-b border-border/80 text-[11px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Signal</th>
                  <th className="py-2.5 px-3">Time (IST)</th>
                  <th className="py-2.5 px-3">Candle Close</th>
                  <th className="py-2.5 px-3">Session VWAP</th>
                  <th className="py-2.5 px-3">EMA 9</th>
                  <th className="py-2.5 px-3">State Transition</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {signals.map((sig) => (
                  <tr key={sig._id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4">
                      {getSignalBadge(sig.signalType)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {new Date(sig.candleTimestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-100">
                      ₹{sig.candleClose?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">
                      ₹{sig.vwap?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      ₹{sig.ema9?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3">
                      {formatTransition(sig)}
                    </td>
                    <td className="py-2.5 px-4 text-[10px]">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
                {signals.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No signals match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60">
              <span className="text-xs text-slate-400">
                Showing {signals.length} of {total} signals
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="h-8 text-xs border-border bg-slate-900/60"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="h-8 text-xs border-border bg-slate-900/60"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
