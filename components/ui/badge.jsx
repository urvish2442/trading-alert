import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        buy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono tracking-wide",
        sell: "border-red-500/40 bg-red-500/10 text-red-400 font-mono tracking-wide",
        buyCall: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-mono tracking-wide",
        buyPut: "border-red-500/40 bg-red-500/15 text-red-400 font-mono tracking-wide",
        exitCall: "border-orange-500/40 bg-orange-500/15 text-orange-400 font-mono tracking-wide",
        exitPut: "border-amber-500/40 bg-amber-500/15 text-amber-400 font-mono tracking-wide",
        neutral: "border-slate-700 bg-slate-800/80 text-slate-300 font-mono tracking-wide",
        warning: "border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono tracking-wide",
        terminal: "border-slate-800 bg-slate-900/90 text-slate-300 font-mono text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

