import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        userId: session.userId,
        email: session.email,
        role: session.role,
      },
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      error: "Failed to verify session",
    });
  }
}
