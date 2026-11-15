/**
 * Unified Indicator Engine
 * Single trusted source for EMA 9, EMA 20, and Session VWAP calculations.
 * Conforms to GEMINI.md Section 9 and Section 10.
 */

import { calculateEMA9, calculateEMA20 } from "./ema";
import { calculateSessionVWAPSeries } from "./vwap";
import { connectToDatabase } from "@/lib/mongodb/connection";
import Indicator from "@/lib/mongodb/models/Indicator";

const MINIMUM_WARMUP_CANDLES = 20;

/**
 * Calculates complete indicator series for an array of 5m candles.
 * @param {Array<object>} candles - Sorted chronologically ascending
 * @returns {Array<object>}
 */
export function calculateIndicatorSeries(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return [];
  }

  const ema9Series = calculateEMA9(candles);
  const ema20Series = calculateEMA20(candles);
  const vwapSeries = calculateSessionVWAPSeries(candles);

  return candles.map((candle, idx) => ({
    instrumentToken: candle.instrumentToken,
    tradingSymbol: candle.tradingSymbol,
    timeframe: candle.timeframe || "5minute",
    candleTimestamp: candle.candleTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    vwap: vwapSeries[idx],
    ema9: ema9Series[idx],
    ema20: ema20Series[idx],
    isWarmedUp: ema20Series[idx] !== null,
  }));
}

/**
 * Evaluates directional bias based on Section 10 strategy rules.
 * @param {number} close
 * @param {number} vwap
 * @param {number} ema9
 * @param {number} ema20
 * @returns {{"direction": "BUY" | "SELL" | "NEUTRAL", "conditions": object}}
 */
export function evaluateDirectionalBias(close, vwap, ema9, ema20) {
  if (close == null || vwap == null || ema9 == null || ema20 == null) {
    return {
      direction: "NEUTRAL",
      conditions: {},
    };
  }

  const isBuy = close > vwap && ema9 > ema20 && close > ema9;
  const isSell = close < vwap && ema9 < ema20 && close < ema9;

  let direction = "NEUTRAL";
  if (isBuy) {
    direction = "BUY";
  } else if (isSell) {
    direction = "SELL";
  }

  return {
    direction,
    conditions: {
      closeAboveVWAP: close > vwap,
      ema9AboveEMA20: ema9 > ema20,
      closeAboveEMA9: close > ema9,
      closeBelowVWAP: close < vwap,
      ema9BelowEMA20: ema9 < ema20,
      closeBelowEMA9: close < ema9,
    },
  };
}

/**
 * Returns latest indicator snapshot for the completed candle series
 * @param {Array<object>} candles
 * @returns {object | null}
 */
export function getLatestIndicatorSnapshot(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return null;
  }

  const series = calculateIndicatorSeries(candles);
  const latest = series[series.length - 1];

  const isWarmedUp = candles.length >= MINIMUM_WARMUP_CANDLES && latest.ema20 !== null;

  const evaluation = isWarmedUp
    ? evaluateDirectionalBias(latest.close, latest.vwap, latest.ema9, latest.ema20)
    : { direction: "NEUTRAL", conditions: {} };

  return {
    instrumentToken: latest.instrumentToken,
    tradingSymbol: latest.tradingSymbol,
    timeframe: latest.timeframe,
    candleTimestamp: latest.candleTimestamp,
    close: latest.close,
    vwap: latest.vwap,
    ema9: latest.ema9,
    ema20: latest.ema20,
    isWarmedUp,
    totalCandlesAnalyzed: candles.length,
    direction: evaluation.direction,
    conditions: evaluation.conditions,
  };
}

/**
 * Persists calculated indicator snapshot into MongoDB Atlas with idempotency.
 * @param {object} snapshot
 * @returns {Promise<object>}
 */
export async function persistIndicatorSnapshot(snapshot) {
  if (!snapshot || !snapshot.vwap || !snapshot.ema9 || !snapshot.ema20) {
    return null;
  }

  await connectToDatabase();

  return Indicator.findOneAndUpdate(
    {
      instrumentToken: snapshot.instrumentToken,
      timeframe: snapshot.timeframe || "5minute",
      candleTimestamp: snapshot.candleTimestamp,
    },
    {
      $set: {
        vwap: snapshot.vwap,
        ema9: snapshot.ema9,
        ema20: snapshot.ema20,
      },
    },
    { upsert: true, new: true }
  );
}

