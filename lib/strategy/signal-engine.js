/**
 * Strategy Execution & Signal Engine
 * Executes "NIFTY Option Buyer - VWAP EMA9 Both Trends" (Pine Script v6)
 */

import { connectToDatabase } from "@/lib/mongodb/connection";
import Strategy from "@/lib/mongodb/models/Strategy";
import StrategyState from "@/lib/mongodb/models/StrategyState";
import Signal from "@/lib/mongodb/models/Signal";
import {
  evaluateOptionBuyerStrategy,
  STRATEGY_NAME,
  STRATEGY_VERSION,
  STATE_FLAT,
  STATE_PUT_ACTIVE,
  STATE_CALL_ACTIVE,
} from "./strategy-rules";
import { calculateIndicatorSeries } from "@/lib/indicators/indicator-engine";
import { broadcastSignalAlert } from "@/lib/notifications/web-push";

/**
 * Returns or creates the Option Buyer strategy configuration
 * @returns {Promise<object>}
 */
export async function getOrCreateDefaultStrategy() {
  await connectToDatabase();

  let strategy = await Strategy.findOne({ name: STRATEGY_NAME });
  if (!strategy) {
    // Delete any old incompatible strategy configurations
    await Strategy.deleteMany({});
    strategy = await Strategy.create({
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
  }

  return strategy;
}

/**
 * Clears old signals and strategy state to start clean with new strategy
 */
export async function clearAllSignalsAndStates() {
  await connectToDatabase();
  const sigRes = await Signal.deleteMany({});
  const stateRes = await StrategyState.deleteMany({});
  return {
    success: true,
    deletedSignals: sigRes.deletedCount,
    deletedStates: stateRes.deletedCount,
    message: `Cleared ${sigRes.deletedCount} signals and ${stateRes.deletedCount} strategy states`,
  };
}

/**
 * Evaluates strategy on the latest completed candle and dispatches signal if state transitioned
 * @param {Array<object>} candles - Chronological array of 5m candles (min 10)
 * @returns {Promise<{ evaluated: boolean, newSignal: object | null, evaluation: object }>}
 */
export async function evaluateLatestCandle(candles) {
  if (!Array.isArray(candles) || candles.length < 10) {
    return {
      evaluated: false,
      reason: "Insufficient candles for calculation (minimum 10 required)",
      newSignal: null,
      evaluation: null,
    };
  }

  await connectToDatabase();
  const strategy = await getOrCreateDefaultStrategy();

  if (!strategy.enabled) {
    return {
      evaluated: false,
      reason: "Strategy is currently disabled in settings",
      newSignal: null,
      evaluation: null,
    };
  }

  const series = calculateIndicatorSeries(candles);
  if (series.length < 2) {
    return { evaluated: false, reason: "Need at least 2 bars for crossover detection" };
  }

  const prevBar = series[series.length - 2];
  const currBar = series[series.length - 1];

  const instrumentToken = currBar.instrumentToken;

  // Retrieve current trade state from Atlas
  let stateDoc = await StrategyState.findOne({
    strategyId: strategy._id,
    instrumentToken,
  });

  const currentState = stateDoc ? stateDoc.tradeState : STATE_FLAT;

  const evaluation = evaluateOptionBuyerStrategy(currBar, prevBar, currentState);

  let newSignal = null;
  let isNewlyCreated = false;

  if (evaluation.signalType) {
    try {
      newSignal = await Signal.create({
        strategyId: strategy._id,
        instrumentToken,
        tradingSymbol: currBar.tradingSymbol,
        signalType: evaluation.signalType,
        timeframe: currBar.timeframe || "5minute",
        candleTimestamp: currBar.candleTimestamp,
        candleClose: currBar.close,
        vwap: currBar.vwap,
        ema9: currBar.ema9,
        previousState: currentState,
        newState: evaluation.newState,
        strategyVersion: strategy.version,
      });
      isNewlyCreated = true;
    } catch (err) {
      if (err.code === 11000) {
        newSignal = await Signal.findOne({
          strategyId: strategy._id,
          instrumentToken,
          candleTimestamp: currBar.candleTimestamp,
          signalType: evaluation.signalType,
        });
      } else {
        throw err;
      }
    }

    // Only dispatch Web Push notifications for newly created signals (prevents duplicate spam)
    if (isNewlyCreated && newSignal) {
      broadcastSignalAlert(newSignal).catch((err) =>
        console.error("Signal broadcast notification error:", err.message)
      );
    }
  }

  // Update persisted trade state
  await StrategyState.findOneAndUpdate(
    { strategyId: strategy._id, instrumentToken },
    {
      $set: {
        tradeState: evaluation.newState,
        lastSignalType: evaluation.signalType || (stateDoc ? stateDoc.lastSignalType : null),
        lastProcessedCandle: currBar.candleTimestamp,
      },
    },
    { upsert: true, new: true }
  );

  return {
    evaluated: true,
    newSignal,
    evaluation,
    currBar,
  };
}

/**
 * Replays candles through the Pine Script state machine to generate all historical option buyer signals
 * @param {Array<object>} candles
 * @returns {Promise<Array<object>>}
 */
export async function backfillSignalHistory(candles) {
  if (!Array.isArray(candles) || candles.length < 10) {
    return [];
  }

  await connectToDatabase();
  const strategy = await getOrCreateDefaultStrategy();
  const series = calculateIndicatorSeries(candles);

  const generatedSignals = [];
  let runningState = STATE_FLAT;

  for (let i = 1; i < series.length; i++) {
    const prevBar = series[i - 1];
    const currBar = series[i];

    // Need valid EMA 9 and VWAP
    if (currBar.ema9 == null || prevBar.ema9 == null || currBar.vwap == null || prevBar.vwap == null) {
      continue;
    }

    const evaluation = evaluateOptionBuyerStrategy(currBar, prevBar, runningState);

    if (evaluation.signalType) {
      try {
        const sig = await Signal.findOneAndUpdate(
          {
            strategyId: strategy._id,
            instrumentToken: currBar.instrumentToken,
            candleTimestamp: currBar.candleTimestamp,
            signalType: evaluation.signalType,
          },
          {
            $setOnInsert: {
              tradingSymbol: currBar.tradingSymbol,
              timeframe: currBar.timeframe,
              candleClose: currBar.close,
              vwap: currBar.vwap,
              ema9: currBar.ema9,
              previousState: runningState,
              newState: evaluation.newState,
              strategyVersion: strategy.version,
            },
          },
          { upsert: true, new: true }
        );
        generatedSignals.push(sig);
      } catch {
        // Continue
      }
    }

    runningState = evaluation.newState;
  }

  // Update final strategy state
  const lastBar = series[series.length - 1];
  await StrategyState.findOneAndUpdate(
    { strategyId: strategy._id, instrumentToken: lastBar.instrumentToken },
    {
      $set: {
        tradeState: runningState,
        lastProcessedCandle: lastBar.candleTimestamp,
      },
    },
    { upsert: true }
  );

  return generatedSignals;
}

/**
 * Retrieves latest signal from MongoDB
 * @returns {Promise<object | null>}
 */
export async function getLatestSignal() {
  await connectToDatabase();
  return Signal.findOne().sort({ candleTimestamp: -1 }).lean();
}

/**
 * Retrieves active strategy state
 */
export async function getActiveStrategyState() {
  await connectToDatabase();
  const strategy = await getOrCreateDefaultStrategy();
  const state = await StrategyState.findOne({ strategyId: strategy._id }).lean();
  return {
    strategy,
    tradeState: state ? state.tradeState : STATE_FLAT,
    tradeStateLabel:
      state?.tradeState === STATE_PUT_ACTIVE
        ? "PUT ACTIVE"
        : state?.tradeState === STATE_CALL_ACTIVE
        ? "CALL ACTIVE"
        : "FLAT (NO TRADE)",
    lastProcessedCandle: state?.lastProcessedCandle || null,
  };
}

/**
 * Retrieves paginated list of signals with optional filters
 * @param {object} options - { limit, page, signalType, fromDate, toDate }
 * @returns {Promise<{ signals: Array<object>, total: number, page: number, totalPages: number }>}
 */
export async function getSignalsList({ limit = 20, page = 1, signalType, fromDate, toDate } = {}) {
  await connectToDatabase();

  const query = {};
  if (signalType && ["BUY CALL", "BUY PUT", "EXIT CALL", "EXIT PUT"].includes(signalType)) {
    query.signalType = signalType;
  }
  if (fromDate || toDate) {
    query.candleTimestamp = {};
    if (fromDate) query.candleTimestamp.$gte = new Date(fromDate);
    if (toDate) query.candleTimestamp.$lte = new Date(toDate);
  }

  const skip = (page - 1) * limit;

  const [signals, total] = await Promise.all([
    Signal.find(query).sort({ candleTimestamp: -1 }).skip(skip).limit(limit).lean(),
    Signal.countDocuments(query),
  ]);

  return {
    signals,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
