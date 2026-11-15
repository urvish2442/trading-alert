import { describe, it, expect } from "vitest";
import { validateCandle } from "@/lib/market/candle-validation";
import { calculateIndicatorSeries } from "@/lib/indicators/indicator-engine";
import { evaluateOptionBuyerStrategy, STATE_FLAT, STATE_PUT_ACTIVE } from "@/lib/strategy/strategy-rules";
import { formatSignalNotificationPayload } from "@/lib/notifications/web-push";

describe("Milestone 9: End-to-End Trading Pipeline Verification", () => {
  it("should execute complete end-to-end flow: Ingestion -> Indicators -> Strategy -> Alert Formatting -> Idempotency", () => {
    // 1. Ingestion: Simulated series of completed 5m candles (15 candles so EMA9 warms up)
    const baseTime = new Date("2026-11-13T09:15:00.000Z");
    const candles = [];

    // First 10 candles: steady hovering around 24100-24120
    for (let i = 0; i < 10; i++) {
      candles.push({
        tradingSymbol: "NIFTY 50",
        candleTimestamp: new Date(baseTime.getTime() + i * 5 * 60 * 1000),
        open: 24100 + (i % 2) * 5,
        high: 24125 + (i % 2) * 5,
        low: 24090,
        close: 24110 + (i % 2) * 10,
        volume: 200000 + i * 10000,
      });
    }

    // Candle 10: Sharp plunge breaking below VWAP & EMA9
    candles.push({
      tradingSymbol: "NIFTY 50",
      candleTimestamp: new Date(baseTime.getTime() + 10 * 5 * 60 * 1000),
      open: 24115,
      high: 24120,
      low: 23990,
      close: 24010, // Drop below VWAP & EMA9
      volume: 450000,
    });

    // Candle 11: Sharp rally breaking back above VWAP
    candles.push({
      tradingSymbol: "NIFTY 50",
      candleTimestamp: new Date(baseTime.getTime() + 11 * 5 * 60 * 1000),
      open: 24010,
      high: 24180,
      low: 24005,
      close: 24170, // Surge above VWAP
      volume: 500000,
    });

    // Verify all candles pass market invariant validation
    for (const c of candles) {
      const v = validateCandle(c);
      expect(v.valid).toBe(true);
    }

    // 2. Compute Indicator Engine snapshots
    const indicators = calculateIndicatorSeries(candles);
    expect(indicators).toHaveLength(12);

    const ind10 = indicators[10]; // Drop candle
    expect(ind10.vwap).toBeGreaterThan(0);
    expect(ind10.ema9).toBeGreaterThan(0);

    // 3. Strategy State Machine Execution
    // State 0 (FLAT): When candle 10 drops below VWAP -> BUY PUT (state 1)
    const result1 = evaluateOptionBuyerStrategy(ind10, indicators[9], STATE_FLAT);

    expect(result1.buyPut).toBe(true);
    expect(result1.signalType).toBe("BUY PUT");
    expect(result1.newState).toBe(STATE_PUT_ACTIVE);

    // 4. Format Push Alert
    const alert1 = formatSignalNotificationPayload({
      signalType: result1.signalType,
      tradingSymbol: "NIFTY 50",
      candleClose: ind10.close,
      vwap: ind10.vwap,
      ema9: ind10.ema9,
      ema20: ind10.ema20,
      candleTimestamp: ind10.candleTimestamp,
    });

    expect(alert1.title).toContain("BUY PUT ALERT");
    expect(alert1.title).toContain("NIFTY 50");
    expect(alert1.body).toContain("PUT");
    expect(alert1.data.url).toBe("/signals");

    // 5. State 1 (PUT Active): Reversal check
    // Candle 11 surges above VWAP
    const result2 = evaluateOptionBuyerStrategy(indicators[11], ind10, STATE_PUT_ACTIVE);

    expect(result2.signalType).not.toBeNull();
    expect(["BUY CALL", "EXIT PUT"]).toContain(result2.signalType);

    // 6. Idempotency Check: Same candle evaluated again in same state produces no new signal
    const idempotentRun = evaluateOptionBuyerStrategy(ind10, indicators[9], result1.newState);

    expect(idempotentRun.signalType).toBeNull();
    expect(idempotentRun.newState).toBe(result1.newState);
  });
});
