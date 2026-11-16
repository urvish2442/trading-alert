import { describe, it, expect } from "vitest";
import {
  isCrossover,
  isCrossunder,
  evaluateOptionBuyerStrategy,
  STATE_FLAT,
  STATE_PUT_ACTIVE,
  STATE_CALL_ACTIVE,
} from "../../lib/strategy/strategy-rules";

describe("Pine Script v6 'NIFTY Option Buyer - VWAP EMA9 Reversal Strategy' Rules", () => {
  describe("Crossover Primitives (ta.crossover & ta.crossunder)", () => {
    it("isCrossover returns true only when previous <= target and current > target", () => {
      // Crossed over
      expect(isCrossover(99, 101, 100, 100)).toBe(true);
      expect(isCrossover(100, 101, 100, 100)).toBe(true);

      // Already above
      expect(isCrossover(102, 105, 100, 100)).toBe(false);
      // Still below
      expect(isCrossover(90, 95, 100, 100)).toBe(false);
      // Crossed under
      expect(isCrossover(105, 95, 100, 100)).toBe(false);
    });

    it("isCrossunder returns true only when previous >= target and current < target", () => {
      // Crossed under
      expect(isCrossunder(101, 99, 100, 100)).toBe(true);
      expect(isCrossunder(100, 99, 100, 100)).toBe(true);

      // Already below
      expect(isCrossunder(95, 90, 100, 100)).toBe(false);
      // Still above
      expect(isCrossunder(105, 102, 100, 100)).toBe(false);
      // Crossed over
      expect(isCrossunder(95, 105, 100, 100)).toBe(false);
    });
  });

  describe("STATE 0: No Active Trade (FLAT)", () => {
    it("triggers BUY PUT on vwapDown and transitions to state 1", () => {
      // Prev: close >= vwap (25050 >= 25000), Curr: close < vwap (24950 < 25000)
      const prevBar = { close: 25050, vwap: 25000, ema9: 25020 };
      const currBar = { close: 24950, vwap: 25000, ema9: 24980 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_FLAT);
      expect(res.buyPut).toBe(true);
      expect(res.buyCall).toBe(false);
      expect(res.signalType).toBe("BUY PUT");
      expect(res.newState).toBe(STATE_PUT_ACTIVE);
    });

    it("triggers BUY CALL on vwapUp and transitions to state 2", () => {
      // Prev: close <= vwap (24950 <= 25000), Curr: close > vwap (25050 > 25000)
      const prevBar = { close: 24950, vwap: 25000, ema9: 24980 };
      const currBar = { close: 25050, vwap: 25000, ema9: 25020 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_FLAT);
      expect(res.buyCall).toBe(true);
      expect(res.buyPut).toBe(false);
      expect(res.signalType).toBe("BUY CALL");
      expect(res.newState).toBe(STATE_CALL_ACTIVE);
    });

    it("remains FLAT with no signal when no VWAP crossover occurs", () => {
      // Both bars above VWAP
      const prevBar = { close: 25050, vwap: 25000, ema9: 25020 };
      const currBar = { close: 25060, vwap: 25000, ema9: 25030 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_FLAT);
      expect(res.signalType).toBe(null);
      expect(res.newState).toBe(STATE_FLAT);
    });
  });

  describe("STATE 1: PUT Active (Bearish Trend)", () => {
    it("reverses to BUY CALL when vwapUp occurs and close > ema9", () => {
      // vwapUp: prev close <= vwap, curr close > vwap
      // close > ema9: curr close 25020 > ema9 25005
      const prevBar = { close: 24980, vwap: 25000, ema9: 24990 };
      const currBar = { close: 25020, vwap: 25000, ema9: 25005 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_PUT_ACTIVE);
      expect(res.buyCall).toBe(true);
      expect(res.signalType).toBe("BUY CALL");
      expect(res.newState).toBe(STATE_CALL_ACTIVE);
    });

    it("triggers EXIT PUT when emaUp occurs without reversal", () => {
      // emaUp: prev close <= ema9, curr close > ema9, while vwapUp is false (still below VWAP)
      const prevBar = { close: 24900, vwap: 25050, ema9: 24920 };
      const currBar = { close: 24940, vwap: 25050, ema9: 24930 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_PUT_ACTIVE);
      expect(res.exitPut).toBe(true);
      expect(res.signalType).toBe("EXIT PUT");
      expect(res.newState).toBe(STATE_FLAT);
    });

    it("stays in PUT Active state when neither condition triggers", () => {
      const prevBar = { close: 24850, vwap: 25000, ema9: 24900 };
      const currBar = { close: 24820, vwap: 25000, ema9: 24880 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_PUT_ACTIVE);
      expect(res.signalType).toBe(null);
      expect(res.newState).toBe(STATE_PUT_ACTIVE);
    });
  });

  describe("STATE 2: CALL Active (Bullish Trend)", () => {
    it("reverses to BUY PUT when vwapDown occurs and close < ema9", () => {
      // vwapDown: prev close >= vwap, curr close < vwap
      // close < ema9: curr close 24980 < ema9 24995
      const prevBar = { close: 25020, vwap: 25000, ema9: 25010 };
      const currBar = { close: 24980, vwap: 25000, ema9: 24995 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_CALL_ACTIVE);
      expect(res.buyPut).toBe(true);
      expect(res.signalType).toBe("BUY PUT");
      expect(res.newState).toBe(STATE_PUT_ACTIVE);
    });

    it("triggers EXIT CALL when emaDown occurs without reversal", () => {
      // emaDown: prev close >= ema9, curr close < ema9, while vwapDown is false (both above VWAP)
      const prevBar = { close: 25100, vwap: 25000, ema9: 25090 };
      const currBar = { close: 25070, vwap: 25000, ema9: 25080 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_CALL_ACTIVE);
      expect(res.exitCall).toBe(true);
      expect(res.signalType).toBe("EXIT CALL");
      expect(res.newState).toBe(STATE_FLAT);
    });

    it("stays in CALL Active state when price remains in trend", () => {
      const prevBar = { close: 25150, vwap: 25000, ema9: 25100 };
      const currBar = { close: 25180, vwap: 25000, ema9: 25120 };

      const res = evaluateOptionBuyerStrategy(currBar, prevBar, STATE_CALL_ACTIVE);
      expect(res.signalType).toBe(null);
      expect(res.newState).toBe(STATE_CALL_ACTIVE);
    });
  });
});
