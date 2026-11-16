import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import { getOpenPaperPosition, closePaperPosition } from "@/lib/paper-trading/position-manager";
import { getOrCreatePaperSettings } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/paper-trading/exit
 * Manually closes the active simulated open paper position.
 * NEVER places real broker orders.
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const settings = await getOrCreatePaperSettings();
    const openTrade = await getOpenPaperPosition(settings.strategyId);

    if (!openTrade) {
      return NextResponse.json(
        { error: "No active open paper position found to close" },
        { status: 400 }
      );
    }

    let spotPrice = null;
    try {
      const body = await request.json();
      spotPrice = body.spotPrice || null;
    } catch {
      // Body is optional
    }

    const closedTrade = await closePaperPosition({
      tradeId: openTrade.tradeId,
      exitReason: "MANUAL_EXIT",
      spotPrice,
      settings,
    });

    return NextResponse.json({
      success: true,
      message: `Manually closed paper position ${closedTrade.tradeId} (${closedTrade.optionSymbol})`,
      trade: closedTrade,
    });
  } catch (err) {
    console.error("Paper manual exit error:", err);
    return NextResponse.json(
      { error: "Failed to exit paper position: " + err.message },
      { status: 500 }
    );
  }
}

