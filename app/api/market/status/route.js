import { NextResponse } from "next/server";
import { getMarketSessionStatus } from "@/lib/market/market-calendar";
import { getActiveProvider } from "@/lib/market/candle-service";
import { getDatabaseConnectionStatus } from "@/lib/mongodb/connection";

export const dynamic = "force-dynamic";

/**
 * GET /api/market/status
 * Returns current NSE trading session status and active market provider
 */
export async function GET() {
  const sessionStatus = getMarketSessionStatus();
  const provider = getActiveProvider();
  const dbStatus = getDatabaseConnectionStatus();

  return NextResponse.json({
    status: "ok",
    market: sessionStatus,
    provider: {
      active: provider,
      mode: provider === "yahoo" ? "Free Demo Mode (Yahoo Finance API)" : "Production (Zerodha Kite Connect)",
    },
    database: {
      connected: dbStatus.isConnected,
      state: dbStatus.state,
    },
    timestamp: new Date().toISOString(),
  });
}

