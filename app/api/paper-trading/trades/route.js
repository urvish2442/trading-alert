import { NextResponse } from "next/server";
import { getPaperTradesList } from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const optionType = searchParams.get("optionType") || undefined;
    const status = searchParams.get("status") || undefined;
    const outcome = searchParams.get("outcome") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const result = await getPaperTradesList({
      limit,
      page,
      optionType,
      status,
      outcome,
      fromDate,
      toDate,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Paper trades list API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch paper trades list: " + err.message },
      { status: 500 }
    );
  }
}

