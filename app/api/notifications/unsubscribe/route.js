import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connection";
import PushSubscription from "@/lib/mongodb/models/PushSubscription";

export const dynamic = "force-dynamic";

const UnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

/**
 * POST /api/notifications/unsubscribe
 * Removes or disables a device push subscription
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const validated = UnsubscribeSchema.parse(body);

    await connectToDatabase();

    const deleted = await PushSubscription.findOneAndDelete({ endpoint: validated.endpoint });

    return NextResponse.json({
      status: "ok",
      message: "Device successfully unsubscribed from push notifications",
      deleted: !!deleted,
    });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe: " + err.message },
      { status: 400 }
    );
  }
}

