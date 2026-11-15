import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import Signal from "@/lib/mongodb/models/Signal";

export const dynamic = "force-dynamic";

/**
 * GET /api/signals/[id]
 * Fetch single signal details by ObjectId
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const signal = await Signal.findById(id).lean();

    if (!signal) {
      return NextResponse.json(
        { error: "Signal record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "ok",
      signal,
    });
  } catch (err) {
    console.error("Fetch signal details error:", err);
    return NextResponse.json(
      { error: "Invalid signal ID or database error: " + err.message },
      { status: 500 }
    );
  }
}

