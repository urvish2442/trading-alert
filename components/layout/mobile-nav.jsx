"use client";

import { useState } from "react";
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
  Download,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/pwa/usePwaInstall";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Signals", href: "/signals", icon: Radio },
  { name: "Charts", href: "/charts", icon: CandlestickChart },
  { name: "Paper Trading", href: "/paper-trading", icon: Briefcase },
  { name: "Strategy", href: "/strategy", icon: Sliders },
  { name: "Notifications", href: "/notifications", icon: BellRing },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav({ isOpen, onClose }) {
  const pathname = usePathname();
  const { isInstalled, canInstall, promptInstall } = usePwaInstall();
  const [showTip, setShowTip] = useState(false);

  if (!isOpen) return null;

  const handleMobileInstall = async () => {
    if (canInstall) {
      const res = await promptInstall();
      if (res.outcome === "accepted") {
        onClose();
      }
    } else {
      setShowTip((prev) => !prev);
    }
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-slate-950 border-r border-border p-4 shadow-xl flex flex-col justify-between z-10 overflow-y-auto">
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

          {/* PWA Mobile Installation Section */}
          <div className="mt-6 pt-4 border-t border-border/70">
            {isInstalled ? (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold block">PWA Installed</span>
                  <span className="text-[10px] text-slate-400">Running in standalone mode</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900/90 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Download className="h-4 w-4" />
                  <span>Install App on Mobile</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Install on your Android home screen for full-screen view and background push alerts.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMobileInstall}
                  className="w-full h-8 text-xs font-semibold border-emerald-500/50 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{canInstall ? "Install App Now" : "How to Install"}</span>
                </Button>
                {showTip && (
                  <div className="mt-2 p-2 rounded bg-slate-950 border border-border text-[11px] text-slate-300 space-y-1">
                    <p className="font-semibold text-emerald-400">Android Chrome Steps:</p>
                    <p>1. Tap the 3 dots (⋮) in Chrome top-right.</p>
                    <p>2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                    <p className="font-semibold text-sky-400 pt-1">iOS Safari Steps:</p>
                    <p>Tap Share (⬆) &rarr; <strong>Add to Home Screen</strong>.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/80 text-[11px] text-slate-500 space-y-2 mt-6">
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
