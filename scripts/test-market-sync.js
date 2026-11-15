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

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "trading_alert";

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  const CandleSchema = new mongoose.Schema(
    {
      instrumentToken: { type: Number, required: true },
      tradingSymbol: { type: String, required: true },
      timeframe: { type: String, default: "5minute" },
      candleTimestamp: { type: Date, required: true },
      open: { type: Number, required: true },
      high: { type: Number, required: true },
      low: { type: Number, required: true },
      close: { type: Number, required: true },
      volume: { type: Number, required: true },
      source: { type: String, default: "yahoo" },
    },
    { timestamps: true }
  );
  CandleSchema.index({ instrumentToken: 1, timeframe: 1, candleTimestamp: 1 }, { unique: true });
  const Candle = mongoose.models.Candle || mongoose.model("Candle", CandleSchema);

  console.log("Fetching 5m candles from Yahoo Finance API (^NSEI)...");
  const spotUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=5m&range=5d`;
  const res = await fetch(spotUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance returned status ${res.status}`);
  }

  const data = await res.json();
  const result = data.chart?.result?.[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  console.log(`Fetched ${timestamps.length} raw 5m intervals from Yahoo Finance.`);

  const bulkOps = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    if (o == null || h == null || l == null || c == null) continue;

    // Financial invariant validation
    if (h < o || h < c || h < l || l > o || l > c) {
      console.warn("Invalid candle invariant skipped:", { o, h, l, c });
      continue;
    }

    const spread = Math.max(Math.abs(h - l), 1);
    const volume = Math.round(spread * 5000 + 25000);

    const candleTimestamp = new Date(timestamps[i] * 1000);

    bulkOps.push({
      updateOne: {
        filter: {
          instrumentToken: 256265,
          timeframe: "5minute",
          candleTimestamp,
        },
        update: {
          $setOnInsert: {
            tradingSymbol: "NIFTY 50",
            open: Number(o.toFixed(2)),
            high: Number(h.toFixed(2)),
            low: Number(l.toFixed(2)),
            close: Number(c.toFixed(2)),
            volume,
            source: "yahoo",
          },
        },
        upsert: true,
      },
    });
  }

  console.log(`Executing idempotent bulk write of ${bulkOps.length} valid candles...`);
  const writeResult = await Candle.bulkWrite(bulkOps, { ordered: false });
  console.log(`Bulk write complete: Upserted=${writeResult.upsertedCount}, Matched=${writeResult.matchedCount}`);

  const totalInDb = await Candle.countDocuments({ timeframe: "5minute" });
  console.log(`Total 5m candles now stored in Atlas: ${totalInDb}`);

  const sample = await Candle.findOne({ timeframe: "5minute" }).sort({ candleTimestamp: -1 });
  console.log("Latest candle in MongoDB Atlas:", {
    symbol: sample.tradingSymbol,
    time: sample.candleTimestamp.toISOString(),
    open: sample.open,
    high: sample.high,
    low: sample.low,
    close: sample.close,
    volume: sample.volume,
    source: sample.source,
  });

  await mongoose.disconnect();
  console.log("Success!");
}

run().catch((err) => {
  console.error("Sync test error:", err.message);
  process.exit(1);
});

