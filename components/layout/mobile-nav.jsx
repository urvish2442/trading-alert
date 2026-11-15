"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  CandlestickChart,
  Sliders,
  BellRing,
  Settings,
  X,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Signals", href: "/signals", icon: Radio },
  { name: "Charts", href: "/charts", icon: CandlestickChart },
  { name: "Strategy", href: "/strategy", icon: Sliders },
  { name: "Notifications", href: "/notifications", icon: BellRing },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav({ isOpen, onClose }) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-border p-4 shadow-xl flex flex-col justify-between z-10">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Terminal className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-100">NIFTY 50 PWA</span>
                <span className="block text-[10px] text-slate-400 font-mono">Intraday Alerts</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav links */}
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-800 text-slate-100 border-l-2 border-emerald-500 pl-3"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/80 text-[11px] text-slate-500 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Alerting System Only</span>
          </div>
          <p className="text-[10px]">Trades must be manually executed by user on broker terminal.</p>
        </div>
      </div>
    </div>
  );
}

