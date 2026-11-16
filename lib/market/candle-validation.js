/**
 * Strict 5-Minute Candle Validation & Financial Invariant Engine
 * Conforms to GEMINI.md Section 8 (Market Data and Candle Management)
 *
 * Rules:
 * 1. Timeframe must strictly be "5minute"
 * 2. Candle start timestamp must strictly align to a 5-minute boundary (09:15, 09:20, 09:25... :00.000)
 * 3. In-progress / uncompleted candles must never be treated as completed
 * 4. High >= Open, Close, Low; Low <= Open, Close, High; Volume >= 0
 * 5. Deterministic deduplication: Exactly one candle per (instrumentToken, timeframe, timestamp)
 */

/**
 * Normalizes any timestamp to its strict 5-minute start boundary
 * Example: 09:15:38.123 -> 09:15:00.000
 * @param {Date | string | number} dateInput
 * @returns {Date | null}
 */
export function normalizeTo5MinBoundary(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const minutes = d.getUTCMinutes();
  const remainder = minutes % 5;
  d.setUTCMinutes(minutes - remainder, 0, 0); // Floors to multiple of 5 and zeros seconds & ms
  return d;
}

/**
 * Checks whether a timestamp is strictly aligned to a 5-minute interval
 * with 0 seconds and 0 milliseconds.
 * @param {Date | string | number} dateInput
 * @returns {boolean}
 */
export function is5MinAligned(dateInput) {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  return d.getUTCMinutes() % 5 === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}

/**
 * Checks whether a 5-minute candle interval has fully closed.
 * A candle with start timestamp T closes at T + 5 minutes (300,000 ms).
 * @param {Date | string | number} dateInput - Candle start timestamp
 * @param {number} [now=Date.now()] - Current epoch timestamp
 * @returns {boolean}
 */
export function isCandleCompleted(dateInput, now = Date.now()) {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  const candleCloseTime = d.getTime() + 5 * 60 * 1000;
  return candleCloseTime <= now;
}

/**
 * Validates a single 5-minute OHLCV candle record based on financial market rules.
 * @param {object} candle - Candle object to validate
 * @param {object} [options={}]
 * @param {boolean} [options.requireCompleted=false] - Whether to enforce that the candle is fully closed
 * @param {number} [options.now=Date.now()]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCandle(candle, options = {}) {
  const errors = [];

  if (!candle || typeof candle !== "object") {
    return { valid: false, errors: ["Candle must be an object"] };
  }

  // 1. Timeframe check: strictly "5minute"
  const timeframe = candle.timeframe || "5minute";
  if (timeframe !== "5minute") {
    errors.push(`Invalid timeframe: '${timeframe}'. Only strictly '5minute' candles are permitted`);
  }

  // 2. Timestamp validation & strict 5-minute boundary check
  if (!candle.candleTimestamp) {
    errors.push("Missing candleTimestamp");
  } else {
    const timestamp = new Date(candle.candleTimestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push("Invalid candleTimestamp Date format");
    } else {
      if (!is5MinAligned(timestamp)) {
        errors.push(
          `Candle timestamp must be strictly aligned to a 5-minute boundary with 0 seconds and 0 ms (got ${timestamp.toISOString()})`
        );
      }
      if (options.requireCompleted && !isCandleCompleted(timestamp, options.now || Date.now())) {
        errors.push(`Candle starting at ${timestamp.toISOString()} is not completed yet (still in-progress)`);
      }
    }
  }

  // 3. Numeric checks
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

  // 4. Price Invariants
  if (
    typeof open === "number" &&
    typeof high === "number" &&
    typeof low === "number" &&
    typeof close === "number"
  ) {
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

  // 5. Instrument identification
  if (!candle.tradingSymbol || typeof candle.tradingSymbol !== "string") {
    errors.push("Missing or invalid tradingSymbol");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates, normalizes to 5-minute boundaries, filters incomplete candles,
 * deduplicates identical timestamps, and returns chronologically sorted candles.
 *
 * @param {Array<object>} candles
 * @param {object} [options={}]
 * @param {boolean} [options.filterIncomplete=true] - Discard the forming in-progress candle
 * @param {number} [options.now=Date.now()]
 * @returns {Array<object>}
 */
export function filterAndSortValidCandles(candles, options = {}) {
  if (!Array.isArray(candles)) return [];

  const now = options.now || Date.now();
  const filterIncomplete = options.filterIncomplete !== false;
  const candleMap = new Map();

  for (const raw of candles) {
    if (!raw || typeof raw !== "object") continue;

    // Normalize timestamp to exact 5-minute start boundary
    const normalizedDate = normalizeTo5MinBoundary(raw.candleTimestamp);
    if (!normalizedDate) continue;

    // Reject incomplete in-progress candle
    if (filterIncomplete && !isCandleCompleted(normalizedDate, now)) {
      continue;
    }

    const candidate = {
      ...raw,
      timeframe: "5minute",
      candleTimestamp: normalizedDate,
    };

    const validation = validateCandle(candidate, { requireCompleted: false });
    if (!validation.valid) continue;

    const timeKey = normalizedDate.getTime();
    const existing = candleMap.get(timeKey);

    // Deduplication rule: If candle at this timestamp already exists in the batch,
    // keep the one with higher volume (or the confirmed version)
    if (!existing || candidate.volume > existing.volume) {
      candleMap.set(timeKey, candidate);
    }
  }

  const validCandles = Array.from(candleMap.values());

  // Sort ascending by candle timestamp
  validCandles.sort((a, b) => a.candleTimestamp.getTime() - b.candleTimestamp.getTime());

  return validCandles;
}
