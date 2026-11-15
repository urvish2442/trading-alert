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
      instrumentToken: Number,
      tradingSymbol: String,
      timeframe: String,
      candleTimestamp: Date,
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number,
      source: String,
    },
    { timestamps: true }
  );
  const Candle = mongoose.models.Candle || mongoose.model("Candle", CandleSchema);

  const candles = await Candle.find({ timeframe: "5minute" })
    .sort({ candleTimestamp: 1 })
    .limit(100)
    .lean();

  console.log(`Loaded ${candles.length} candles from Atlas.`);

  // EMA 9 calculation
  const closes = candles.map((c) => c.close);
  const alpha9 = 2 / 10;
  let ema9 = closes.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
  for (let i = 9; i < closes.length; i++) {
    ema9 = closes[i] * alpha9 + ema9 * (1 - alpha9);
  }

  // EMA 20 calculation
  const alpha20 = 2 / 21;
  let ema20 = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
  for (let i = 20; i < closes.length; i++) {
    ema20 = closes[i] * alpha20 + ema20 * (1 - alpha20);
  }

  // Session VWAP
  let cumTPV = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumV += c.volume;
  }
  const vwap = cumV > 0 ? cumTPV / cumV : (candles[candles.length - 1].close);

  const lastCandle = candles[candles.length - 1];

  console.log("--- LIVE INDICATOR SNAPSHOT ON ATLAS DATA ---");
  console.log("Latest Candle Time:", lastCandle.candleTimestamp.toISOString());
  console.log("Close Price:        ", lastCandle.close);
  console.log("Session VWAP:       ", Number(vwap.toFixed(2)));
  console.log("EMA 9:              ", Number(ema9.toFixed(2)));
  console.log("EMA 20:             ", Number(ema20.toFixed(2)));

  const isBuy = lastCandle.close > vwap && ema9 > ema20 && lastCandle.close > ema9;
  const isSell = lastCandle.close < vwap && ema9 < ema20 && lastCandle.close < ema9;
  const bias = isBuy ? "BUY" : isSell ? "SELL" : "NEUTRAL";

  console.log("Directional Bias:   ", bias);
  console.log("BUY Condition check:", {
    closeAboveVWAP: lastCandle.close > vwap,
    ema9AboveEMA20: ema9 > ema20,
    closeAboveEMA9: lastCandle.close > ema9,
  });
  console.log("SELL Condition check:", {
    closeBelowVWAP: lastCandle.close < vwap,
    ema9BelowEMA20: ema9 < ema20,
    closeBelowEMA9: lastCandle.close < ema9,
  });

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error("Live test failed:", err.message);
  process.exit(1);
});

