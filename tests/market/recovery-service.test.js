import { describe, it, expect } from "vitest";
import { checkStaleData } from "../../lib/market/recovery-service";

describe("Recovery Service & Freshness Audit", () => {
  describe("checkStaleData", () => {
    it("returns isStale: false when candle is within maxAge threshold", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const candle = { candleTimestamp: fiveMinutesAgo };

      const res = checkStaleData(candle, 15);
      expect(res.isStale).toBe(false);
      expect(res.ageMinutes).toBeLessThanOrEqual(6);
    });

    it("returns isStale: true when candle age exceeds threshold", () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const candle = { candleTimestamp: thirtyMinutesAgo };

      const res = checkStaleData(candle, 15);
      expect(res.isStale).toBe(true);
      expect(res.ageMinutes).toBeGreaterThanOrEqual(29);
      expect(res.reason).toContain("exceeds 15m threshold");
    });

    it("handles null or missing candle timestamp safely", () => {
      const res = checkStaleData(null);
      expect(res.isStale).toBe(true);
      expect(res.ageMinutes).toBe(Infinity);
      expect(res.reason).toBe("No candle data found");
    });
  });
});

