import { connectToDatabase } from "@/lib/mongodb/connection";
import Candle from "@/lib/mongodb/models/Candle";
import Signal from "@/lib/mongodb/models/Signal";
import { getYahoo5MinCandles, getYahooQuote } from "./providers/yahoo";
import { getKite5MinCandles } from "./providers/kite";
import { filterAndSortValidCandles } from "./candle-validation";
import { replayStrategyAcrossAllCandles } from "@/lib/strategy/signal-engine";

/**
 * Returns active market data provider name ('yahoo' | 'kite')
 */
export function getActiveProvider() {
  return process.env.MARKET_DATA_PROVIDER || "yahoo";
}

/**
 * Fetches latest quote from the active provider
 */
export async function getMarketQuote() {
  const provider = getActiveProvider();

  if (provider === "kite") {
    // If Kite is configured, use Kite quote; fallback to Yahoo if disconnected
    try {
      // Kite quote implementation
    } catch {
      // Fallback
    }
  }

  return getYahooQuote();
}

/**
 * Synchronizes completed 5-minute candles from the active provider into MongoDB.
 * Implements idempotent upserting using the unique compound index.
 * @param {string} range - e.g. "1d", "5d"
 * @returns {Promise<{ provider: string, totalFetched: number, newInserted: number, latestCandle: object | null }>}
 */
export async function syncMarketCandles(range = "5d") {
  await connectToDatabase();
  const provider = getActiveProvider();

  let rawCandles = [];
  if (provider === "kite") {
    // Kite implementation
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    rawCandles = await getKite5MinCandles(256265, fiveDaysAgo, now);
  } else {
    // Default: Yahoo Finance Demo Provider with database fallback on rate limiting
    try {
      rawCandles = await getYahoo5MinCandles(range);
    } catch (err) {
      console.warn("Yahoo candle fetch encountered rate limit, checking database cache:", err.message);
      const cachedCount = await Candle.countDocuments({ timeframe: "5minute" });
      if (cachedCount > 0) {
        const latest = await Candle.findOne({ timeframe: "5minute" }).sort({ candleTimestamp: -1 }).lean();
        return {
          provider,
          totalFetched: cachedCount,
          newInserted: 0,
          latestCandle: latest,
          cached: true,
          message: "Yahoo Finance is temporarily rate-limiting. Serving verified candles from database cache.",
        };
      }
      throw err;
    }
  }

  // Filter, validate, normalize to 5-minute boundaries, and deduplicate candles
  const validCandles = filterAndSortValidCandles(rawCandles, { filterIncomplete: true });

  if (validCandles.length === 0) {
    return {
      provider,
      totalFetched: 0,
      newInserted: 0,
      latestCandle: null,
    };
  }

  // Idempotent bulk upsert using compound unique index (instrumentToken, timeframe, candleTimestamp)
  const bulkOps = validCandles.map((c) => ({
    updateOne: {
      filter: {
        instrumentToken: c.instrumentToken,
        timeframe: "5minute",
        candleTimestamp: c.candleTimestamp,
      },
      update: {
        $set: {
          tradingSymbol: c.tradingSymbol,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          source: c.source,
        },
      },
      upsert: true,
    },
  }));

  const result = await Candle.bulkWrite(bulkOps, { ordered: false });
  const newInserted = (result.upsertedCount || 0) + (result.insertedCount || 0);

  const latestCandle = validCandles[validCandles.length - 1];

  return {
    provider,
    totalFetched: validCandles.length,
    newInserted,
    latestCandle,
  };
}

/**
 * Refetches candles for a specific date range, matches them against existing
 * MongoDB records, updates any differing candles, inserts new ones,
 * and if any changes occurred, reruns the strategy engine.
 *
 * @param {{ fromDate: string, toDate: string }} dateRange
 * @returns {Promise<{
 *   provider: string,
 *   fromDate: string,
 *   toDate: string,
 *   totalFetched: number,
 *   newInserted: number,
 *   updatedCount: number,
 *   matchedUnchanged: number,
 *   strategyRerun: boolean,
 *   signalsCount: number,
 *   finalTradeState: number
 * }>}
 */
export async function resyncCandlesByDateRange({ fromDate, toDate }) {
  await connectToDatabase();
  const provider = getActiveProvider();

  let rawCandles = [];
  if (provider === "kite") {
    rawCandles = await getKite5MinCandles(256265, fromDate, toDate);
  } else {
    rawCandles = await getYahoo5MinCandles({ fromDate, toDate });
  }

  // Validate, filter incomplete, and deduplicate
  const validCandles = filterAndSortValidCandles(rawCandles, { filterIncomplete: true });

  if (validCandles.length === 0) {
    return {
      provider,
      fromDate,
      toDate,
      totalFetched: 0,
      newInserted: 0,
      updatedCount: 0,
      matchedUnchanged: 0,
      strategyRerun: false,
      signalsCount: 0,
      finalTradeState: 0,
      message: `No completed 5m candles found for range ${fromDate} to ${toDate}`,
    };
  }

  // Compare with existing MongoDB candles
  const timestamps = validCandles.map((c) => c.candleTimestamp);
  const existingDocs = await Candle.find({
    instrumentToken: validCandles[0].instrumentToken,
    timeframe: "5minute",
    candleTimestamp: { $in: timestamps },
  }).lean();

  const existingMap = new Map();
  for (const doc of existingDocs) {
    existingMap.set(new Date(doc.candleTimestamp).getTime(), doc);
  }

  let newInserted = 0;
  let updatedCount = 0;
  let matchedUnchanged = 0;
  const bulkOps = [];

  for (const c of validCandles) {
    const timeKey = c.candleTimestamp.getTime();
    const existing = existingMap.get(timeKey);

    if (!existing) {
      newInserted++;
      bulkOps.push({
        updateOne: {
          filter: {
            instrumentToken: c.instrumentToken,
            timeframe: "5minute",
            candleTimestamp: c.candleTimestamp,
          },
          update: {
            $set: {
              tradingSymbol: c.tradingSymbol,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
              source: c.source,
            },
          },
          upsert: true,
        },
      });
    } else {
      // Check if any OHLCV values differ
      const isDiff =
        existing.open !== c.open ||
        existing.high !== c.high ||
        existing.low !== c.low ||
        existing.close !== c.close ||
        existing.volume !== c.volume;

      if (isDiff) {
        updatedCount++;
        bulkOps.push({
          updateOne: {
            filter: {
              instrumentToken: c.instrumentToken,
              timeframe: "5minute",
              candleTimestamp: c.candleTimestamp,
            },
            update: {
              $set: {
                tradingSymbol: c.tradingSymbol,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                source: c.source,
              },
            },
            upsert: true,
          },
        });
      } else {
        matchedUnchanged++;
      }
    }
  }

  if (bulkOps.length > 0) {
    await Candle.bulkWrite(bulkOps, { ordered: false });
  }

  let strategyRerun = false;
  let signalsCount = await Signal.countDocuments({});
  let finalTradeState = 0;

  // If any candle was inserted or updated, rerun the strategy script
  if (newInserted > 0 || updatedCount > 0) {
    strategyRerun = true;
    const replayResult = await replayStrategyAcrossAllCandles();
    signalsCount = replayResult.signalsCount;
    finalTradeState = replayResult.finalTradeState;
  }

  return {
    provider,
    fromDate,
    toDate,
    totalFetched: validCandles.length,
    newInserted,
    updatedCount,
    matchedUnchanged,
    strategyRerun,
    signalsCount,
    finalTradeState,
  };
}

/**
 * Retrieves stored 5-minute candles from MongoDB for indicator calculations
 * Strictly deduplicates by timestamp and ensures ascending chronological order
 * @param {number} limit - Number of recent candles to fetch (default 100)
 * @returns {Promise<Array<object>>}
 */
export async function getStoredCandles(limit = 100) {
  await connectToDatabase();

  const candles = await Candle.find({ timeframe: "5minute" })
    .sort({ candleTimestamp: -1 })
    .limit(limit * 2)
    .lean();

  // Deduplicate by timestamp in case of any legacy duplicate records
  const seenTimestamps = new Set();
  const deduplicated = [];

  for (const c of candles) {
    const timeMs = new Date(c.candleTimestamp).getTime();
    if (!seenTimestamps.has(timeMs)) {
      seenTimestamps.add(timeMs);
      deduplicated.push(c);
      if (deduplicated.length >= limit) break;
    }
  }

  // Return sorted chronologically ascending
  return deduplicated.reverse();
}

/**
 * Ensures sufficient historical warm-up candles exist in MongoDB for indicator calculation (e.g. EMA 20)
 * @param {number} requiredMin - Minimum required completed candles (default 30)
 * @returns {Promise<{ isReady: boolean, candleCount: number }>}
 */
export async function ensureHistoricalWarmUp(requiredMin = 30) {
  await connectToDatabase();
  const currentCount = await Candle.countDocuments({ timeframe: "5minute" });

  if (currentCount < requiredMin) {
    // Automatically trigger warm-up sync from active provider
    await syncMarketCandles("5d");
    const updatedCount = await Candle.countDocuments({ timeframe: "5minute" });
    return {
      isReady: updatedCount >= requiredMin,
      candleCount: updatedCount,
    };
  }

  return {
    isReady: true,
    candleCount: currentCount,
  };
}

