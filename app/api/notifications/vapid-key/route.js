import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/vapid-key
 * Returns the public VAPID key for browser push subscription
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key is not configured on the server" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "ok",
    publicKey,
  });
}

