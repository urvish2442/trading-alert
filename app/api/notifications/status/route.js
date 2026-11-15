import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/connection";
import PushSubscription from "@/lib/mongodb/models/PushSubscription";
import NotificationLog from "@/lib/mongodb/models/NotificationLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/status
 * Returns subscription statistics, active devices, and recent delivery logs
 */
export async function GET() {
  try {
    await connectToDatabase();

    const [subscribers, totalSubscribers, recentLogs] = await Promise.all([
      PushSubscription.find().sort({ createdAt: -1 }).lean(),
      PushSubscription.countDocuments({ enabled: true }),
      NotificationLog.find()
        .sort({ sentAt: -1 })
        .limit(20)
        .populate("signalId", "signalType candleClose vwap ema9 candleTimestamp")
        .populate("subscriptionId", "deviceName endpoint")
        .lean(),
    ]);

    const sanitizedSubscribers = subscribers.map((s) => ({
      _id: s._id,
      deviceName: s.deviceName,
      enabled: s.enabled,
      createdAt: s.createdAt,
      endpointPreview: s.endpoint.slice(0, 35) + "...",
    }));

    return NextResponse.json({
      status: "ok",
      totalSubscribers,
      subscribers: sanitizedSubscribers,
      recentLogs,
    });
  } catch (err) {
    console.error("Fetch notifications status error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve notification status: " + err.message },
      { status: 500 }
    );
  }
}

