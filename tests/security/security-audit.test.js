import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { validateCandle, filterAndSortValidCandles } from "@/lib/market/candle-validation";
import fs from "fs";
import path from "path";

describe("Milestone 9: Security Audit & Verification", () => {
  describe("AES-256-GCM Sensitive Token Encryption", () => {
    it("should encrypt and decrypt broker access tokens cleanly", () => {
      const sensitiveToken = "kite_access_token_demo_9876543210_secret";
      const encrypted = encrypt(sensitiveToken);

      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(":");
      expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(sensitiveToken);
    });

    it("should generate distinct IVs and ciphertexts for identical inputs", () => {
      const text = "constant_secret_string";
      const enc1 = encrypt(text);
      const enc2 = encrypt(text);

      expect(enc1).not.toBe(enc2);
      expect(decrypt(enc1)).toBe(text);
      expect(decrypt(enc2)).toBe(text);
    });

    it("should fail decryption when ciphertext or auth tag is tampered", () => {
      const text = "tamper_test_data";
      const encrypted = encrypt(text);
      const parts = encrypted.split(":");
      // Modify authTag
      const tamperedTag = "ff" + parts[1].slice(2);
      const tamperedEnc = `${parts[0]}:${tamperedTag}:${parts[2]}`;

      expect(() => decrypt(tamperedEnc)).toThrow();
    });
  });

  describe("Password Hashing & Verification (Bcrypt)", () => {
    it("should hash passwords securely and verify successfully", async () => {
      const password = "StrongAdminPassword#2026!";
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("WrongPassword", hash)).toBe(false);
    });

    it("should handle null or empty passwords safely", async () => {
      expect(await verifyPassword("", "$2a$12$somehash")).toBe(false);
      expect(await verifyPassword(null, "$2a$12$somehash")).toBe(false);
    });
  });

  describe("Session HMAC-SHA256 Token Authentication", () => {
    it("should create and verify signed session tokens", async () => {
      const payload = { id: "user_123", email: "admin@trading.local", role: "admin" };
      const token = await createSessionToken(payload);

      expect(token).toBeDefined();
      const verified = await verifySessionToken(token);

      expect(verified).not.toBeNull();
      expect(verified.email).toBe("admin@trading.local");
      expect(verified.role).toBe("admin");
    });

    it("should reject tampered session tokens", async () => {
      const payload = { id: "user_123", email: "admin@trading.local", role: "admin" };
      const token = await createSessionToken(payload);
      const parts = token.split(".");
      const tamperedToken = `${parts[0]}.tamperedPayload.${parts[2]}`;

      const verified = await verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });
  });

  describe("Financial OHLCV Candle Data Invariant Validation", () => {
    it("should accept valid completed candles conforming to market invariants", () => {
      const validCandle = {
        tradingSymbol: "NIFTY 50",
        candleTimestamp: new Date("2026-11-13T09:15:00.000Z"),
        open: 24000,
        high: 24050,
        low: 23980,
        close: 24020,
        volume: 150000,
      };

      const result = validateCandle(validCandle);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject inverted candles where high < open or high < close", () => {
      const invalidCandle = {
        tradingSymbol: "NIFTY 50",
        candleTimestamp: new Date("2026-11-13T09:15:00.000Z"),
        open: 24100,
        high: 24050, // High is lower than open
        low: 23980,
        close: 24020,
        volume: 150000,
      };

      const result = validateCandle(invalidCandle);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("High"))).toBe(true);
    });

    it("should reject negative volume candles", () => {
      const invalidCandle = {
        tradingSymbol: "NIFTY 50",
        candleTimestamp: new Date("2026-11-13T09:15:00.000Z"),
        open: 24000,
        high: 24050,
        low: 23980,
        close: 24020,
        volume: -500, // Invalid negative volume
      };

      const result = validateCandle(invalidCandle);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("volume"))).toBe(true);
    });

    it("should filter out invalid candles from array", () => {
      const candles = [
        { tradingSymbol: "NIFTY 50", candleTimestamp: new Date("2026-11-13T09:15:00.000Z"), open: 24000, high: 24050, low: 23980, close: 24020, volume: 100 },
        { tradingSymbol: "NIFTY 50", candleTimestamp: new Date("2026-11-13T09:20:00.000Z"), open: 24000, high: 23900, low: 23980, close: 24020, volume: 100 }, // Invalid: high < low
      ];
      const valid = filterAndSortValidCandles(candles);
      expect(valid).toHaveLength(1);
      expect(valid[0].open).toBe(24000);
    });
  });

  describe("Zero Order Execution Safety Guard", () => {
    it("should confirm no order placement, execution, or broker trade APIs exist", () => {
      const forbiddenKeywords = [
        "placeOrder",
        "place_order",
        "modifyOrder",
        "cancelOrder",
        "order_id",
        "orderMargin",
      ];

      // Recursively scan lib and app directories
      const rootDirs = [
        path.join(process.cwd(), "lib"),
        path.join(process.cwd(), "app", "api"),
      ];

      function scanDir(dir) {
        let files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files = files.concat(scanDir(fullPath));
          } else if (entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) {
            files.push(fullPath);
          }
        }
        return files;
      }

      const allFiles = rootDirs.flatMap(scanDir);
      expect(allFiles.length).toBeGreaterThan(15);

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        for (const keyword of forbiddenKeywords) {
          const regex = new RegExp(`\\b${keyword}\\s*\\(`, "g");
          expect(
            regex.test(content),
            `Violation: forbidden order execution call '${keyword}()' found in ${filePath}`
          ).toBe(false);
        }
      }
    });
  });
});
