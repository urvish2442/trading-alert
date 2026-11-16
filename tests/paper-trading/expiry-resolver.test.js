import { describe, it, expect } from "vitest";
import {
  resolveCurrentWeeklyExpiry,
  isExpirySafetyCutoffReached,
  getIstDateString,
  getIstTime,
} from "@/lib/paper-trading/expiry-resolver";

describe("Milestone 6: Expiry Date Resolver", () => {
  describe("resolveCurrentWeeklyExpiry", () => {
    it("should resolve the earliest active expiry date >= today", () => {
      const refDate = new Date("2026-02-17T10:00:00.000Z");
      const availableExpiries = [
        "2026-02-12T00:00:00.000Z", // Past
        "2026-03-05T00:00:00.000Z", // Future week 2
        "2026-02-19T00:00:00.000Z", // Nearest current week
        "2026-02-26T00:00:00.000Z", // Future week 1
      ];

      const resolved = resolveCurrentWeeklyExpiry(availableExpiries, refDate);
      expect(resolved).not.toBeNull();
      expect(getIstDateString(resolved)).toBe("2026-02-19");
    });

    it("should return null if all available expiries are in the past", () => {
      const refDate = new Date("2026-03-01T10:00:00.000Z");
      const pastExpiries = [
        "2026-02-12T00:00:00.000Z",
        "2026-02-19T00:00:00.000Z",
        "2026-02-26T00:00:00.000Z",
      ];

      const resolved = resolveCurrentWeeklyExpiry(pastExpiries, refDate);
      expect(resolved).toBeNull();
    });

    it("should return null for empty or non-array inputs", () => {
      expect(resolveCurrentWeeklyExpiry([])).toBeNull();
      expect(resolveCurrentWeeklyExpiry(null)).toBeNull();
    });
  });

  describe("isExpirySafetyCutoffReached", () => {
    it("should return true if current date is past the expiry date", () => {
      const expiry = "2026-02-19T10:00:00.000Z";
      const now = new Date("2026-02-20T10:00:00.000Z");
      expect(isExpirySafetyCutoffReached(expiry, now, "15:15")).toBe(true);
    });

    it("should return false if today is before the expiry day", () => {
      const expiry = "2026-02-19T10:00:00.000Z";
      const now = new Date("2026-02-18T15:20:00.000Z");
      expect(isExpirySafetyCutoffReached(expiry, now, "15:15")).toBe(false);
    });

    it("should return true on expiry day when current time >= 15:15 IST", () => {
      // 15:15 IST is 09:45 UTC
      const expiry = "2026-02-19T10:00:00.000Z";
      const exactlyCutoff = new Date("2026-02-19T09:45:00.000Z"); // 15:15 IST
      expect(isExpirySafetyCutoffReached(expiry, exactlyCutoff, "15:15")).toBe(true);

      const pastCutoff = new Date("2026-02-19T10:00:00.000Z"); // 15:30 IST
      expect(isExpirySafetyCutoffReached(expiry, pastCutoff, "15:15")).toBe(true);
    });

    it("should return false on expiry day when current time < 15:15 IST", () => {
      // 11:30 IST is 06:00 UTC
      const expiry = "2026-02-19T10:00:00.000Z";
      const beforeCutoff = new Date("2026-02-19T06:00:00.000Z"); // 11:30 IST
      expect(isExpirySafetyCutoffReached(expiry, beforeCutoff, "15:15")).toBe(false);
    });
  });
});

