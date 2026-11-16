import { NextResponse } from "next/server";
import { getMonthlyPnlData } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year"), 10) : undefined;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month"), 10) : undefined;

    const data = await getMonthlyPnlData({ year, month });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Monthly P&L API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch monthly P&L: " + err.message },
      { status: 500 }
    );
  }
}

