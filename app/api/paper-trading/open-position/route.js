import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import { getOpenPaperPosition, updatePositionMarketValuation } from "@/lib/paper-trading/position-manager";
import { getOrCreatePaperSettings } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await getOrCreatePaperSettings();
    let openPosition = await getOpenPaperPosition(settings.strategyId);

    if (openPosition) {
      openPosition = await updatePositionMarketValuation(openPosition, null, settings);
    }

    return NextResponse.json({
      hasOpenPosition: Boolean(openPosition),
      position: openPosition,
    });
  } catch (err) {
    console.error("Open position API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch open position: " + err.message },
      { status: 500 }
    );
  }
}

