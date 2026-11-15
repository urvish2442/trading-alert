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

  const StrategySchema = new mongoose.Schema(
    {
      name: String,
      enabled: Boolean,
      timeframe: String,
      emaFastPeriod: Number,
      emaSlowPeriod: Number,
      version: String,
    },
    { timestamps: true }
  );
  const Strategy = mongoose.models.Strategy || mongoose.model("Strategy", StrategySchema);

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

  let strategy = await Strategy.findOne({ name: "NIFTY 50 VWAP + EMA 9/20 Intraday" });
  if (!strategy) {
    strategy = await Strategy.create({
      name: "NIFTY 50 VWAP + EMA 9/20 Intraday",
      enabled: true,
      timeframe: "5minute",
      emaFastPeriod: 9,
      emaSlowPeriod: 20,
      version: "1.0.0",
    });
    console.log("Created strategy document in Atlas.");
  }

  const candles = await Candle.find({ timeframe: "5minute" }).sort({ candleTimestamp: 1 }).lean();
  console.log(`Loaded ${candles.length} candles from Atlas for strategy replay.`);

  // Calculate indicators across series
  const closes = candles.map((c) => c.close);
  const ema9Series = new Array(closes.length).fill(null);
  const ema20Series = new Array(closes.length).fill(null);

  // EMA 9
  const alpha9 = 2 / 10;
  let ema9 = closes.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
  ema9Series[8] = ema9;
  for (let i = 9; i < closes.length; i++) {
    ema9 = closes[i] * alpha9 + ema9 * (1 - alpha9);
    ema9Series[i] = ema9;
  }

  // EMA 20
  const alpha20 = 2 / 21;
  let ema20 = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
  ema20Series[19] = ema20;
  for (let i = 20; i < closes.length; i++) {
    ema20 = closes[i] * alpha20 + ema20 * (1 - alpha20);
    ema20Series[i] = ema20;
  }

  // Session VWAP
  const vwapSeries = [];
  let cumTPV = 0;
  let cumV = 0;
  let currentDay = "";
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const istDay = new Date(c.candleTimestamp.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
    if (istDay !== currentDay) {
      currentDay = istDay;
      cumTPV = 0;
      cumV = 0;
    }
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumV += c.volume;
    vwapSeries.push(cumV > 0 ? cumTPV / cumV : tp);
  }

  // Replay transitions
  let currentDirection = "NEUTRAL";
  let createdCount = 0;

  for (let i = 20; i < candles.length; i++) {
    const c = candles[i];
    const close = c.close;
    const vwap = vwapSeries[i];
    const e9 = ema9Series[i];
    const e20 = ema20Series[i];

    const isBuy = close > vwap && e9 > e20 && close > e9;
    const isSell = close < vwap && e9 < e20 && close < e9;
    const dir = isBuy ? "BUY" : isSell ? "SELL" : "NEUTRAL";

    if (dir === "BUY" && currentDirection !== "BUY") {
      try {
        await Signal.findOneAndUpdate(
          {
            strategyId: strategy._id,
            instrumentToken: c.instrumentToken,
            candleTimestamp: c.candleTimestamp,
            signalType: "BUY",
          },
          {
            $setOnInsert: {
              tradingSymbol: c.tradingSymbol,
              timeframe: "5minute",
              candleClose: close,
              vwap: Number(vwap.toFixed(2)),
              ema9: Number(e9.toFixed(2)),
              ema20: Number(e20.toFixed(2)),
              previousDirection: currentDirection,
              strategyVersion: strategy.version,
            },
          },
          { upsert: true }
        );
        createdCount++;
      } catch (err) {
        // Ignore duplicate
      }
    } else if (dir === "SELL" && currentDirection !== "SELL") {
      try {
        await Signal.findOneAndUpdate(
          {
            strategyId: strategy._id,
            instrumentToken: c.instrumentToken,
            candleTimestamp: c.candleTimestamp,
            signalType: "SELL",
          },
          {
            $setOnInsert: {
              tradingSymbol: c.tradingSymbol,
              timeframe: "5minute",
              candleClose: close,
              vwap: Number(vwap.toFixed(2)),
              ema9: Number(e9.toFixed(2)),
              ema20: Number(e20.toFixed(2)),
              previousDirection: currentDirection,
              strategyVersion: strategy.version,
            },
          },
          { upsert: true }
        );
        createdCount++;
      } catch (err) {
        // Ignore duplicate
      }
    }

    currentDirection = dir;
  }

  // Update final strategy state
  const lastCandle = candles[candles.length - 1];
  await StrategyState.findOneAndUpdate(
    { strategyId: strategy._id, instrumentToken: lastCandle.instrumentToken },
    {
      $set: {
        lastDirection: currentDirection,
        lastProcessedCandle: lastCandle.candleTimestamp,
      },
    },
    { upsert: true }
  );

  const totalSignals = await Signal.countDocuments();
  console.log(`Replay complete: ${totalSignals} signals stored in MongoDB Atlas.`);

  const sampleSignal = await Signal.findOne().sort({ candleTimestamp: -1 }).lean();
  if (sampleSignal) {
    console.log("Latest Signal in Atlas:", {
      type: sampleSignal.signalType,
      time: sampleSignal.candleTimestamp.toISOString(),
      close: sampleSignal.candleClose,
      vwap: sampleSignal.vwap,
      ema9: sampleSignal.ema9,
      ema20: sampleSignal.ema20,
      prevDirection: sampleSignal.previousDirection,
    });
  }

  await mongoose.disconnect();
  console.log("Strategy execution test complete!");
}

run().catch((err) => {
  console.error("Strategy test error:", err.message);
  process.exit(1);
});

