/**
 * Database Deduplication & Strict 5-Minute Candle Alignment Cleanup
 *
 * Cleans MongoDB Atlas:
 * 1. Deduplicates multiple candle records within the same 5-minute interval
 * 2. Removes tick-snapshot candles with odd seconds (e.g., :38, :45, :27)
 * 3. Removes non-5m candles (e.g., :01, :31)
 * 4. Normalizes all remaining completed candles to exact 5m start boundaries (:00.000)
 * 5. Cleans signals, indicators, and strategyState records tied to invalid timestamps
 * 6. Ensures compound unique index on { instrumentToken: 1, timeframe: 1, candleTimestamp: 1 }
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "trading_alert";

function normalizeTo5Min(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const minutes = d.getUTCMinutes();
  d.setUTCMinutes(minutes - (minutes % 5), 0, 0);
  return d;
}

function isStrict5Min(d) {
  return d.getUTCMinutes() % 5 === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}

async function runCleanup() {
  console.log("Connecting to MongoDB Atlas (db:", MONGODB_DB_NAME, ")...");
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  const db = mongoose.connection.db;

  const candleColl = db.collection("candles");
  const signalColl = db.collection("signals");
  const indicatorColl = db.collection("indicators");
  const stateColl = db.collection("strategystates");

  const initialCount = await candleColl.countDocuments();
  console.log(`Initial total candles in collection: ${initialCount}`);

  // Fetch all candles
  const allCandles = await candleColl.find().sort({ candleTimestamp: 1 }).toArray();

  // Group by 5-minute slot key: `${instrumentToken}_5minute_${normalizedTimestamp}`
  const slotMap = new Map();
  const invalidDeleteIds = [];

  for (const c of allCandles) {
    const rawDate = new Date(c.candleTimestamp);
    if (isNaN(rawDate.getTime())) {
      invalidDeleteIds.push(c._id);
      continue;
    }

    // Check if candle minute is not divisible by 5 (e.g. 15:01, 14:31)
    const utcMin = rawDate.getUTCMinutes();
    const sec = rawDate.getUTCSeconds();
    const isOddMinute = (utcMin % 5 !== 0) && (sec === 0); // e.g. 1-minute bar from external feed

    if (isOddMinute) {
      // Out-of-interval candle (e.g. 1-minute residual bar)
      invalidDeleteIds.push(c._id);
      continue;
    }

    const normDate = normalizeTo5Min(rawDate);
    const key = `${c.instrumentToken || 256265}_5minute_${normDate.toISOString()}`;

    if (!slotMap.has(key)) {
      slotMap.set(key, {
        normDate,
        instrumentToken: c.instrumentToken || 256265,
        tradingSymbol: c.tradingSymbol || "NIFTY 50",
        candles: [],
      });
    }

    slotMap.get(key).candles.push(c);
  }

  console.log(`Identified ${slotMap.size} unique 5-minute slots across ${allCandles.length} candles.`);

  const candlesToDelete = [...invalidDeleteIds];
  const candlesToUpdate = [];

  for (const [key, slot] of slotMap.entries()) {
    const list = slot.candles;

    if (list.length === 1) {
      const single = list[0];
      const d = new Date(single.candleTimestamp);
      if (!isStrict5Min(d)) {
        // Needs timestamp normalization to :00.000
        candlesToUpdate.push({
          _id: single._id,
          normalizedDate: slot.normDate,
        });
      }
    } else {
      // Multiple candles in the same 5-minute slot!
      // Pick best candle: prefer strictly aligned with highest volume
      list.sort((a, b) => {
        const aStrict = isStrict5Min(new Date(a.candleTimestamp)) ? 1 : 0;
        const bStrict = isStrict5Min(new Date(b.candleTimestamp)) ? 1 : 0;
        if (aStrict !== bStrict) return bStrict - aStrict;
        return (b.volume || 0) - (a.volume || 0);
      });

      const best = list[0];
      const duplicates = list.slice(1);

      for (const dup of duplicates) {
        candlesToDelete.push(dup._id);
      }

      // Check if the chosen best candle needs timestamp normalization
      const bestDate = new Date(best.candleTimestamp);
      if (!isStrict5Min(bestDate)) {
        candlesToUpdate.push({
          _id: best._id,
          normalizedDate: slot.normDate,
        });
      }
    }
  }

  console.log(`Candles to delete (duplicates + non-standard): ${candlesToDelete.length}`);
  console.log(`Candles to normalize timestamp: ${candlesToUpdate.length}`);

  // Execute Deletes
  if (candlesToDelete.length > 0) {
    const delResult = await candleColl.deleteMany({ _id: { $in: candlesToDelete } });
    console.log(`Deleted ${delResult.deletedCount} duplicate/non-standard candles.`);
  }

  // Execute Timestamp Updates
  let updatedCount = 0;
  for (const item of candlesToUpdate) {
    await candleColl.updateOne(
      { _id: item._id },
      { $set: { candleTimestamp: item.normalizedDate, timeframe: "5minute" } }
    );
    updatedCount++;
  }
  console.log(`Normalized timestamps for ${updatedCount} candles.`);

  const finalCandleCount = await candleColl.countDocuments();
  console.log(`Cleaned total candles: ${finalCandleCount}`);

  // Verify unique index on candles
  console.log("Verifying unique compound index on candles collection...");
  await candleColl.createIndex(
    { instrumentToken: 1, timeframe: 1, candleTimestamp: 1 },
    { unique: true, background: true }
  );

  // 2. Clean Signals Collection
  console.log("Cleaning signals on non-standard timestamps...");
  const allSignals = await signalColl.find().toArray();
  const signalDeleteIds = [];
  const seenSignalKeys = new Set();

  for (const s of allSignals) {
    const d = new Date(s.candleTimestamp);
    // If signal has seconds or non-5m minutes
    if (!isStrict5Min(d)) {
      signalDeleteIds.push(s._id);
      continue;
    }

    const sigKey = `${s.strategyId}_${s.instrumentToken}_${d.toISOString()}_${s.signalType}`;
    if (seenSignalKeys.has(sigKey)) {
      signalDeleteIds.push(s._id);
    } else {
      seenSignalKeys.add(sigKey);
    }
  }

  if (signalDeleteIds.length > 0) {
    const sigDelResult = await signalColl.deleteMany({ _id: { $in: signalDeleteIds } });
    console.log(`Deleted ${sigDelResult.deletedCount} invalid/duplicate signals.`);
  }

  const finalSignalCount = await signalColl.countDocuments();
  console.log(`Verified remaining signals: ${finalSignalCount}`);

  // 3. Clean Indicators Collection
  console.log("Cleaning indicators on non-standard timestamps...");
  const allIndicators = await indicatorColl.find().toArray();
  const indDeleteIds = [];
  for (const ind of allIndicators) {
    const d = new Date(ind.candleTimestamp);
    if (!isStrict5Min(d)) {
      indDeleteIds.push(ind._id);
    }
  }
  if (indDeleteIds.length > 0) {
    const indDel = await indicatorColl.deleteMany({ _id: { $in: indDeleteIds } });
    console.log(`Deleted ${indDel.deletedCount} non-standard indicators.`);
  }

  // 4. Normalize StrategyState lastProcessedCandle
  const latestCleanCandle = await candleColl.findOne({ timeframe: "5minute" }, { sort: { candleTimestamp: -1 } });
  if (latestCleanCandle) {
    console.log(`Setting StrategyState lastProcessedCandle to latest clean 5m candle: ${latestCleanCandle.candleTimestamp.toISOString()}`);
    await stateColl.updateMany(
      {},
      { $set: { lastProcessedCandle: latestCleanCandle.candleTimestamp } }
    );
  }

  await mongoose.disconnect();
  console.log("Database deduplication and alignment cleanup completed successfully!");
}

runCleanup().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});

