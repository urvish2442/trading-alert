import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import {
  getOpenPaperPosition,
  updatePositionMarketValuation,
  checkAndCloseExpirySafety,
} from "@/lib/paper-trading/position-manager";
import { getOrCreatePaperSettings } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await connectToDatabase();
    const settings = await getOrCreatePaperSettings();

    // 1. Check expiry safety cutoff
    const closedOnExpiry = await checkAndCloseExpirySafety(settings);

    // 2. Update valuation if still open
    let openTrade = await getOpenPaperPosition(settings.strategyId);
    if (openTrade) {
      openTrade = await updatePositionMarketValuation(openTrade, null, settings);
    }

    return NextResponse.json({
      success: true,
      closedOnExpiryCount: closedOnExpiry.length,
      hasOpenPosition: Boolean(openTrade),
      position: openTrade,
    });
  } catch (err) {
    console.error("Paper trading process error:", err);
    return NextResponse.json(
      { error: "Failed to process paper trading status: " + err.message },
      { status: 500 }
    );
  }
}

