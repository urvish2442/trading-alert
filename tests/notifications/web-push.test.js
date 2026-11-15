import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatSignalNotificationPayload, configureVapid } from "../../lib/notifications/web-push";

describe("Web Push Notification Engine", () => {
  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@trading.local";
  });

  describe("formatSignalNotificationPayload", () => {
    it("formats BUY CALL notification payload according to Section 11 specifications", () => {
      const signal = {
        _id: "6af9a4e6a33b7a844bba7401",
        signalType: "BUY CALL",
        candleClose: 25150.5,
        vwap: 25100.25,
        ema9: 25120.8,
        candleTimestamp: new Date("2026-11-13T04:00:00.000Z"),
      };

      const payload = formatSignalNotificationPayload(signal);

      expect(payload.title).toBe("BUY CALL ALERT - NIFTY 50");
      expect(payload.body).toContain("Direction: BUY CALL");
      expect(payload.body).toContain("Close: ₹25,150.5");
      expect(payload.body).toContain("VWAP: ₹25100.25");
      expect(payload.body).toContain("EMA 9: ₹25120.8");
      expect(payload.body).toContain("Bullish Crossover above VWAP");
      expect(payload.tag).toBe(`signal-${signal._id}`);
      expect(payload.url).toBe("/signals");
      expect(payload.icon).toBe("/icons/icon-192.png");
    });

    it("formats BUY PUT notification payload with bearish action text", () => {
      const signal = {
        _id: "6af9a4e6a33b7a844bba7402",
        signalType: "BUY PUT",
        candleClose: 24980.0,
        vwap: 25050.0,
        ema9: 25010.0,
        candleTimestamp: new Date("2026-11-13T05:30:00.000Z"),
      };

      const payload = formatSignalNotificationPayload(signal);

      expect(payload.title).toBe("BUY PUT ALERT - NIFTY 50");
      expect(payload.body).toContain("Direction: BUY PUT");
      expect(payload.body).toContain("Bearish Crossunder below VWAP");
      expect(payload.body).toContain("State transitioned to PUT ACTIVE");
    });

    it("formats EXIT CALL notification payload with trailing stop text", () => {
      const signal = {
        _id: "6af9a4e6a33b7a844bba7403",
        signalType: "EXIT CALL",
        candleClose: 25120.0,
        vwap: 25080.0,
        ema9: 25130.0,
        candleTimestamp: new Date("2026-11-13T06:45:00.000Z"),
      };

      const payload = formatSignalNotificationPayload(signal);

      expect(payload.title).toBe("EXIT CALL ALERT - NIFTY 50");
      expect(payload.body).toContain("Price crossed below EMA 9 trailing stop");
      expect(payload.body).toContain("Exited to FLAT");
    });

    it("formats EXIT PUT notification payload with trailing stop text", () => {
      const signal = {
        _id: "6af9a4e6a33b7a844bba7404",
        signalType: "EXIT PUT",
        candleClose: 25020.0,
        vwap: 25060.0,
        ema9: 25010.0,
        candleTimestamp: new Date("2026-11-13T07:15:00.000Z"),
      };

      const payload = formatSignalNotificationPayload(signal);

      expect(payload.title).toBe("EXIT PUT ALERT - NIFTY 50");
      expect(payload.body).toContain("Price crossed above EMA 9 trailing stop");
      expect(payload.body).toContain("Exited to FLAT");
    });
  });

  describe("configureVapid", () => {
    it("throws an error when VAPID keys are missing", () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      expect(() => configureVapid()).toThrow("VAPID keys not configured");
    });
  });
});

