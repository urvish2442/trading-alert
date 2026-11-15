import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold font-mono tracking-tight">404 - Not Found</h1>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          The requested terminal resource or route could not be found.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs">
              <Home className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

