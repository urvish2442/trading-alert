import { NextResponse } from "next/server";
import { getDailyPnlData } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const data = await getDailyPnlData({ days });
    return NextResponse.json({ dailyPnl: data });
  } catch (err) {
    console.error("Daily P&L API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch daily P&L: " + err.message },
      { status: 500 }
    );
  }
}
