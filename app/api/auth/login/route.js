import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Simple in-memory rate limiting map for login attempts
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_DURATION_MS });
    return { allowed: true };
  }

  if (now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_DURATION_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingMinutes = Math.ceil((record.resetAt - now) / 60000);
    return {
      allowed: false,
      message: `Too many login attempts. Please try again in ${remainingMinutes} minutes.`,
    };
  }

  record.count += 1;
  return { allowed: true };
}

export async function POST(request) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful login
    loginAttempts.delete(clientIp);

    const token = await createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
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
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication" },
      { status: 500 }
    );
  }
}
