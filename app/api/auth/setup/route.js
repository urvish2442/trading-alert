import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/models/User";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const setupSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

/**
 * GET: Check if first-time admin setup is needed
 */
export async function GET() {
  try {
    await connectToDatabase();
    const existingCount = await User.countDocuments();

    return NextResponse.json({
      setupNeeded: existingCount === 0,
      totalUsers: existingCount,
    });
  } catch (err) {
    console.error("Setup check error:", err);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create initial administrator account (disabled once first user is created)
 */
export async function POST(request) {
  try {
    await connectToDatabase();
    const existingCount = await User.countDocuments();

    if (existingCount > 0) {
      return NextResponse.json(
        { error: "Setup is disabled. An administrator account is already configured." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = setupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email,
      passwordHash,
      role: "admin",
    });

    const token = await createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      message: "Initial administrator account created successfully",
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      ...sessionCookieOptions,
      value: token,
    });

    return response;
  } catch (err) {
    console.error("Setup execution error:", err);
    return NextResponse.json(
      { error: "Failed to initialize administrator account" },
      { status: 500 }
    );
  }
}
