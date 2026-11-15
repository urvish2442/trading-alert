import { NextResponse } from "next/server";
import { getMarketQuote } from "@/lib/market/candle-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/market/quote
 * Returns live spot quote for NIFTY 50
 */
export async function GET() {
  try {
    const quote = await getMarketQuote();
    return NextResponse.json({
      status: "ok",
      quote,
    });
  } catch (err) {
    console.error("Market quote fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch live market quote: " + err.message },
      { status: 500 }
    );
  }
}

