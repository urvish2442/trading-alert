import { NextResponse } from "next/server";
import { getMarketSessionStatus } from "@/lib/market/market-calendar";
import {
  getActiveProvider,
  syncMarketCandles,
  getStoredCandles,
  ensureHistoricalWarmUp,
} from "@/lib/market/candle-service";
import {
  checkStaleData,
  executeMarketProcessing,
} from "@/lib/market/recovery-service";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Max execution duration in seconds on Vercel

/**
 * Validates request authorization against CRON_SECRET
 * @param {Request} request
 * @returns {boolean}
 */
function isAuthorized(request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return false;
  }

  // 1. Authorization header: Bearer <secret>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === configuredSecret) return true;
  }

  // 2. Custom header: x-cron-secret
  const customHeader = request.headers.get("x-cron-secret");
  if (customHeader && customHeader.trim() === configuredSecret) {
    return true;
  }

  // 3. Query parameter: ?secret=<secret>
  try {
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get("secret");
    if (querySecret && querySecret === configuredSecret) {
      return true;
    }
  } catch {
    // Ignore URL parse error
  }

  return false;
}

/**
 * Core market processing execution
 */
async function handleProcessMarket(request) {
  const startTime = Date.now();

  // 1. Scheduler Authentication
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized: Invalid or missing CRON_SECRET authentication",
        hint: "Provide Authorization: Bearer <CRON_SECRET> header or ?secret=<CRON_SECRET> query param",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // 2. Market Calendar & Trading Hours Check
    const marketStatus = getMarketSessionStatus();

    if (!marketStatus.isOpen && !force) {
      return NextResponse.json({
        status: "skipped",
        reason: marketStatus.reason,
        market: marketStatus,
        executionDurationMs: Date.now() - startTime,
      });
    }

    // 3. Provider Check
    const provider = getActiveProvider();

    // 4. Synchronize latest completed 5-minute candles into MongoDB Atlas
    const syncResult = await syncMarketCandles("1d");

    // 5. Ensure historical warm-up exists
    await ensureHistoricalWarmUp(30);

    // 6. Retrieve recent stored candles (up to 100 bars)
    const candles = await getStoredCandles(100);

    if (candles.length === 0) {
      return NextResponse.json({
        status: "error",
        message: "No historical candles available after sync",
        executionDurationMs: Date.now() - startTime,
      });
    }

    const latestCandle = candles[candles.length - 1];

    // 7. Stale Data Detection
    const staleCheck = checkStaleData(latestCandle, 20);

    // 8. Execute Market Strategy & Idempotent Signal Engine
    const processingResult = await executeMarketProcessing(candles, marketStatus.isOpen);

    const executionDurationMs = Date.now() - startTime;

    return NextResponse.json({
      status: "ok",
      provider,
      market: marketStatus,
      isForced: force,
      dataSync: {
        totalFetched: syncResult.totalFetched,
        newInserted: syncResult.newInserted,
      },
      dataFreshness: staleCheck,
      processing: processingResult,
      executionDurationMs,
    });
  } catch (err) {
    console.error("Process market cron error:", err);
    return NextResponse.json(
      {
        status: "error",
        error: "Market processing failure: " + err.message,
        executionDurationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-market
 */
export async function GET(request) {
  return handleProcessMarket(request);
}

/**
 * POST /api/cron/process-market
 */
export async function POST(request) {
  return handleProcessMarket(request);
}

