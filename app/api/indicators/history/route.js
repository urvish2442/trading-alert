import { NextResponse } from "next/server";
import { getStoredCandles, ensureHistoricalWarmUp } from "@/lib/market/candle-service";
import { calculateIndicatorSeries } from "@/lib/indicators/indicator-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/indicators/history
 * Returns computed historical indicator series for charts and inspections
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || "150", 10);
    const limit = Math.min(Math.max(limitParam, 1), 500);

    await ensureHistoricalWarmUp(30);
    const candles = await getStoredCandles(limit + 30); // Extra warm-up bars for EMA stability

    if (candles.length === 0) {
      return NextResponse.json({
        status: "empty",
        count: 0,
        indicators: [],
      });
    }

    const fullSeries = calculateIndicatorSeries(candles);
    // Slice to requested limit
    const slicedSeries = fullSeries.slice(-limit);

    return NextResponse.json({
      status: "ok",
      count: slicedSeries.length,
      indicators: slicedSeries,
    });
  } catch (err) {
    console.error("Indicator history API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch indicator history: " + err.message },
      { status: 500 }
    );
  }
}

