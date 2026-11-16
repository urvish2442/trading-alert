/**
 * Historical Recovery & Market Processing Service
 * Conforms to GEMINI.md Section 4 (Idempotency) and Section 8 (Recovery)
 */

import { connectToDatabase } from "@/lib/mongodb/connection";
import StrategyState from "@/lib/mongodb/models/StrategyState";
import Signal from "@/lib/mongodb/models/Signal";
import SystemLog from "@/lib/mongodb/models/SystemLog";
import { getOrCreateDefaultStrategy } from "@/lib/strategy/signal-engine";
import { calculateIndicatorSeries } from "@/lib/indicators/indicator-engine";
import {
  evaluateOptionBuyerStrategy,
  STATE_FLAT,
} from "@/lib/strategy/strategy-rules";
import { broadcastSignalAlert } from "@/lib/notifications/web-push";

/**
 * Checks whether the most recent candle data is stale during market hours
 * @param {object} latestCandle
 * @param {number} maxAgeMinutes - Default 15 minutes (3 five-minute intervals)
 * @returns {{ isStale: boolean, ageMinutes: number, latestCandleTime: Date | null }}
 */
export function checkStaleData(latestCandle, maxAgeMinutes = 15) {
  if (!latestCandle || !latestCandle.candleTimestamp) {
    return {
      isStale: true,
      ageMinutes: Infinity,
      latestCandleTime: null,
      reason: "No candle data found",
    };
  }

  const now = Date.now();
  const candleTime = new Date(latestCandle.candleTimestamp).getTime();
  const ageMinutes = Math.floor((now - candleTime) / 60000);

  return {
    isStale: ageMinutes > maxAgeMinutes,
    ageMinutes,
    latestCandleTime: latestCandle.candleTimestamp,
    reason: ageMinutes > maxAgeMinutes ? `Data is ${ageMinutes}m old (exceeds ${maxAgeMinutes}m threshold)` : "Data is fresh",
  };
}

/**
 * Idempotently executes market processing for the latest completed candle
 * Handles missed scheduler runs by performing chronological historical recovery
 *
 * @param {Array<object>} candles - Sorted completed candles (ascending)
 * @param {boolean} isLiveMarket - Whether market is actively open
 * @returns {Promise<object>}
 */
export async function executeMarketProcessing(candles, isLiveMarket = true) {
  if (!Array.isArray(candles) || candles.length < 10) {
    return {
      success: false,
      status: "insufficient_data",
      message: "At least 10 completed candles required for EMA 9 and VWAP calculations",
    };
  }

  await connectToDatabase();
  const strategy = await getOrCreateDefaultStrategy();

  if (!strategy.enabled) {
    return {
      success: false,
      status: "disabled",
      message: "Strategy is currently disabled",
    };
  }

  const series = calculateIndicatorSeries(candles);
  if (series.length < 2) {
    return {
      success: false,
      status: "insufficient_series",
      message: "Insufficient indicator series length",
    };
  }

  const latestBar = series[series.length - 1];
  const instrumentToken = latestBar.instrumentToken;

  // Retrieve persisted strategy state
  let stateDoc = await StrategyState.findOne({
    strategyId: strategy._id,
    instrumentToken,
  });

  const lastProcessedTime = stateDoc?.lastProcessedCandle
    ? new Date(stateDoc.lastProcessedCandle).getTime()
    : null;

  const latestCandleTime = new Date(latestBar.candleTimestamp).getTime();

  // 1. Idempotency Check: Candle already processed
  if (lastProcessedTime && latestCandleTime <= lastProcessedTime) {
    return {
      success: true,
      status: "idempotent",
      message: "Candle at this timestamp has already been processed",
      candleTimestamp: latestBar.candleTimestamp,
      tradeState: stateDoc.tradeState,
      newSignal: null,
    };
  }

  // 2. Identify all unprocessed candles (Historical Recovery)
  const unprocessedIndices = [];
  for (let i = 1; i < series.length; i++) {
    const barTime = new Date(series[i].candleTimestamp).getTime();
    if (!lastProcessedTime || barTime > lastProcessedTime) {
      unprocessedIndices.push(i);
    }
  }

  let runningState = stateDoc ? stateDoc.tradeState : STATE_FLAT;
  let latestNewSignal = null;
  const recoveredSignals = [];
  const missedCount = unprocessedIndices.length;

  // 3. Process missing candles in strict chronological order
  for (let step = 0; step < unprocessedIndices.length; step++) {
    const idx = unprocessedIndices[step];
    const prevBar = series[idx - 1];
    const currBar = series[idx];

    // Need valid indicators
    if (currBar.ema9 == null || prevBar.ema9 == null || currBar.vwap == null || prevBar.vwap == null) {
      continue;
    }

    const evaluation = evaluateOptionBuyerStrategy(currBar, prevBar, runningState);
    const isLiveLatestBar = step === unprocessedIndices.length - 1;

    if (evaluation.signalType) {
      let createdSignal = null;
      let isNewlyInserted = false;

      try {
        createdSignal = await Signal.create({
          strategyId: strategy._id,
          instrumentToken,
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
        isNewlyInserted = true;
      } catch (err) {
        if (err.code === 11000) {
          // Idempotency: Duplicate index caught safely
          createdSignal = await Signal.findOne({
            strategyId: strategy._id,
            instrumentToken,
            candleTimestamp: currBar.candleTimestamp,
            signalType: evaluation.signalType,
          });
        } else {
          throw err;
        }
      }

      if (createdSignal) {
        recoveredSignals.push(createdSignal);
        latestNewSignal = createdSignal;

        // GEMINI.md Section 8 Rule:
        // "Avoid generating delayed notifications as if they were live signals."
        // Only dispatch Web Push if this is the immediate latest bar and market is live!
        if (isNewlyInserted && isLiveLatestBar && isLiveMarket) {
          broadcastSignalAlert(createdSignal).catch((err) =>
            console.error("Cron Web Push dispatch error:", err.message)
          );

          // Automated Paper Trading Execution (Live Signals only, GEMINI.md Section 11.11)
          try {
            const { processSignalForPaperTrading } = await import(
              "@/lib/paper-trading/paper-trading-service"
            );
            await processSignalForPaperTrading(createdSignal, currBar.close).catch((err) =>
              console.error("Cron Paper Trading execution error:", err.message)
            );
          } catch (err) {
            console.warn("Could not load paper trading service:", err.message);
          }
        }
      }
    }

    runningState = evaluation.newState;
  }

  // 4. Update persisted strategy state
  await StrategyState.findOneAndUpdate(
    { strategyId: strategy._id, instrumentToken },
    {
      $set: {
        tradeState: runningState,
        lastSignalType: latestNewSignal ? latestNewSignal.signalType : stateDoc?.lastSignalType,
        lastProcessedCandle: latestBar.candleTimestamp,
      },
    },
    { upsert: true, new: true }
  );

  // 5. Update live valuation and expiry cutoff for active paper positions
  try {
    const { getOpenPaperPosition, updatePositionMarketValuation, checkAndCloseExpirySafety } =
      await import("@/lib/paper-trading/position-manager");
    const { getOrCreatePaperSettings } = await import(
      "@/lib/paper-trading/paper-trading-service"
    );
    const settings = await getOrCreatePaperSettings(strategy._id);
    if (settings.enabled) {
      await checkAndCloseExpirySafety(settings);
      const openPos = await getOpenPaperPosition(strategy._id);
      if (openPos) {
        await updatePositionMarketValuation(openPos, latestBar.close, settings);
      }
    }
  } catch (err) {
    console.warn("Paper trading valuation update error:", err.message);
  }

  // 6. System Log audit
  await SystemLog.create({
    category: "cron",
    level: "info",
    message: `Market processing complete: ${missedCount} candle(s) evaluated`,
    metadata: {
      candleTimestamp: latestBar.candleTimestamp,
      missedCount,
      signalsGenerated: recoveredSignals.length,
      finalTradeState: runningState,
    },
  }).catch(() => {});

  return {
    success: true,
    status: missedCount > 1 ? "recovered" : "processed",
    processedCandlesCount: missedCount,
    candleTimestamp: latestBar.candleTimestamp,
    tradeState: runningState,
    tradeStateLabel:
      runningState === 1 ? "PUT ACTIVE" : runningState === 2 ? "CALL ACTIVE" : "FLAT",
    newSignal: latestNewSignal,
    signalsCount: recoveredSignals.length,
    latestBar: {
      close: latestBar.close,
      vwap: latestBar.vwap,
      ema9: latestBar.ema9,
      timestamp: latestBar.candleTimestamp,
    },
  };
}
