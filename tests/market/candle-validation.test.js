import { describe, it, expect } from "vitest";
import {
  normalizeTo5MinBoundary,
  is5MinAligned,
  isCandleCompleted,
  validateCandle,
  filterAndSortValidCandles,
} from "../../lib/market/candle-validation";

describe("Strict 5-Minute Candle Validation & Deduplication", () => {
  describe("normalizeTo5MinBoundary", () => {
    it("normalizes odd second timestamps to exact 5-minute start boundaries", () => {
      const input = new Date("2026-11-16T09:15:38.456Z");
      const normalized = normalizeTo5MinBoundary(input);

      expect(normalized.toISOString()).toBe("2026-11-16T09:15:00.000Z");
      expect(normalized.getUTCMinutes()).toBe(15);
      expect(normalized.getUTCSeconds()).toBe(0);
      expect(normalized.getUTCMilliseconds()).toBe(0);
    });

    it("normalizes mid-interval minutes to preceding 5-minute start boundary", () => {
      // 09:18:25 -> 09:15:00
      const input = new Date("2026-11-16T09:18:25.000Z");
      const normalized = normalizeTo5MinBoundary(input);

      expect(normalized.toISOString()).toBe("2026-11-16T09:15:00.000Z");
    });

    it("handles already aligned timestamps without shifting", () => {
      const input = new Date("2026-11-16T10:20:00.000Z");
      const normalized = normalizeTo5MinBoundary(input);

      expect(normalized.toISOString()).toBe("2026-11-16T10:20:00.000Z");
    });

    it("handles null and invalid dates safely", () => {
      expect(normalizeTo5MinBoundary(null)).toBeNull();
      expect(normalizeTo5MinBoundary("invalid-date")).toBeNull();
    });
  });

  describe("is5MinAligned", () => {
    it("returns true for strictly aligned 5-minute boundaries", () => {
      expect(is5MinAligned(new Date("2026-11-16T09:15:00.000Z"))).toBe(true);
      expect(is5MinAligned(new Date("2026-11-16T09:20:00.000Z"))).toBe(true);
      expect(is5MinAligned(new Date("2026-11-16T15:25:00.000Z"))).toBe(true);
      expect(is5MinAligned(new Date("2026-11-16T15:30:00.000Z"))).toBe(true);
    });

    it("returns false for timestamps with seconds or milliseconds", () => {
      expect(is5MinAligned(new Date("2026-11-16T09:15:38.000Z"))).toBe(false);
      expect(is5MinAligned(new Date("2026-11-16T09:20:00.500Z"))).toBe(false);
      expect(is5MinAligned(new Date("2026-11-16T09:17:00.000Z"))).toBe(false);
      expect(is5MinAligned(new Date("2026-11-16T12:31:19.000Z"))).toBe(false);
    });
  });

  describe("isCandleCompleted", () => {
    it("returns true when candle start time + 5m <= reference time", () => {
      const candleStart = new Date("2026-11-16T09:15:00.000Z");
      const exactlyCompleted = new Date("2026-11-16T09:20:00.000Z").getTime();
      const pastCompleted = new Date("2026-11-16T09:22:00.000Z").getTime();

      expect(isCandleCompleted(candleStart, exactlyCompleted)).toBe(true);
      expect(isCandleCompleted(candleStart, pastCompleted)).toBe(true);
    });

    it("returns false when candle is still forming (in-progress)", () => {
      const candleStart = new Date("2026-11-16T09:15:00.000Z");
      const midway = new Date("2026-11-16T09:17:30.000Z").getTime();
      const justStarted = new Date("2026-11-16T09:15:10.000Z").getTime();

      expect(isCandleCompleted(candleStart, midway)).toBe(false);
      expect(isCandleCompleted(candleStart, justStarted)).toBe(false);
    });
  });

  describe("validateCandle", () => {
    it("passes a valid completed 5-minute candle", () => {
      const candle = {
        instrumentToken: 256265,
        tradingSymbol: "NIFTY 50",
        timeframe: "5minute",
        candleTimestamp: new Date("2026-11-16T09:15:00.000Z"),
        open: 24100,
        high: 24150,
        low: 24080,
        close: 24120,
        volume: 350000,
      };

      const res = validateCandle(candle);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("rejects non-5minute timeframe", () => {
      const candle = {
        tradingSymbol: "NIFTY 50",
        timeframe: "15minute",
        candleTimestamp: new Date("2026-11-16T09:15:00.000Z"),
        open: 24100,
        high: 24150,
        low: 24080,
        close: 24120,
        volume: 350000,
      };

      const res = validateCandle(candle);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Invalid timeframe"))).toBe(true);
    });

    it("rejects non-5m-aligned timestamp with seconds", () => {
      const candle = {
        tradingSymbol: "NIFTY 50",
        timeframe: "5minute",
        candleTimestamp: new Date("2026-11-16T09:15:38.000Z"),
        open: 24100,
        high: 24150,
        low: 24080,
        close: 24120,
        volume: 350000,
      };

      const res = validateCandle(candle);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("strictly aligned to a 5-minute boundary"))).toBe(true);
    });

    it("rejects candles violating price invariants (e.g. High < Open or Low > Close)", () => {
      const invalidHigh = {
        tradingSymbol: "NIFTY 50",
        timeframe: "5minute",
        candleTimestamp: new Date("2026-11-16T09:15:00.000Z"),
        open: 24100,
        high: 24050, // High < Open
        low: 24000,
        close: 24020,
        volume: 10000,
      };

      const res = validateCandle(invalidHigh);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Invariant failed"))).toBe(true);
    });
  });

  describe("filterAndSortValidCandles & Deduplication", () => {
    it("deduplicates identical 5m timestamps and keeps the confirmed higher volume bar", () => {
      const rawCandles = [
        {
          tradingSymbol: "NIFTY 50",
          candleTimestamp: new Date("2026-11-16T09:15:38.000Z"), // Tick snapshot with proxy volume
          open: 24100,
          high: 24120,
          low: 24090,
          close: 24110,
          volume: 30000,
        },
        {
          tradingSymbol: "NIFTY 50",
          candleTimestamp: new Date("2026-11-16T09:15:00.000Z"), // Completed candle with true ETF volume
          open: 24100,
          high: 24125,
          low: 24090,
          close: 24115,
          volume: 450000,
        },
        {
          tradingSymbol: "NIFTY 50",
          candleTimestamp: new Date("2026-11-16T09:20:00.000Z"),
          open: 24115,
          high: 24140,
          low: 24110,
          close: 24130,
          volume: 200000,
        },
      ];

      // Reference time after 09:25:00 so both 09:15 and 09:20 are completed
      const now = new Date("2026-11-16T09:30:00.000Z").getTime();
      const valid = filterAndSortValidCandles(rawCandles, { now });

      expect(valid).toHaveLength(2); // Exactly 2 bars (09:15 and 09:20), duplicate eliminated!
      expect(valid[0].candleTimestamp.toISOString()).toBe("2026-11-16T09:15:00.000Z");
      expect(valid[0].volume).toBe(450000); // Retained higher volume completed bar
      expect(valid[1].candleTimestamp.toISOString()).toBe("2026-11-16T09:20:00.000Z");
    });

    it("filters out forming in-progress candles when filterIncomplete is true", () => {
      const now = new Date("2026-11-16T09:23:00.000Z").getTime();
      const rawCandles = [
        {
          tradingSymbol: "NIFTY 50",
          candleTimestamp: new Date("2026-11-16T09:15:00.000Z"), // Completed at 09:20
          open: 24100,
          high: 24120,
          low: 24090,
          close: 24110,
          volume: 300000,
        },
        {
          tradingSymbol: "NIFTY 50",
          candleTimestamp: new Date("2026-11-16T09:20:00.000Z"), // Forming candle, closes at 09:25 (after 09:23)
          open: 24110,
          high: 24130,
          low: 24105,
          close: 24125,
          volume: 50000,
        },
      ];

      const valid = filterAndSortValidCandles(rawCandles, { now, filterIncomplete: true });
      expect(valid).toHaveLength(1);
      expect(valid[0].candleTimestamp.toISOString()).toBe("2026-11-16T09:15:00.000Z");
    });
  });
});
