import { NextResponse } from "next/server";
import { getStoredCandles, ensureHistoricalWarmUp } from "@/lib/market/candle-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/market/candles
 * Returns completed 5-minute candles stored in MongoDB
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "100", 10);
    const limit = Math.min(Math.max(limitParam, 1), 500);

    // Ensure warm-up candles exist
    await ensureHistoricalWarmUp(30);

    const candles = await getStoredCandles(limit);

    return NextResponse.json({
      status: "ok",
      count: candles.length,
      candles,
    });
  } catch (err) {
    console.error("Market candles fetch error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve market candles: " + err.message },
      { status: 500 }
    );
  }
}

