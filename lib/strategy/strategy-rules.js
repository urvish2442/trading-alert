/**
 * Strategy: "NIFTY Option Buyer - VWAP EMA9 Reversal Strategy"
 * Conforms 100% to Pine Script v6 specification
 *
 * State Machine:
 * - 0 = No active trade (FLAT)
 * - 1 = PUT active
 * - 2 = CALL active
 *
 * Signals:
 * - BUY PUT (Bearish Entry from Flat or Reversal from CALL)
 * - BUY CALL (Bullish Entry from Flat or Reversal from PUT)
 * - EXIT PUT (Bearish Exit on EMA 9 crossover)
 * - EXIT CALL (Bullish Exit on EMA 9 crossunder)
 */

export const STRATEGY_NAME = "NIFTY Option Buyer - VWAP EMA9 Reversal Strategy";
export const STRATEGY_VERSION = "3.0.0";

export const STATE_FLAT = 0;
export const STATE_PUT_ACTIVE = 1;
export const STATE_CALL_ACTIVE = 2;

/**
 * ta.crossover(source, target):
 * Returns true if source crossed above target between previous bar and current bar
 * @param {number} prevSource
 * @param {number} currSource
 * @param {number} prevTarget
 * @param {number} currTarget
 * @returns {boolean}
 */
export function isCrossover(prevSource, currSource, prevTarget, currTarget) {
  return prevSource <= prevTarget && currSource > currTarget;
}

/**
 * ta.crossunder(source, target):
 * Returns true if source crossed below target between previous bar and current bar
 * @param {number} prevSource
 * @param {number} currSource
 * @param {number} prevTarget
 * @param {number} currTarget
 * @returns {boolean}
 */
export function isCrossunder(prevSource, currSource, prevTarget, currTarget) {
  return prevSource >= prevTarget && currSource < currTarget;
}

/**
 * Evaluates Pine Script v6 "NIFTY Option Buyer - VWAP EMA9 Reversal Strategy"
 *
 * @param {object} currBar - { close: number, vwap: number, ema9: number }
 * @param {object} prevBar - { close: number, vwap: number, ema9: number }
 * @param {number} currentState - 0 (FLAT), 1 (PUT active), 2 (CALL active)
 * @returns {{
 *   buyPut: boolean,
 *   buyCall: boolean,
 *   exitPut: boolean,
 *   exitCall: boolean,
 *   newState: number,
 *   signalType: "BUY PUT" | "BUY CALL" | "EXIT PUT" | "EXIT CALL" | null,
 *   crossovers: { vwapDown: boolean, vwapUp: boolean, emaUp: boolean, emaDown: boolean }
 * }}
 */
export function evaluateOptionBuyerStrategy(currBar, prevBar, currentState = STATE_FLAT) {
  if (!currBar || !prevBar) {
    return {
      buyPut: false,
      buyCall: false,
      exitPut: false,
      exitCall: false,
      newState: currentState,
      signalType: null,
      crossovers: { vwapDown: false, vwapUp: false, emaUp: false, emaDown: false },
    };
  }

  // Crossovers matching TradingView ta.crossover & ta.crossunder
  const vwapDown = isCrossunder(prevBar.close, currBar.close, prevBar.vwap, currBar.vwap);
  const vwapUp = isCrossover(prevBar.close, currBar.close, prevBar.vwap, currBar.vwap);

  const emaUp = isCrossover(prevBar.close, currBar.close, prevBar.ema9, currBar.ema9);
  const emaDown = isCrossunder(prevBar.close, currBar.close, prevBar.ema9, currBar.ema9);

  let buyPut = false;
  let buyCall = false;
  let exitPut = false;
  let exitCall = false;
  let state = currentState;

  // Exact Pine Script state machine execution
  if (state === STATE_FLAT) {
    // 0 = No active trade
    if (vwapDown) {
      buyPut = true;
      state = STATE_PUT_ACTIVE;
    } else if (vwapUp) {
      buyCall = true;
      state = STATE_CALL_ACTIVE;
    }
  } else if (state === STATE_PUT_ACTIVE) {
    // 1 = PUT active - Bearish trend
    // REVERSE: VWAP CROSSED UP AND CLOSE > EMA9
    if (vwapUp && currBar.close > currBar.ema9) {
      buyCall = true;
      state = STATE_CALL_ACTIVE;
    } else if (emaUp) {
      // EXIT PUT: EMA9 CROSSED UP ONLY
      exitPut = true;
      state = STATE_FLAT;
    }
  } else if (state === STATE_CALL_ACTIVE) {
    // 2 = CALL active - Bullish trend
    // REVERSE: VWAP CROSSED DOWN AND CLOSE < EMA9
    if (vwapDown && currBar.close < currBar.ema9) {
      buyPut = true;
      state = STATE_PUT_ACTIVE;
    } else if (emaDown) {
      // EXIT CALL: EMA9 CROSSED DOWN ONLY
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
