import { NextResponse } from "next/server";
import { syncMarketCandles, resyncCandlesByDateRange } from "@/lib/market/candle-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/market/sync
 * Supports both relative range ("1d", "5d") and specific date range ({ fromDate, toDate })
 */
export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Default empty
    }

    // 1. Explicit Date Range Resync with DB Comparison & Strategy Re-evaluation
    if (body.fromDate && body.toDate) {
      const result = await resyncCandlesByDateRange({
        fromDate: body.fromDate,
        toDate: body.toDate,
      });

      let message = `Matched ${result.totalFetched} candles for ${result.fromDate} to ${result.toDate}: ${result.updatedCount} updated, ${result.newInserted} new inserted.`;
      if (result.strategyRerun) {
        message += ` Strategy re-evaluated (${result.signalsCount} signals generated).`;
      } else {
        message += ` All candles were already identical with database (no strategy rerun needed).`;
      }

      return NextResponse.json({
        status: "ok",
        message,
        data: result,
      });
    }

    // 2. Default relative range sync ("1d", "5d")
    const range = body.range || "5d";
    const result = await syncMarketCandles(range);
    const message =
      result.message ||
      `Synchronized ${result.totalFetched} candles (${result.newInserted} new) via ${result.provider}`;

    return NextResponse.json({
      status: "ok",
      message,
      data: result,
    });
  } catch (err) {
    console.error("Candle sync error:", err);
    return NextResponse.json(
      { error: "Failed to synchronize market candles: " + err.message },
      { status: 500 }
    );
  }
}
