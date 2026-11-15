/**
 * Verifies that all Mongoose models can connect to MongoDB Atlas
 * and build their configured unique and compound indexes.
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

async function verifyIndexes() {
  console.log("Connecting to Atlas...");
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
  CandleSchema.index({ instrumentToken: 1, timeframe: 1, candleTimestamp: 1 }, { unique: true });
  const Candle = mongoose.models.Candle || mongoose.model("Candle", CandleSchema);

  const IndicatorSchema = new mongoose.Schema(
    {
      instrumentToken: Number,
      timeframe: String,
      candleTimestamp: Date,
      vwap: Number,
      ema9: Number,
      ema20: Number,
    },
    { timestamps: true }
  );
  IndicatorSchema.index({ instrumentToken: 1, timeframe: 1, candleTimestamp: 1 }, { unique: true });
  const Indicator = mongoose.models.Indicator || mongoose.model("Indicator", IndicatorSchema);

  const StrategyStateSchema = new mongoose.Schema(
    {
      strategyId: mongoose.Schema.Types.ObjectId,
      instrumentToken: Number,
      lastDirection: String,
      lastProcessedCandle: Date,
    },
    { timestamps: true }
  );
  StrategyStateSchema.index({ strategyId: 1, instrumentToken: 1 }, { unique: true });
  const StrategyState = mongoose.models.StrategyState || mongoose.model("StrategyState", StrategyStateSchema);

  const SignalSchema = new mongoose.Schema(
    {
      strategyId: mongoose.Schema.Types.ObjectId,
      instrumentToken: Number,
      tradingSymbol: String,
      signalType: String,
      timeframe: String,
      candleTimestamp: Date,
      candleClose: Number,
      vwap: Number,
      ema9: Number,
      ema20: Number,
      previousDirection: String,
      strategyVersion: String,
    },
    { timestamps: true }
  );
  SignalSchema.index({ strategyId: 1, instrumentToken: 1, candleTimestamp: 1, signalType: 1 }, { unique: true });
  const Signal = mongoose.models.Signal || mongoose.model("Signal", SignalSchema);

  console.log("Synchronizing indexes on Atlas...");
  await Candle.init();
  await Indicator.init();
  await StrategyState.init();
  await Signal.init();

  const candleIndexes = await Candle.collection.indexes();
  const indicatorIndexes = await Indicator.collection.indexes();
  const stateIndexes = await StrategyState.collection.indexes();
  const signalIndexes = await Signal.collection.indexes();

  console.log("Candle collection indexes verified:", candleIndexes.map((i) => i.name));
  console.log("Indicator collection indexes verified:", indicatorIndexes.map((i) => i.name));
  console.log("StrategyState collection indexes verified:", stateIndexes.map((i) => i.name));
  console.log("Signal collection indexes verified:", signalIndexes.map((i) => i.name));

  await mongoose.disconnect();
  console.log("All MongoDB indexes verified successfully!");
}

verifyIndexes().catch((err) => {
  console.error("Index verification failed:", err.message);
  process.exit(1);
});

