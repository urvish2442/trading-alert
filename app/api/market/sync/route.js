import { NextResponse } from "next/server";
import { syncMarketCandles } from "@/lib/market/candle-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/market/sync
 * Manually or programmatically triggers candle ingestion from active provider into MongoDB
 */
export async function POST(request) {
  try {
    let range = "5d";
    try {
      const body = await request.json();
      if (body.range) range = body.range;
    } catch {
      // Use default range
    }

    const result = await syncMarketCandles(range);

    return NextResponse.json({
      status: "ok",
      message: `Synchronized ${result.totalFetched} candles (${result.newInserted} new) via ${result.provider}`,
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

