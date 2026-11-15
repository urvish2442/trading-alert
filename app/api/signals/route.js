import { NextResponse } from "next/server";
import { getSignalsList, clearAllSignalsAndStates } from "@/lib/strategy/signal-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/signals
 * Query params: page, limit, type (BUY/SELL), fromDate, toDate
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const rawType = searchParams.get("type")?.toUpperCase();
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    let signalType;
    if (rawType && rawType !== "ALL") {
      const normalized = rawType.replace("_", " ");
      const validTypes = ["BUY CALL", "BUY PUT", "EXIT CALL", "EXIT PUT"];
      if (validTypes.includes(normalized)) {
        signalType = normalized;
      }
    }

    const result = await getSignalsList({
      page,
      limit,
      signalType,
      fromDate,
      toDate,
    });

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (err) {
    console.error("Fetch signals error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve signal records: " + err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/signals
 * Deletes all signals and resets strategy states to clean slate
 */
export async function DELETE() {
  try {
    const result = await clearAllSignalsAndStates();
    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (err) {
    console.error("Clear signals error:", err);
    return NextResponse.json(
      { error: "Failed to clear signals: " + err.message },
      { status: 500 }
    );
  }
}

