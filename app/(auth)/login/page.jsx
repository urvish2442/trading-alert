"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Terminal, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/auth/setup");
        const data = await res.json();
        if (data.setupNeeded) {
          setIsSetupMode(true);
        }
      } catch {
        // Fallback to standard login
      } finally {
        setCheckingSetup(false);
      }
    }
    checkSetup();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (isSetupMode) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to initialize admin account");
          setIsLoading(false);
          return;
        }

        setSuccess("Admin account created! Redirecting to terminal...");
        setTimeout(() => {
          router.push(from);
          router.refresh();
        }, 800);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid credentials");
          setIsLoading(false);
          return;
        }

        setSuccess("Authenticated! Redirecting to terminal...");
        setTimeout(() => {
          router.push(from);
          router.refresh();
        }, 600);
      }
    } catch {
      setError("Network or server connection failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 space-y-6">
      {/* Brand identity */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center text-emerald-400 mb-1">
          <Terminal className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          NIFTY 50 Intraday Alert
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          VWAP + EMA 9/20 Personal Trading Terminal
        </p>
      </div>

      {/* Auth / Setup Card */}
      <Card className="bg-slate-950/80 border-border backdrop-blur-md shadow-2xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              {isSetupMode ? (
                <>
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                  First-Time Admin Setup
                </>
              ) : (
                "Single-User Authentication"
              )}
            </CardTitle>
            <Badge variant="terminal" className={isSetupMode ? "text-emerald-400 border-emerald-500/40" : "text-slate-400"}>
              {isSetupMode ? "SETUP" : "SECURED"}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400">
            {isSetupMode
              ? "No user exists yet. Configure your single administrator credentials below."
              : "Enter your administrator credentials to access the terminal."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Admin Email</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-slate-900/80 border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Password {isSetupMode && "(Min 8 characters)"}</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSetupMode ? "new-password" : "current-password"}
                className="bg-slate-900/80 border-border"
              />
            </div>

            {isSetupMode && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Confirm Password</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="bg-slate-900/80 border-border"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading || checkingSetup}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs h-9 gap-2"
            >
              <span>
                {isLoading
                  ? isSetupMode ? "Creating Account..." : "Authenticating..."
                  : isSetupMode ? "Initialize Administrator Account" : "Access Trading Terminal"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-400 leading-normal">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Public registration is disabled. Single private administrator account per GEMINI.md security rules.
              </span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#080c14] to-[#080c14] pointer-events-none" />
      <Suspense fallback={<div className="text-slate-400 font-mono text-xs">Loading terminal authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
