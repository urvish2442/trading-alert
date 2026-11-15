import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connection";
import PushSubscription from "@/lib/mongodb/models/PushSubscription";

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  deviceName: z.string().optional().default("Browser / PWA Client"),
});

/**
 * POST /api/notifications/subscribe
 * Registers or updates a client push subscription in MongoDB
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const validated = SubscribeSchema.parse(body);

    await connectToDatabase();

    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint: validated.subscription.endpoint },
      {
        $set: {
          subscription: validated.subscription,
          deviceName: validated.deviceName,
          enabled: true,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      status: "ok",
      message: "Device successfully subscribed to push notifications",
      subscriptionId: sub._id,
      deviceName: sub.deviceName,
    });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json(
      { error: "Failed to store push subscription: " + err.message },
      { status: 400 }
    );
  }
}

