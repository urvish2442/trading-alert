import { NextResponse } from "next/server";
import { getPaperTradingSummary } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getPaperTradingSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("Paper trading summary API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch paper trading summary: " + err.message },
      { status: 500 }
    );
  }
}

