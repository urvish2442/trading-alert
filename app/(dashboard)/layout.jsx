"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  CandlestickChart,
  Settings,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { cn } from "@/lib/utils";

const quickMobileTabs = [
  { name: "Terminal", href: "/dashboard", icon: LayoutDashboard },
  { name: "Signals", href: "/signals", icon: Radio },
  { name: "Charts", href: "/charts", icon: CandlestickChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex">
      {/* Auto Service Worker Registration */}
      <ServiceWorkerRegister />

      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Mobile Slide Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMobileMenuToggle={() => setMobileNavOpen((prev) => !prev)} />
        <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Sticky Bottom Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-slate-950/95 border-t border-border backdrop-blur-md flex items-center justify-around px-2 z-20">
          {quickMobileTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon className={cn("h-4 w-4 mb-0.5", isActive ? "text-emerald-400" : "text-slate-400")} />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

