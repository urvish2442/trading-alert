"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  CandlestickChart,
  Sliders,
  BellRing,
  Settings,
  ShieldCheck,
  Activity,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Signals",
    href: "/signals",
    icon: Radio,
  },
  {
    name: "Charts",
    href: "/charts",
    icon: CandlestickChart,
  },
  {
    name: "Strategy",
    href: "/strategy",
    icon: Sliders,
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: BellRing,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setDbConnected(data.database?.isConnected || false);
        }
      } catch (err) {
        setDbConnected(false);
      }
    }
    checkHealth();
  }, []);

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-slate-950/80 backdrop-blur-md h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/80 gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Terminal className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
            NIFTY 50 <span className="text-[10px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono">PWA</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">VWAP + EMA Engine</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Terminal Modules
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-slate-100 border-l-2 border-emerald-500 pl-[10px]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-slate-400")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Terminal Live Status Card */}
      <div className="p-3 border-t border-border/70 space-y-2">
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-emerald-400 animate-pulse" /> Engine
            </span>
            <Badge variant="terminal" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-950/40">
              STANDBY
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Zerodha</span>
            <span className="text-slate-400 font-mono text-[10px]">Disconnected</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">MongoDB</span>
            <span className={cn("font-mono text-[10px]", dbConnected ? "text-emerald-400" : "text-amber-400")}>
              {dbConnected ? "Connected" : "Standby"}
            </span>
          </div>
        </div>

        {/* Security / Non-execution disclaimer */}
        <div className="px-2 py-1 text-[10px] text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-slate-400 shrink-0" />
          <span>Alerts only. No automated orders.</span>
        </div>
      </div>
    </aside>
  );
}
