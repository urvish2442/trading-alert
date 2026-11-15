/**
 * Volume-Weighted Average Price (VWAP) Calculation Engine
 * Pure mathematical functions conforming to GEMINI.md Section 9
 *
 * Rules:
 * - Typical Price = (High + Low + Close) / 3
 * - VWAP = Sum(Typical Price * Volume) / Sum(Volume)
 * - Session Reset: Cumulative sums reset at the start of each new market session (Asia/Kolkata day).
 * - Safe handling of zero cumulative volume (falls back to Typical Price).
 */

/**
 * Returns YYYY-MM-DD in Asia/Kolkata timezone (UTC + 5:30)
 * @param {Date | string | number} timestamp
 * @returns {string}
 */
export function getISTSessionKey(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "unknown";

  // Offset by 5 hours 30 minutes to get local IST calendar day
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffsetMs);

  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istTime.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Calculates Typical Price for a single candle
 * @param {number} high
 * @param {number} low
 * @param {number} close
 * @returns {number}
 */
export function calculateTypicalPrice(high, low, close) {
  return (high + low + close) / 3;
}

/**
 * Computes Session VWAP series for an array of 5-minute candles.
 * Automatically resets session sums when the IST date transitions.
 *
 * @param {Array<object>} candles - Array of candle objects { high, low, close, volume, candleTimestamp }
 * @returns {Array<number>} - Array of VWAP values corresponding to each candle
 */
export function calculateSessionVWAPSeries(candles) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return [];
  }

  const vwapSeries = [];
  let currentSession = null;
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const sessionKey = getISTSessionKey(candle.candleTimestamp);

    // Session Reset: If new trading session begins, reset cumulative metrics
    if (sessionKey !== currentSession) {
      currentSession = sessionKey;
      cumulativeTypicalVolume = 0;
      cumulativeVolume = 0;
    }

    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume) || 0;

    const typicalPrice = calculateTypicalPrice(high, low, close);

    cumulativeTypicalVolume += typicalPrice * volume;
    cumulativeVolume += volume;

    // Handle zero volume safely
    let vwapValue;
    if (cumulativeVolume > 0) {
      vwapValue = cumulativeTypicalVolume / cumulativeVolume;
    } else {
      vwapValue = typicalPrice;
    }

    vwapSeries.push(Number(vwapValue.toFixed(4)));
  }

  return vwapSeries;
}

