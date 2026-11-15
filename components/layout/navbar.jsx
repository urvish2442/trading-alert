"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Clock,
  LogOut,
  TrendingUp,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InstallPromptButton } from "@/components/pwa/InstallPromptButton";

export function Navbar({ onMobileMenuToggle }) {
  const router = useRouter();
  const [istTime, setIstTime] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [quote, setQuote] = useState(null);
  const [marketStatus, setMarketStatus] = useState("WAITING FOR DATA");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      setIstTime(formatted);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchMarketData() {
      try {
        const [quoteRes, statusRes] = await Promise.allSettled([
          fetch("/api/market/quote"),
          fetch("/api/market/status"),
        ]);

        if (quoteRes.status === "fulfilled" && quoteRes.value.ok) {
          const data = await quoteRes.value.json();
          if (data.quote) {
            setQuote(data.quote);
          }
        }

        if (statusRes.status === "fulfilled" && statusRes.value.ok) {
          const data = await statusRes.value.json();
          if (data.market?.state) {
            setMarketStatus(data.market.state);
          }
        }
      } catch {
        // Fallback
      }
    }

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  };

  const isMarketOpen = marketStatus === "MARKET OPEN";
  const isPositive = quote && quote.change >= 0;

  return (
    <header className="h-16 border-b border-border bg-slate-950/70 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Trigger & Index Ticker */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onMobileMenuToggle}
          className="lg:hidden h-9 w-9 border-border bg-slate-900/60"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5 text-slate-300" />
        </Button>

        {/* NIFTY 50 Spot Ticker Quick View */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/60 border border-border/80">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-bold font-mono tracking-wider text-slate-200">NIFTY 50</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-100">
            {quote ? quote.price.toLocaleString("en-IN") : "--"}
          </span>
          {quote && (
            <span className={`text-[11px] font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{quote.change} ({isPositive ? "+" : ""}{quote.changePercent}%)
            </span>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
            SPOT
          </span>
        </div>
      </div>

      {/* Right: Market Status, IST Clock, Session */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Market Status Pill */}
        <div className="flex items-center gap-1.5">
          <Badge
            variant={isMarketOpen ? "buy" : "neutral"}
            className="text-[11px] gap-1 px-2.5 py-1"
          >
            <CircleDot className={`h-2.5 w-2.5 ${isMarketOpen ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
            <span>{marketStatus}</span>
          </Badge>
        </div>

        {/* IST Live Time */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/60 border border-border/60 px-2.5 py-1 rounded-md">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{istTime || "--:--:--"} IST</span>
        </div>

        {/* PWA Install Button */}
        <InstallPromptButton />

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-slate-400 hover:text-red-400 hover:bg-slate-900 text-xs gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isLoggingOut ? "Exiting..." : "Logout"}</span>
        </Button>
      </div>
    </header>
  );
}
