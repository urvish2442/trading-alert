import { NextResponse } from "next/server";
import { sendTestNotification } from "@/lib/notifications/web-push";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/test
 * Dispatches an instant test notification to the client to verify delivery
 */
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { error: "A valid PushSubscription object is required in request body" },
        { status: 400 }
      );
    }

    const result = await sendTestNotification(body.subscription);

    return NextResponse.json({
      status: "ok",
      message: "Test push notification successfully sent to device!",
      result,
    });
  } catch (err) {
    console.error("Test push notification error:", err);
    return NextResponse.json(
      { error: "Failed to dispatch test notification: " + err.message },
      { status: 500 }
    );
  }
}

