import { NextResponse } from "next/server";
import { getDatabaseConnectionStatus, connectToDatabase } from "@/lib/mongodb/connection";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for system monitoring and deployment verification.
 * GET /api/health
 */
export async function GET() {
  let dbStatus = getDatabaseConnectionStatus();

  // Try active ping / connection if not yet connected
  if (!dbStatus.isConnected) {
    try {
      await connectToDatabase();
      dbStatus = getDatabaseConnectionStatus();
    } catch (err) {
      dbStatus = {
        ...dbStatus,
        error: "Database connection failed: " + (err.message || "Unknown error"),
      };
    }
  }

  return NextResponse.json({
    status: dbStatus.isConnected ? "healthy" : "degraded",
    application: "NIFTY 50 Intraday Alert System",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      isConnected: dbStatus.isConnected,
      state: dbStatus.state,
      dbName: dbStatus.dbName,
    },
  });
}
