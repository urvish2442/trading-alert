import { describe, it, expect } from "vitest";
import { calculateEMA9, calculateEMA20, calculateEMASeries, calculateNextEMA } from "../../lib/indicators/ema";

describe("Exponential Moving Average (EMA) Engine", () => {
  it("should return empty array for empty inputs", () => {
    expect(calculateEMASeries([], 9)).toEqual([]);
    expect(calculateEMASeries(null, 9)).toEqual([]);
  });

  it("should return nulls during warm-up periods", () => {
    const prices = [10, 11, 12, 13, 14];
    const ema9 = calculateEMA9(prices);
    expect(ema9.length).toBe(5);
    expect(ema9.every((v) => v === null)).toBe(true);
  });

  it("should calculate exact SMA as initial seed for period 9", () => {
    // 9 consecutive values: 10, 20, 30, 40, 50, 60, 70, 80, 90
    // Sum = 450, SMA = 450 / 9 = 50
    const prices = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const ema9 = calculateEMA9(prices);

    expect(ema9.length).toBe(9);
    expect(ema9[7]).toBe(null);
    expect(ema9[8]).toBe(50);
  });

  it("should apply alpha = 2 / (period + 1) for subsequent bars", () => {
    // Period 9: alpha = 2 / (9 + 1) = 0.2
    // Seed at bar 8 is 50.
    // Bar 9 price = 100
    // Expected next EMA = (100 * 0.2) + (50 * 0.8) = 20 + 40 = 60
    const prices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const ema9 = calculateEMA9(prices);

    expect(ema9[8]).toBe(50);
    expect(ema9[9]).toBe(60);
  });

  it("should correctly compute calculateNextEMA helper", () => {
    const next = calculateNextEMA(100, 9, 50);
    expect(next).toBe(60);
  });

  it("should calculate EMA 20 with alpha = 2 / 21", () => {
    // 20 bars of price 100
    const prices = new Array(20).fill(100);
    const ema20 = calculateEMA20(prices);

    expect(ema20[19]).toBe(100);

    // 21st bar price 121
    prices.push(121);
    const updated = calculateEMA20(prices);
    // alpha = 2/21. (121 * 2/21) + (100 * 19/21) = (242 + 1900) / 21 = 2142 / 21 = 102
    expect(updated[20]).toBe(102);
  });

  it("should handle candle objects with { close } properties", () => {
    const candles = [
      { close: 10 }, { close: 20 }, { close: 30 },
      { close: 40 }, { close: 50 }, { close: 60 },
      { close: 70 }, { close: 80 }, { close: 90 },
      { close: 100 },
    ];
    const ema9 = calculateEMA9(candles);
    expect(ema9[8]).toBe(50);
    expect(ema9[9]).toBe(60);
  });
});

