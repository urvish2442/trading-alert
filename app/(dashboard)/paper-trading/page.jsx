"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertCircle,
  FileText,
  DollarSign,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaperSummaryCards } from "@/components/paper-trading/PaperSummaryCards";
import { OpenPositionCard } from "@/components/paper-trading/OpenPositionCard";
import { TradeHistoryTable } from "@/components/paper-trading/TradeHistoryTable";
import { DailyPnlChart } from "@/components/paper-trading/DailyPnlChart";
import { MonthlyPnlView } from "@/components/paper-trading/MonthlyPnlView";
import { PaperSettingsDialog } from "@/components/paper-trading/PaperSettingsDialog";

export default function PaperTradingPage() {
  const [summary, setSummary] = useState(null);
  const [trades, setTrades] = useState([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ optionType: "", outcome: "", status: "" });

  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadSummaryAndOpenPosition = useCallback(async () => {
    try {
      const res = await fetch("/api/paper-trading/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error loading paper summary:", err);
    }
  }, []);

  const loadTradesList = useCallback(
    async (currentPage = page, currentFilters = filters) => {
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: "15",
        });
        if (currentFilters.optionType) params.set("optionType", currentFilters.optionType);
        if (currentFilters.outcome) params.set("outcome", currentFilters.outcome);
        if (currentFilters.status) params.set("status", currentFilters.status);

        const res = await fetch(`/api/paper-trading/trades?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTrades(data.trades || []);
          setTotalTrades(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("Error loading trades list:", err);
      }
    },
    [page, filters]
  );

  const loadAnalytics = useCallback(async (year = selectedYear, month = selectedMonth) => {
    try {
      const [dailyRes, monthlyRes] = await Promise.allSettled([
        fetch("/api/paper-trading/daily-pnl?days=30"),
        fetch(`/api/paper-trading/monthly-pnl?year=${year}&month=${month}`),
      ]);

      if (dailyRes.status === "fulfilled" && dailyRes.value.ok) {
        const json = await dailyRes.value.json();
        setDailyData(json.dailyPnl || []);
      }

      if (monthlyRes.status === "fulfilled" && monthlyRes.value.ok) {
        const json = await monthlyRes.value.json();
        setMonthlyData(json);
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
    }
  }, [selectedYear, selectedMonth]);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      loadSummaryAndOpenPosition(),
      loadTradesList(),
      loadAnalytics(),
    ]);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [loadSummaryAndOpenPosition, loadTradesList, loadAnalytics]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadSummaryAndOpenPosition, 10000); // 10s live valuation update
    return () => clearInterval(interval);
  }, [loadAllData, loadSummaryAndOpenPosition]);

  const handleManualExit = async (tradeId) => {
    setIsExiting(true);
    setActionMessage("");
    try {
      const res = await fetch("/api/paper-trading/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Position closed successfully");
        await loadAllData();
      } else {
        setActionMessage("Exit failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setActionMessage("Exit error: " + err.message);
    } finally {
      setIsExiting(false);
    }
  };

  const handleSaveSettings = async (updatedSettings) => {
    const res = await fetch("/api/paper-trading/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedSettings),
    });
    if (res.ok) {
      setActionMessage("Settings updated successfully");
      await loadSummaryAndOpenPosition();
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    loadTradesList(1, newFilters);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadTradesList(newPage, filters);
  };

  const handleMonthChange = (year, month) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    loadAnalytics(year, month);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100">
              NIFTY Options Paper Trading
            </h1>
            <Badge variant="terminal" className="text-emerald-400 text-xs uppercase font-mono">
              Simulated Execution
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Automated CE &amp; PE options buying engine based on Pine Script v6 strategy signals
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={isRefreshing}
            className="text-xs border-border bg-slate-900 hover:bg-slate-800 gap-1.5 h-8 font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="text-xs border-border bg-slate-900 hover:bg-slate-800 gap-1.5 h-8 font-mono"
          >
            <Sliders className="h-3.5 w-3.5 text-emerald-400" />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage("")} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>
      )}

      {/* 1. Summary Cards */}
      <PaperSummaryCards summary={summary} />

      {/* 2. Active Open Position */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span>Active Position Tracker</span>
        </h2>
        <OpenPositionCard
          position={summary?.openPosition}
          onManualExit={handleManualExit}
          isExiting={isExiting}
        />
      </div>

      {/* 3. Daily P&L Chart */}
      <DailyPnlChart data={dailyData} />

      {/* 4. Monthly Performance Analytics */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span>Monthly Accounting &amp; Performance</span>
        </h2>
        <MonthlyPnlView
          monthlyData={monthlyData}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          isLoading={isLoading}
        />
      </div>

      {/* 5. Historical Trades Table */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-400" />
          <span>Simulated Trade History</span>
        </h2>
        <TradeHistoryTable
          trades={trades}
          total={totalTrades}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
        />
      </div>

      {/* Safety Notice Footer */}
      <div className="rounded-lg border border-border/80 bg-slate-950/60 p-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed font-mono">
          <strong className="text-slate-200">Paper Trading Safety Isolation (GEMINI.md Section 11.1):</strong>{" "}
          This module is an automated simulation environment created to evaluate options buying performance.
          It is completely isolated from real broker trade execution and has zero access to order-placement APIs.
        </div>
      </div>

      {/* Settings Modal Dialog */}
      <PaperSettingsDialog
        settings={summary?.settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

