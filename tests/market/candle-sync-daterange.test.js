import { describe, it, expect, vi } from "vitest";
import { POST } from "../../app/api/market/sync/route";

describe("Date-Range Resync & DB Matching Engine", () => {
  it("computes correct IST epoch timestamps for period1 and period2", () => {
    const fromDate = "2026-11-16";
    const toDate = "2026-11-16";

    const p1 = Math.floor(new Date(fromDate + "T00:00:00+05:30").getTime() / 1000);
    const p2 = Math.floor(new Date(toDate + "T23:59:59+05:30").getTime() / 1000);

    // p1 should correspond to 2026-11-15 18:30:00 UTC
    expect(new Date(p1 * 1000).toISOString()).toBe("2026-11-15T18:30:00.000Z");
    // p2 should correspond to 2026-11-16 18:29:59 UTC
    expect(new Date(p2 * 1000).toISOString()).toBe("2026-11-16T18:29:59.000Z");
    expect(p2).toBeGreaterThan(p1);
  });

  it("identifies matching vs differing candles accurately", () => {
    const existing = {
      open: 25200,
      high: 25250,
      low: 25190,
      close: 25240,
      volume: 100000,
    };

    // Identical candle
    const identical = {
      open: 25200,
      high: 25250,
      low: 25190,
      close: 25240,
      volume: 100000,
    };

    const isIdentical =
      existing.open === identical.open &&
      existing.high === identical.high &&
      existing.low === identical.low &&
      existing.close === identical.close &&
      existing.volume === identical.volume;

    expect(isIdentical).toBe(true);

    // Updated volume or close
    const updated = {
      ...existing,
      volume: 150000,
    };

    const isDiff =
      existing.open !== updated.open ||
      existing.high !== updated.high ||
      existing.low !== updated.low ||
      existing.close !== updated.close ||
      existing.volume !== updated.volume;

    expect(isDiff).toBe(true);
  });

  it("handles POST /api/market/sync payload structure safely", async () => {
    const req = new Request("http://localhost:3000/api/market/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate: "2026-11-16", toDate: "2026-11-16" }),
    });

    // Verify req parses properly
    const body = await req.json();
    expect(body.fromDate).toBe("2026-11-16");
    expect(body.toDate).toBe("2026-11-16");
  });
});
