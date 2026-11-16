"use client";

import { useState } from "react";
import { Sliders, X, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaperSettingsDialog({ settings, isOpen, onClose, onSave }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [itmDistance, setItmDistance] = useState(settings?.itmDistance ?? 100);
  const [numberOfLots, setNumberOfLots] = useState(settings?.numberOfLots ?? 1);
  const [fillMethod, setFillMethod] = useState(settings?.fillMethod || "ASK_BID");
  const [exitOnNeutral, setExitOnNeutral] = useState(settings?.exitOnNeutral ?? false);
  const [estimatedCharges, setEstimatedCharges] = useState(settings?.estimatedCharges ?? 0);
  const [quoteFreshnessLimit, setQuoteFreshnessLimit] = useState(
    settings?.quoteFreshnessLimit ?? 60
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        enabled,
        itmDistance: Number(itmDistance),
        numberOfLots: Number(numberOfLots),
        fillMethod,
        exitOnNeutral,
        estimatedCharges: Number(estimatedCharges),
        quoteFreshnessLimit: Number(quoteFreshnessLimit),
      });
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog Window */}
      <div className="relative w-full max-w-lg bg-slate-950 border border-border rounded-xl shadow-2xl p-5 z-10 space-y-4 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Paper Trading Configuration</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-slate-400 hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-border">
            <div>
              <span className="font-semibold text-slate-200 block">Simulation Engine Active</span>
              <span className="text-[11px] text-slate-400">
                Automatically simulate option buying on strategy signals
              </span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* ITM Distance */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              In-The-Money (ITM) Strike Offset:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 150].map((dist) => (
                <button
                  type="button"
                  key={dist}
                  onClick={() => setItmDistance(dist)}
                  className={`py-1.5 px-3 rounded border text-xs font-bold transition-colors ${
                    itmDistance === dist
                      ? "bg-emerald-950/60 border-emerald-500 text-emerald-400"
                      : "bg-slate-900 border-border text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {dist} Points ITM
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Default: 100 pts. CE strike = ATM - {itmDistance}; PE strike = ATM + {itmDistance}.
            </p>
          </div>

          {/* Number of Lots */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Number of Lots to Trade:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numberOfLots}
              onChange={(e) => setNumberOfLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-slate-900 border border-border rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500">
              Standard NIFTY lot size (typically 75) is applied dynamically from instrument master.
            </p>
          </div>

          {/* Fill Method */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Execution Fill Price Method:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFillMethod("ASK_BID")}
                className={`py-1.5 px-3 rounded border text-xs font-semibold text-center ${
                  fillMethod === "ASK_BID"
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-400 font-bold"
                    : "bg-slate-900 border-border text-slate-400 hover:text-slate-200"
                }`}
              >
                Best Ask / Bid (Realistic)
              </button>
              <button
                type="button"
                onClick={() => setFillMethod("LTP")}
                className={`py-1.5 px-3 rounded border text-xs font-semibold text-center ${
                  fillMethod === "LTP"
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-400 font-bold"
                    : "bg-slate-900 border-border text-slate-400 hover:text-slate-200"
                }`}
              >
                Last Traded Price (LTP)
              </button>
            </div>
          </div>

          {/* Neutral Exit */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-border">
            <div>
              <span className="font-semibold text-slate-200 block">Exit on Neutral Strategy State</span>
              <span className="text-[11px] text-slate-400">
                Close position when strategy transitions from Buy/Sell to Flat (Default: False)
              </span>
            </div>
            <input
              type="checkbox"
              checked={exitOnNeutral}
              onChange={(e) => setExitOnNeutral(e.target.checked)}
              className="h-4 w-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Estimated Charges */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Estimated Transaction Charges per Trade (₹):
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={estimatedCharges}
              onChange={(e) => setEstimatedCharges(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-border rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500">
              Deducted from gross P&amp;L to calculate net realized return (default: 0).
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Save Configuration</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

