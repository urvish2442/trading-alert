import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import { getOrCreateDefaultStrategy } from "@/lib/strategy/signal-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/strategies
 * Fetch configured strategies
 */
export async function GET() {
  try {
    await connectToDatabase();
    const strategy = await getOrCreateDefaultStrategy();

    return NextResponse.json({
      status: "ok",
      strategy,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch strategy configuration: " + err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/strategies
 * Enable or disable strategy or update parameters
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    await connectToDatabase();
    const strategy = await getOrCreateDefaultStrategy();

    if (typeof body.enabled === "boolean") {
      strategy.enabled = body.enabled;
    }

    await strategy.save();

    return NextResponse.json({
      status: "ok",
      message: `Strategy ${strategy.enabled ? "enabled" : "disabled"}`,
      strategy,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update strategy: " + err.message },
      { status: 500 }
    );
  }
}
