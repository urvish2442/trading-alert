import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import PaperTrade from "@/lib/mongodb/models/PaperTrade";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const trade = await PaperTrade.findOne({
      $or: [{ tradeId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!trade) {
      return NextResponse.json({ error: "Paper trade not found" }, { status: 404 });
    }

    return NextResponse.json({ trade });
  } catch (err) {
    console.error("Paper trade detail API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch trade details: " + err.message },
      { status: 500 }
    );
  }
}

