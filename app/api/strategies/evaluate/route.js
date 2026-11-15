import { NextResponse } from "next/server";
import { getStoredCandles, ensureHistoricalWarmUp } from "@/lib/market/candle-service";
import { evaluateLatestCandle, backfillSignalHistory } from "@/lib/strategy/signal-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/strategies/evaluate
 * Body: { mode: "latest" | "replay" }
 * Evaluates strategy on stored candles, detects state transitions, and creates signals
 */
export async function POST(request) {
  try {
    let mode = "latest";
    try {
      const body = await request.json();
      if (body.mode) mode = body.mode;
    } catch {
      // Default
    }

    await ensureHistoricalWarmUp(30);

    if (mode === "replay") {
      // Replay over all stored historical candles (up to 500) to populate signals
      const candles = await getStoredCandles(500);
      const generated = await backfillSignalHistory(candles);
      return NextResponse.json({
        status: "ok",
        mode: "replay",
        totalCandles: candles.length,
        signalsGenerated: generated.length,
        signals: generated,
      });
    }

    // Default: evaluate latest completed candle
    const candles = await getStoredCandles(100);
    const result = await evaluateLatestCandle(candles);

    return NextResponse.json({
      status: "ok",
      mode: "latest",
      result,
    });
  } catch (err) {
    console.error("Strategy evaluation API error:", err);
    return NextResponse.json(
      { error: "Strategy evaluation failed: " + err.message },
      { status: 500 }
    );
  }
}

