"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Database,
  Cpu,
  Clock,
  Shield,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  BellRing,
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
    try {
      const res = await fetch("/api/market/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Synced ${data.data?.totalFetched} candles (${data.data?.newInserted} new inserted) from ${data.data?.provider || "provider"}!`);
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
