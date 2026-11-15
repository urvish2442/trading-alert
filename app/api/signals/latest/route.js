import { NextResponse } from "next/server";
import { getLatestSignal } from "@/lib/strategy/signal-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/signals/latest
 * Returns single most recent signal generated
 */
export async function GET() {
  try {
    const signal = await getLatestSignal();
    return NextResponse.json({
      status: "ok",
      signal,
    });
  } catch (err) {
    console.error("Fetch latest signal error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve latest signal: " + err.message },
      { status: 500 }
    );
  }
}

