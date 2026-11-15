/**
 * Validates 5-minute OHLCV candle records based on financial market rules.
 * All checks must pass before a candle is persisted or evaluated by indicators.
 */

/**
 * Validates a single completed candle
 * @param {object} candle - Candle object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCandle(candle) {
  const errors = [];

  if (!candle || typeof candle !== "object") {
    return { valid: false, errors: ["Candle must be an object"] };
  }

  // 1. Timestamp validation
  if (!candle.candleTimestamp) {
    errors.push("Missing candleTimestamp");
  } else {
    const timestamp = new Date(candle.candleTimestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push("Invalid candleTimestamp Date format");
    }
  }

  // 2. Numeric checks
  const { open, high, low, close, volume } = candle;

  if (typeof open !== "number" || isNaN(open) || open <= 0) {
    errors.push(`Invalid open price: ${open}`);
  }
  if (typeof high !== "number" || isNaN(high) || high <= 0) {
    errors.push(`Invalid high price: ${high}`);
  }
  if (typeof low !== "number" || isNaN(low) || low <= 0) {
    errors.push(`Invalid low price: ${low}`);
  }
  if (typeof close !== "number" || isNaN(close) || close <= 0) {
    errors.push(`Invalid close price: ${close}`);
  }
  if (typeof volume !== "number" || isNaN(volume) || volume < 0) {
    errors.push(`Invalid volume (must be >= 0): ${volume}`);
  }

  // 3. Price Invariants
  if (typeof open === "number" && typeof high === "number" && typeof low === "number" && typeof close === "number") {
    // High must be >= open, close, and low
    if (high < open) {
      errors.push(`Invariant failed: High (${high}) < Open (${open})`);
    }
    if (high < close) {
      errors.push(`Invariant failed: High (${high}) < Close (${close})`);
    }
    if (high < low) {
      errors.push(`Invariant failed: High (${high}) < Low (${low})`);
    }

    // Low must be <= open, close, and high
    if (low > open) {
      errors.push(`Invariant failed: Low (${low}) > Open (${open})`);
    }
    if (low > close) {
      errors.push(`Invariant failed: Low (${low}) > Close (${close})`);
    }
  }

  // 4. Instrument identification
  if (!candle.tradingSymbol || typeof candle.tradingSymbol !== "string") {
    errors.push("Missing or invalid tradingSymbol");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an array of candles, returning only valid ones sorted chronologically
 * @param {Array<object>} candles
 * @returns {Array<object>}
 */
export function filterAndSortValidCandles(candles) {
  if (!Array.isArray(candles)) return [];

  const validCandles = [];

  for (const candle of candles) {
    const result = validateCandle(candle);
    if (result.valid) {
      validCandles.push({
        ...candle,
        candleTimestamp: new Date(candle.candleTimestamp),
      });
    }
  }

  // Sort ascending by candle timestamp
  validCandles.sort((a, b) => a.candleTimestamp.getTime() - b.candleTimestamp.getTime());

  return validCandles;
}

