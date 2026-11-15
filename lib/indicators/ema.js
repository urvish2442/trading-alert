/**
 * Exponential Moving Average (EMA) Calculation Engine
 * Pure mathematical functions conforming to GEMINI.md Section 9
 */

/**
 * Calculates EMA series for a given period over closing prices.
 * Initial seed uses Simple Moving Average (SMA) of the first `period` bars.
 *
 * Formula:
 *   alpha = 2 / (period + 1)
 *   EMA = (close * alpha) + (previousEMA * (1 - alpha))
 *
 * @param {Array<number | { close: number }>} candles - Array of closes or candle objects
 * @param {number} period - Smoothing period (e.g. 9 or 20)
 * @returns {Array<number | null>} - Array of computed EMA values (null during warm-up)
 */
export function calculateEMASeries(candles, period) {
  if (!Array.isArray(candles) || candles.length === 0 || !period || period < 1) {
    return [];
  }

  // Extract numeric close prices
  const closes = candles.map((c) => (typeof c === "object" && c !== null ? c.close : c));

  const result = new Array(closes.length).fill(null);

  if (closes.length < period) {
    return result; // Insufficient data for calculation
  }

  const alpha = 2 / (period + 1);

  // 1. Calculate SMA for the initial period
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    const val = Number(closes[i]);
    if (isNaN(val)) return result;
    initialSum += val;
  }

  let previousEMA = initialSum / period;
  result[period - 1] = Number(previousEMA.toFixed(4));

  // 2. Compute subsequent EMA values iteratively
  for (let i = period; i < closes.length; i++) {
    const close = Number(closes[i]);
    if (isNaN(close)) {
      result[i] = null;
      continue;
    }
    const currentEMA = close * alpha + previousEMA * (1 - alpha);
    result[i] = Number(currentEMA.toFixed(4));
    previousEMA = currentEMA;
  }

  return result;
}

/**
 * Calculates EMA 9 over candles
 * @param {Array<number | { close: number }>} candles
 * @returns {Array<number | null>}
 */
export function calculateEMA9(candles) {
  return calculateEMASeries(candles, 9);
}

/**
 * Calculates EMA 20 over candles
 * @param {Array<number | { close: number }>} candles
 * @returns {Array<number | null>}
 */
export function calculateEMA20(candles) {
  return calculateEMASeries(candles, 20);
}

/**
 * Computes the single next EMA value from the previous EMA
 * @param {number} close
 * @param {number} period
 * @param {number} previousEMA
 * @returns {number}
 */
export function calculateNextEMA(close, period, previousEMA) {
  const alpha = 2 / (period + 1);
  const nextEMA = close * alpha + previousEMA * (1 - alpha);
  return Number(nextEMA.toFixed(4));
}

