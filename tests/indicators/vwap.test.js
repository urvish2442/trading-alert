import { describe, it, expect } from "vitest";
import {
  calculateTypicalPrice,
  calculateSessionVWAPSeries,
  getISTSessionKey,
} from "../../lib/indicators/vwap";

describe("Session VWAP Calculation Engine", () => {
  it("should calculate Typical Price = (High + Low + Close) / 3", () => {
    // 100 + 90 + 95 = 285 / 3 = 95
    expect(calculateTypicalPrice(100, 90, 95)).toBe(95);
  });

  it("should calculate accurate volume-weighted price within a single session", () => {
    const candles = [
      {
        candleTimestamp: "2026-11-13T03:45:00.000Z", // 09:15 IST
        high: 105,
        low: 95,
        close: 100, // TP = 100
        volume: 1000, // TP * Vol = 100,000, CumVol = 1,000 => VWAP = 100
      },
      {
        candleTimestamp: "2026-11-13T03:50:00.000Z", // 09:20 IST
        high: 115,
        low: 105,
        close: 110, // TP = 110
        volume: 3000, // TP * Vol = 330,000, TotalTP*Vol = 430,000, CumVol = 4,000 => VWAP = 107.5
      },
    ];

    const vwap = calculateSessionVWAPSeries(candles);
    expect(vwap[0]).toBe(100);
    expect(vwap[1]).toBe(107.5);
  });

  it("should automatically reset session VWAP at the start of a new IST day", () => {
    const candles = [
      // Day 1 (2026-11-12)
      {
        candleTimestamp: "2026-11-12T04:00:00.000Z",
        high: 200,
        low: 200,
        close: 200,
        volume: 10000,
      },
      // Day 2 (2026-11-13) - New session must reset cumulative sums
      {
        candleTimestamp: "2026-11-13T03:45:00.000Z",
        high: 100,
        low: 100,
        close: 100,
        volume: 1000,
      },
    ];

    const vwap = calculateSessionVWAPSeries(candles);
    expect(vwap[0]).toBe(200);
    // If it did NOT reset, VWAP would be (2,000,000 + 100,000) / 11,000 = 190.9
    // Because it resets, VWAP on day 2 bar 1 is exactly 100!
    expect(vwap[1]).toBe(100);
  });

  it("should handle zero cumulative volume safely by falling back to Typical Price", () => {
    const candles = [
      {
        candleTimestamp: "2026-11-13T03:45:00.000Z",
        high: 100,
        low: 90,
        close: 95, // TP = 95
        volume: 0,
      },
    ];

    const vwap = calculateSessionVWAPSeries(candles);
    expect(vwap[0]).toBe(95);
  });

  it("should produce correct IST session key", () => {
    // 03:45 UTC on 13th Nov = 09:15 IST on 13th Nov
    const key = getISTSessionKey("2026-11-13T03:45:00.000Z");
    expect(key).toBe("2026-11-13");
  });
});

