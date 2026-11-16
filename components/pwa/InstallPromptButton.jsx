"use client";

import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "./usePwaInstall";

export function InstallPromptButton() {
  const { isInstalled, canInstall, promptInstall } = usePwaInstall();

  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-mono px-2 py-1 bg-emerald-950/30 rounded border border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" />
        <span>PWA INSTALLED</span>
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={promptInstall}
      className="flex h-8 text-xs px-2.5 sm:px-3 gap-1.5 border-emerald-500/50 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 font-semibold shadow-sm animate-pulse"
      aria-label="Install NIFTY 50 Intraday Alert PWA"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Install App</span>
    </Button>
  );
}
