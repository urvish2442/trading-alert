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

const STRATEGY_NAME = "NIFTY Option Buyer - VWAP EMA9 Reversal Strategy";
const STRATEGY_VERSION = "3.0.0";

const STATE_FLAT = 0;
const STATE_PUT_ACTIVE = 1;
const STATE_CALL_ACTIVE = 2;

function isCrossover(prevSource, currSource, prevTarget, currTarget) {
  return prevSource <= prevTarget && currSource > currTarget;
}

function isCrossunder(prevSource, currSource, prevTarget, currTarget) {
  return prevSource >= prevTarget && currSource < currTarget;
}

function evaluateOptionBuyerStrategy(currBar, prevBar, currentState = STATE_FLAT) {
  if (!currBar || !prevBar) {
    return {
      buyPut: false,
      buyCall: false,
      exitPut: false,
      exitCall: false,
      newState: currentState,
      signalType: null,
    };
  }

  const vwapDown = isCrossunder(prevBar.close, currBar.close, prevBar.vwap, currBar.vwap);
  const vwapUp = isCrossover(prevBar.close, currBar.close, prevBar.vwap, currBar.vwap);

  const emaUp = isCrossover(prevBar.close, currBar.close, prevBar.ema9, currBar.ema9);
  const emaDown = isCrossunder(prevBar.close, currBar.close, prevBar.ema9, currBar.ema9);

  let buyPut = false;
  let buyCall = false;
  let exitPut = false;
  let exitCall = false;
  let state = currentState;

  if (state === STATE_FLAT) {
    if (vwapDown) {
      buyPut = true;
      state = STATE_PUT_ACTIVE;
    } else if (vwapUp) {
      buyCall = true;
      state = STATE_CALL_ACTIVE;
    }
  } else if (state === STATE_PUT_ACTIVE) {
    // REVERSE: VWAP CROSSED UP AND CLOSE > EMA9
    if (vwapUp && currBar.close > currBar.ema9) {
      buyCall = true;
      state = STATE_CALL_ACTIVE;
    } else if (emaUp) {
      exitPut = true;
      state = STATE_FLAT;
    }
  } else if (state === STATE_CALL_ACTIVE) {
    // REVERSE: VWAP CROSSED DOWN AND CLOSE < EMA9
    if (vwapDown && currBar.close < currBar.ema9) {
      buyPut = true;
      state = STATE_PUT_ACTIVE;
    } else if (emaDown) {
      exitCall = true;
      state = STATE_FLAT;
    }
  }

  let signalType = null;
  if (buyPut) signalType = "BUY PUT";
  else if (buyCall) signalType = "BUY CALL";
  else if (exitPut) signalType = "EXIT PUT";
  else if (exitCall) signalType = "EXIT CALL";

  return {
    buyPut,
    buyCall,
    exitPut,
    exitCall,
    newState: state,
    signalType,
    crossovers: { vwapDown, vwapUp, emaUp, emaDown },
  };
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "trading_alert";

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  console.log("Connected to MongoDB Atlas!");

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
      rules: Object,
    },
    { timestamps: true }
  );
  const Strategy = mongoose.models.Strategy || mongoose.model("Strategy", StrategySchema);

  const StrategyStateSchema = new mongoose.Schema(
    {
      strategyId: mongoose.Schema.Types.ObjectId,
      instrumentToken: Number,
      tradeState: Number,
      lastSignalType: String,
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
      previousState: Number,
      newState: Number,
      strategyVersion: String,
    },
    { timestamps: true }
  );
  SignalSchema.index({ strategyId: 1, instrumentToken: 1, candleTimestamp: 1, signalType: 1 }, { unique: true });
  const Signal = mongoose.models.Signal || mongoose.model("Signal", SignalSchema);

  // 1. Clear old signals and strategy states
  console.log("\n1. Clearing old signals, strategy states, and legacy strategies...");
  const deletedSignals = await Signal.deleteMany({});
  const deletedStates = await StrategyState.deleteMany({});
  const deletedStrategies = await Strategy.deleteMany({});
  console.log(`Deleted ${deletedSignals.deletedCount} signals, ${deletedStates.deletedCount} states, ${deletedStrategies.deletedCount} strategies.`);

  // 2. Create the Pine Script strategy document
  console.log("\n2. Initializing new Pine Script strategy configuration...");
  const strategy = await Strategy.create({
    name: STRATEGY_NAME,
    enabled: true,
    timeframe: "5minute",
    emaFastPeriod: 9,
    version: STRATEGY_VERSION,
    rules: {
      type: "PineScript v6 Option Buyer",
      indicators: ["EMA 9", "Session VWAP"],
      states: ["0: FLAT", "1: PUT ACTIVE", "2: CALL ACTIVE"],
      entries: [
        "State 0 + vwapDown -> BUY PUT (State 1)",
        "State 0 + vwapUp -> BUY CALL (State 2)",
      ],
      reversals: [
        "State 1 + vwapUp and close > ema9 -> BUY CALL (State 2)",
        "State 2 + vwapDown and close < ema9 -> BUY PUT (State 1)",
      ],
      exits: [
        "State 1 + emaUp -> EXIT PUT (State 0)",
        "State 2 + emaDown -> EXIT CALL (State 0)",
      ],
    },
  });
  console.log(`Created strategy: "${strategy.name}" (ID: ${strategy._id})`);

  // 3. Load all candles
  console.log("\n3. Loading 5-minute candles from MongoDB Atlas...");
  const candles = await Candle.find({ timeframe: "5minute" }).sort({ candleTimestamp: 1 }).lean();
  console.log(`Loaded ${candles.length} historical candles.`);

  if (candles.length < 10) {
    console.error("Not enough candles to compute EMA 9 and VWAP!");
    await mongoose.disconnect();
    return;
  }

  // 4. Calculate indicators (EMA 9 & Session VWAP)
  const closes = candles.map((c) => c.close);
  const ema9Series = new Array(closes.length).fill(null);
  const alpha9 = 2 / (9 + 1);

  // Initial SMA 9
  let sma9 = 0;
  for (let i = 0; i < 9; i++) sma9 += closes[i];
  sma9 /= 9;
  ema9Series[8] = sma9;

  for (let i = 9; i < closes.length; i++) {
    const prevEma = ema9Series[i - 1];
    ema9Series[i] = closes[i] * alpha9 + prevEma * (1 - alpha9);
  }

  // Session VWAP (resetting at IST 00:00)
  const vwapSeries = [];
  let cumTPV = 0;
  let cumV = 0;
  let currentDay = "";

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const istDate = new Date(c.candleTimestamp.getTime() + 5.5 * 3600000);
    const istDay = istDate.toISOString().slice(0, 10);

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

  // Build bar objects
  const series = candles.map((c, i) => ({
    instrumentToken: c.instrumentToken,
    tradingSymbol: c.tradingSymbol,
    timeframe: c.timeframe,
    candleTimestamp: c.candleTimestamp,
    close: c.close,
    vwap: Number(vwapSeries[i].toFixed(2)),
    ema9: ema9Series[i] != null ? Number(ema9Series[i].toFixed(2)) : null,
  }));

  // 5. Run Pine Script State Machine
  console.log("\n4. Replaying Pine Script State Machine across candle series...");
  let runningState = STATE_FLAT;
  const signalCounts = {
    "BUY CALL": 0,
    "BUY PUT": 0,
    "EXIT CALL": 0,
    "EXIT PUT": 0,
  };

  const signalsToSave = [];

  for (let i = 1; i < series.length; i++) {
    const prevBar = series[i - 1];
    const currBar = series[i];

    if (currBar.ema9 == null || prevBar.ema9 == null) {
      continue;
    }

    const evaluation = evaluateOptionBuyerStrategy(currBar, prevBar, runningState);

    if (evaluation.signalType) {
      signalCounts[evaluation.signalType]++;
      signalsToSave.push({
        strategyId: strategy._id,
        instrumentToken: currBar.instrumentToken,
        tradingSymbol: currBar.tradingSymbol,
        signalType: evaluation.signalType,
        timeframe: currBar.timeframe || "5minute",
        candleTimestamp: currBar.candleTimestamp,
        candleClose: currBar.close,
        vwap: currBar.vwap,
        ema9: currBar.ema9,
        previousState: runningState,
        newState: evaluation.newState,
        strategyVersion: strategy.version,
      });
    }

    runningState = evaluation.newState;
  }

  // Insert all signals into Atlas
  console.log(`\nGenerated ${signalsToSave.length} total signals. Saving to MongoDB Atlas...`);
  if (signalsToSave.length > 0) {
    await Signal.insertMany(signalsToSave, { ordered: false });
  }

  // Save final state
  const lastBar = series[series.length - 1];
  await StrategyState.findOneAndUpdate(
    { strategyId: strategy._id, instrumentToken: lastBar.instrumentToken },
    {
      $set: {
        tradeState: runningState,
        lastSignalType: signalsToSave.length > 0 ? signalsToSave[signalsToSave.length - 1].signalType : null,
        lastProcessedCandle: lastBar.candleTimestamp,
      },
    },
    { upsert: true }
  );

  console.log("\n================ STRATEGY REPLAY SUMMARY ================");
  console.log("Strategy:            ", STRATEGY_NAME);
  console.log("Total Signals Saved: ", signalsToSave.length);
  console.log("Signal Breakdown:");
  console.log("  - BUY CALL:  ", signalCounts["BUY CALL"]);
  console.log("  - BUY PUT:   ", signalCounts["BUY PUT"]);
  console.log("  - EXIT CALL: ", signalCounts["EXIT CALL"]);
  console.log("  - EXIT PUT:  ", signalCounts["EXIT PUT"]);
  console.log("Final Trade State:   ", runningState === 0 ? "0 (FLAT)" : runningState === 1 ? "1 (PUT ACTIVE)" : "2 (CALL ACTIVE)");
  console.log("Last Candle Processed:", lastBar.candleTimestamp.toISOString());

  if (signalsToSave.length > 0) {
    const latest = signalsToSave[signalsToSave.length - 1];
    console.log("\nMost Recent Signal:");
    console.log(`  Type:       ${latest.signalType}`);
    console.log(`  Close:      ₹${latest.candleClose}`);
    console.log(`  VWAP:       ₹${latest.vwap}`);
    console.log(`  EMA 9:      ₹${latest.ema9}`);
    console.log(`  Time (UTC): ${latest.candleTimestamp.toISOString()}`);
    const istTime = new Date(latest.candleTimestamp.getTime() + 5.5 * 3600000);
    console.log(`  Time (IST): ${istTime.toISOString().replace("T", " ").replace("Z", "")} IST`);
  }
  console.log("=========================================================\n");

  await mongoose.disconnect();
  console.log("Execution completed successfully.");
}

run().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});

