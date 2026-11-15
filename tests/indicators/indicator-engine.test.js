import { describe, it, expect } from "vitest";
import {
  evaluateDirectionalBias,
  getLatestIndicatorSnapshot,
  calculateIndicatorSeries,
} from "../../lib/indicators/indicator-engine";

describe("Indicator Engine & Directional Bias", () => {
  it("should evaluate BUY when Close > VWAP && EMA9 > EMA20 && Close > EMA9", () => {
    // Close = 25200, VWAP = 25100, EMA9 = 25150, EMA20 = 25050
    // 25200 > 25100 (true), 25150 > 25050 (true), 25200 > 25150 (true)
    const result = evaluateDirectionalBias(25200, 25100, 25150, 25050);
    expect(result.direction).toBe("BUY");
    expect(result.conditions.closeAboveVWAP).toBe(true);
    expect(result.conditions.ema9AboveEMA20).toBe(true);
    expect(result.conditions.closeAboveEMA9).toBe(true);
  });

  it("should evaluate SELL when Close < VWAP && EMA9 < EMA20 && Close < EMA9", () => {
    // Close = 24900, VWAP = 25100, EMA9 = 24950, EMA20 = 25050
    // 24900 < 25100 (true), 24950 < 25050 (true), 24900 < 24950 (true)
    const result = evaluateDirectionalBias(24900, 25100, 24950, 25050);
    expect(result.direction).toBe("SELL");
    expect(result.conditions.closeBelowVWAP).toBe(true);
    expect(result.conditions.ema9BelowEMA20).toBe(true);
    expect(result.conditions.closeBelowEMA9).toBe(true);
  });

  it("should evaluate NEUTRAL when any single condition is not met", () => {
    // Close > VWAP and EMA9 > EMA20, BUT Close <= EMA9 (pullback)
    const pullback = evaluateDirectionalBias(25140, 25100, 25150, 25050);
    expect(pullback.direction).toBe("NEUTRAL");

    // Close > VWAP, but EMA9 < EMA20 (trend mismatch)
    const trendMismatch = evaluateDirectionalBias(25200, 25100, 25000, 25050);
    expect(trendMismatch.direction).toBe("NEUTRAL");
  });

  it("should return NEUTRAL if indicators are null / not yet warmed up", () => {
    const notWarmedUp = evaluateDirectionalBias(25000, 24900, null, null);
    expect(notWarmedUp.direction).toBe("NEUTRAL");
  });

  it("should process a series of 25 candles and confirm warm-up completion", () => {
    const candles = [];
    const baseTime = new Date("2026-11-13T03:45:00.000Z").getTime();

    for (let i = 0; i < 25; i++) {
      candles.push({
        instrumentToken: 256265,
        tradingSymbol: "NIFTY 50",
        timeframe: "5minute",
        candleTimestamp: new Date(baseTime + i * 5 * 60 * 1000),
        open: 25000 + i * 10,
        high: 25020 + i * 10,
        low: 24990 + i * 10,
        close: 25010 + i * 10,
        volume: 50000,
      });
    }

    const series = calculateIndicatorSeries(candles);
    expect(series.length).toBe(25);
    expect(series[18].isWarmedUp).toBe(false); // 19th bar not yet warmed up for EMA 20
    expect(series[19].isWarmedUp).toBe(true);  // 20th bar has EMA 20 computed!

    const snapshot = getLatestIndicatorSnapshot(candles);
    expect(snapshot.isWarmedUp).toBe(true);
    expect(snapshot.vwap).toBeGreaterThan(0);
    expect(snapshot.ema9).toBeGreaterThan(0);
    expect(snapshot.ema20).toBeGreaterThan(0);
    // In an uptrend (close increasing by 10 each bar), expect BUY bias
    expect(snapshot.direction).toBe("BUY");
  });
});

