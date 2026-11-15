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
    const statusCode = err.statusCode || 500;
    const bodyDetail = err.body ? ` (${err.body})` : "";
    const errorMessage = `${err.message}${bodyDetail}`;
    console.error("Test push notification error:", { statusCode, errorMessage });

    return NextResponse.json(
      { error: "Failed to dispatch test notification: " + errorMessage, statusCode },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}

