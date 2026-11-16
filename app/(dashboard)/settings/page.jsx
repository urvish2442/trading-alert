"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Database,
  Cpu,
  Clock,
  Shield,
  RefreshCw,
  CheckCircle2,
  Radio,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [marketStatus, setMarketStatus] = useState(null);
  const [notifStatus, setNotifStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Date Range Resync States (defaults to current date in IST)
  const getTodayIST = () => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const [fromDate, setFromDate] = useState(getTodayIST);
  const [toDate, setToDate] = useState(getTodayIST);
  const [isDateResyncing, setIsDateResyncing] = useState(false);
  const [resyncDetails, setResyncDetails] = useState(null);

  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const [healthRes, marketRes, notifRes] = await Promise.allSettled([
        fetch("/api/health"),
        fetch("/api/market/status"),
        fetch("/api/notifications/status"),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        setHealth(await healthRes.value.json());
      }
      if (marketRes.status === "fulfilled" && marketRes.value.ok) {
        setMarketStatus(await marketRes.value.json());
      }
      if (notifRes.status === "fulfilled" && notifRes.value.ok) {
        setNotifStatus(await notifRes.value.json());
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleManualSync = async (range = "5d") => {
    setIsSyncing(true);
    setActionMessage("");
    setResyncDetails(null);
    try {
      const res = await fetch("/api/market/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(
          `Synced ${data.data?.totalFetched} candles (${data.data?.newInserted} new inserted) from ${data.data?.provider || "provider"}!`
        );
        await loadDiagnostics();
      } else {
        setActionMessage("Sync error: " + (data.error || "Failed"));
      }
    } catch (err) {
      setActionMessage("Sync error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDateResync = async () => {
    if (!fromDate || !toDate) {
      setActionMessage("Please select both From Date and To Date.");
      return;
    }

    setIsDateResyncing(true);
    setActionMessage("");
    setResyncDetails(null);
    try {
      const res = await fetch("/api/market/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        setResyncDetails(data.data);
        await loadDiagnostics();
      } else {
        setActionMessage("Date resync error: " + (data.error || "Failed"));
      }
    } catch (err) {
      setActionMessage("Date resync error: " + err.message);
    } finally {
      setIsDateResyncing(false);
    }
  };

  const setDatePreset = (daysAgoStart, daysAgoEnd = 0) => {
    const today = new Date();
    const d1 = new Date(today.getTime() - daysAgoStart * 86400000);
    const d2 = new Date(today.getTime() - daysAgoEnd * 86400000);
    const fmt1 = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d1);
    const fmt2 = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d2);
    setFromDate(fmt1);
    setToDate(fmt2);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            Terminal Settings &amp; Diagnostics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            System diagnostics, MongoDB cluster status, market data providers, and scheduler telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="terminal" className="text-emerald-400 font-mono">
            SINGLE-USER PRIVATE INSTANCE
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadDiagnostics}
            disabled={isLoading}
            className="h-8 w-8 text-slate-400"
            aria-label="Refresh diagnostics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Date Range Resync & Strategy Audit Card */}
      <Card className="bg-slate-900/60 border-emerald-500/30 shadow-lg">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                <Calendar className="h-4 w-4 text-emerald-400" />
                Refetch &amp; Match Candles by Date Range
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Refetches 5-minute candles for the chosen date, matches against MongoDB Atlas, updates any discrepancies, and automatically reruns the strategy engine if updated.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset(0, 0)}
                className="h-7 px-2 text-[11px] font-mono text-slate-300 hover:text-emerald-400 border border-slate-800"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset(1, 1)}
                className="h-7 px-2 text-[11px] font-mono text-slate-300 hover:text-emerald-400 border border-slate-800"
              >
                Yesterday
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset(4, 0)}
                className="h-7 px-2 text-[11px] font-mono text-slate-300 hover:text-emerald-400 border border-slate-800"
              >
                Last 5 Days
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* From Date */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-slate-400 block">
                From Date (IST)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* To Date */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-slate-400 block">
                To Date (IST)
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Action Button */}
            <div className="sm:col-span-4">
              <Button
                variant="default"
                size="sm"
                onClick={handleDateResync}
                disabled={isDateResyncing || !fromDate || !toDate}
                className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isDateResyncing ? "animate-spin" : ""}`} />
                <span>{isDateResyncing ? "Refetching & Matching..." : "Refetch & Match with DB"}</span>
              </Button>
            </div>
          </div>

          {/* Resync Diagnostic Report */}
          {resyncDetails && (
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Match Report ({resyncDetails.fromDate} to {resyncDetails.toDate}):</span>
                <Badge
                  variant={resyncDetails.strategyRerun ? "buyCall" : "terminal"}
                  className="text-[10px]"
                >
                  {resyncDetails.strategyRerun ? "STRATEGY RE-EVALUATED" : "IN SYNC (NO RERUN)"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Total Fetched</span>
                  <span className="text-slate-200 font-bold text-sm">{resyncDetails.totalFetched}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Matched (Unchanged)</span>
                  <span className="text-emerald-400 font-bold text-sm">{resyncDetails.matchedUnchanged}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Updated OHLCV</span>
                  <span className={`font-bold text-sm ${resyncDetails.updatedCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                    {resyncDetails.updatedCount}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">New Inserted</span>
                  <span className={`font-bold text-sm ${resyncDetails.newInserted > 0 ? "text-sky-400" : "text-slate-400"}`}>
                    {resyncDetails.newInserted}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>Active Signals in Database:</span>
                <span className="text-slate-200 font-semibold">{resyncDetails.signalsCount} Signals</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Market Data Provider */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                Market Data Provider Architecture
              </span>
              <Badge variant="terminal" className="text-emerald-400 text-[10px]">
                {marketStatus?.provider?.active === "yahoo" ? "DEMO MODE" : "PRODUCTION"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Provider-agnostic ingestion pipeline (GEMINI.md Section 7)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Active Provider:</span>
              <span className="text-emerald-400 font-semibold">
                {marketStatus?.provider?.active === "yahoo" ? "Yahoo Finance API (Free Demo)" : "Zerodha Kite Connect"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Calculation Instrument:</span>
              <span className="text-slate-200">NIFTY 50 (5-Minute Completed Candles)</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Kite Connect Gateway:</span>
              <span className="text-slate-400">Ready for API credentials when purchased</span>
            </div>
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManualSync("5d")}
                disabled={isSyncing}
                className="w-full text-xs border-border bg-slate-900 hover:bg-slate-800 gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-emerald-400" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Latest 5-Day Candles"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Database & MongoDB Atlas Cluster */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-sky-400" />
                MongoDB Atlas Free Cluster
              </span>
              <Badge variant={health?.database?.isConnected ? "buy" : "sell"} className="text-[10px]">
                {health?.database?.isConnected ? "ONLINE" : "OFFLINE"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Mongoose ODM cached connection pool with compound idempotency indexes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Cluster Host:</span>
              <span className="text-slate-200">cluster0.6otw2fm.mongodb.net</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Database Name:</span>
              <span className="text-slate-200">{health?.database?.name || "trading_alert"}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Idempotency Constraints:</span>
              <span className="text-emerald-400">11 Models Indexed</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Active Subscriptions:</span>
              <span className="text-slate-200">{notifStatus?.totalSubscribers || 0} Devices</span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Market Session & Calendar */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                NSE Calendar &amp; Trading Hours
              </span>
              <Badge variant={marketStatus?.market?.isOpen ? "buy" : "neutral"} className="text-[10px]">
                {marketStatus?.market?.state || "CALCULATING"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              NSE Trading Session Timezone: Asia/Kolkata (IST)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs font-mono text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Session Window:</span>
              <span className="text-slate-200">09:15 to 15:30 IST</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Candle Interval:</span>
              <span className="text-slate-200">5 Minutes (Confirmed Closed)</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Session Status:</span>
              <span className="text-amber-400">{marketStatus?.market?.reason || "Weekend / Closed"}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Holidays Calendar:</span>
              <span className="text-emerald-400">2025 &amp; 2026 NSE Holidays Loaded</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. External Scheduler Telemetry */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-400" />
                External Scheduler (Cron Endpoint)
              </span>
              <Badge variant="terminal" className="text-emerald-400 text-[10px]">
                PROTECTED
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Stateless 5-minute execution via CRON_SECRET (Milestone 7)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs font-mono text-slate-300">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Endpoint:</span>
              <span className="text-slate-200">/api/cron/process-market</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Schedule:</span>
              <span className="text-slate-200">*/5 9-15 * * 1-5 IST</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Authentication:</span>
              <span className="text-emerald-400">CRON_SECRET Configured</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Max Function Duration:</span>
              <span className="text-slate-200">30 seconds (Vercel Serverless)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety & Execution Disclaimer */}
      <div className="rounded-lg border border-border/80 bg-slate-950/60 p-4 flex items-start gap-3">
        <Shield className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed font-mono">
          <strong className="text-slate-200">Execution Safety Guarantee (GEMINI.md Section 2):</strong> This personal application is designed exclusively for technical monitoring and alert generation. Automated order placement, trade routing, or broker modifications are strictly prevented by architecture. All trades must be executed manually.
        </div>
      </div>
    </div>
  );
}
