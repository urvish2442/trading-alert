import { describe, it, expect } from "vitest";
import {
  isTradingDay,
  isMarketHours,
  getMarketSessionStatus,
  getISTTimeParts,
} from "../../lib/market/market-calendar";

describe("NSE Market Calendar & Session Logic", () => {
  describe("getISTTimeParts", () => {
    it("converts UTC time to exact Asia/Kolkata (UTC + 5:30)", () => {
      // 04:00 UTC = 09:30 IST
      const utcDate = new Date("2026-11-13T04:00:00.000Z");
      const ist = getISTTimeParts(utcDate);

      expect(ist.hour).toBe(9);
      expect(ist.minute).toBe(30);
      expect(ist.weekday).toBe("Fri");
    });
  });

  describe("isTradingDay", () => {
    it("returns false for weekends", () => {
      // Saturday
      const saturday = new Date("2026-11-14T06:00:00.000Z");
      expect(isTradingDay(saturday)).toBe(false);

      // Sunday
      const sunday = new Date("2026-11-15T06:00:00.000Z");
      expect(isTradingDay(sunday)).toBe(false);
    });

    it("returns false for official exchange holidays (e.g. Republic Day)", () => {
      // Republic Day: 2026-01-26
      const republicDay = new Date("2026-01-26T05:00:00.000Z");
      expect(isTradingDay(republicDay)).toBe(false);
    });

    it("returns true for regular trading weekdays", () => {
      // Friday Nov 13, 2026
      const tradingFriday = new Date("2026-11-13T05:00:00.000Z");
      expect(isTradingDay(tradingFriday)).toBe(true);
    });
  });

  describe("isMarketHours & Session Status", () => {
    it("returns MARKET OPEN during 09:15 to 15:30 IST on a trading day", () => {
      // 10:30 IST = 05:00 UTC on Friday
      const openTime = new Date("2026-11-13T05:00:00.000Z");
      expect(isMarketHours(openTime)).toBe(true);

      const status = getMarketSessionStatus(openTime);
      expect(status.state).toBe("MARKET OPEN");
      expect(status.isOpen).toBe(true);
    });

    it("returns PRE-MARKET before 09:15 IST", () => {
      // 08:45 IST = 03:15 UTC on Friday
      const preMarketTime = new Date("2026-11-13T03:15:00.000Z");
      expect(isMarketHours(preMarketTime)).toBe(false);

      const status = getMarketSessionStatus(preMarketTime);
      expect(status.state).toBe("PRE-MARKET");
      expect(status.isOpen).toBe(false);
    });

    it("returns MARKET CLOSED after 15:30 IST", () => {
      // 16:00 IST = 10:30 UTC on Friday
      const postMarketTime = new Date("2026-11-13T10:30:00.000Z");
      expect(isMarketHours(postMarketTime)).toBe(false);

      const status = getMarketSessionStatus(postMarketTime);
      expect(status.state).toBe("MARKET CLOSED");
      expect(status.isOpen).toBe(false);
    });

    it("returns MARKET CLOSED on weekends with appropriate reason", () => {
      const sunday = new Date("2026-11-15T08:00:00.000Z");
      const status = getMarketSessionStatus(sunday);
      expect(status.state).toBe("MARKET CLOSED");
      expect(status.isOpen).toBe(false);
      expect(status.reason).toContain("Weekend");
    });
  });
});

