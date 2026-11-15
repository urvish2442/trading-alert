import { NextResponse } from "next/server";
import { getStoredCandles, ensureHistoricalWarmUp } from "@/lib/market/candle-service";
import { getLatestIndicatorSnapshot, persistIndicatorSnapshot } from "@/lib/indicators/indicator-engine";
import { getActiveStrategyState } from "@/lib/strategy/signal-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/indicators/current
 * Returns the latest computed indicator snapshot (EMA 9, EMA 20, VWAP) and active Option Buyer state
 */
export async function GET() {
  try {
    await ensureHistoricalWarmUp(30);
    const candles = await getStoredCandles(100);

    const strategyState = await getActiveStrategyState();

    if (candles.length === 0) {
      return NextResponse.json({
        status: "empty",
        message: "No historical candles available for indicator calculations",
        snapshot: null,
        strategyState,
      });
    }

    const snapshot = getLatestIndicatorSnapshot(candles);

    // Save snapshot idempotently to MongoDB
    if (snapshot && snapshot.isWarmedUp) {
      await persistIndicatorSnapshot(snapshot).catch((err) =>
        console.error("Indicator persistence error:", err.message)
      );
    }

    return NextResponse.json({
      status: "ok",
      snapshot,
      strategyState,
    });
  } catch (err) {
    console.error("Indicator current API error:", err);
    return NextResponse.json(
      { error: "Failed to compute indicators: " + err.message },
      { status: 500 }
    );
  }
}

