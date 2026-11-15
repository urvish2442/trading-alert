import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "../../app/api/cron/process-market/route";

describe("Protected Cron: /api/cron/process-market", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test_cron_secret_minimum_32_characters_12345";
  });

  describe("Authentication Guard (GEMINI.md Section 4)", () => {
    it("returns 401 Unauthorized when Authorization header is missing", async () => {
      const req = new Request("http://localhost:3000/api/cron/process-market", {
        method: "POST",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("returns 401 Unauthorized when an incorrect secret is passed", async () => {
      const req = new Request("http://localhost:3000/api/cron/process-market", {
        method: "POST",
        headers: { Authorization: "Bearer wrong_secret_key" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("accepts valid Authorization Bearer header", async () => {
      const req = new Request("http://localhost:3000/api/cron/process-market", {
        method: "POST",
        headers: { Authorization: "Bearer test_cron_secret_minimum_32_characters_12345" },
      });

      const res = await POST(req);
      // Not 401: Passes auth check (will skip if market closed or process if open)
      expect(res.status).not.toBe(401);
    });

    it("accepts valid query parameter ?secret=<CRON_SECRET>", async () => {
      const req = new Request(
        "http://localhost:3000/api/cron/process-market?secret=test_cron_secret_minimum_32_characters_12345",
        { method: "GET" }
      );

      const res = await GET(req);
      expect(res.status).not.toBe(401);
    });
  });

  describe("Market Hours & Calendar Skipping", () => {
    it("skips market processing on weekends or outside trading hours unless forced", async () => {
      const req = new Request("http://localhost:3000/api/cron/process-market", {
        method: "GET",
        headers: { Authorization: "Bearer test_cron_secret_minimum_32_characters_12345" },
      });

      const res = await GET(req);
      const data = await res.json();

      // Today is Sunday, so it must return 200 with status: skipped
      expect(res.status).toBe(200);
      expect(data.status).toBe("skipped");
      expect(data.reason).toBeDefined();
    });
  });
});

