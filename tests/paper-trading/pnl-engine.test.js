import { describe, it, expect } from "vitest";
import {
  calculateTotalQuantity,
  calculateTradePnl,
} from "@/lib/paper-trading/pnl-engine";

describe("Milestone 6: P&L & Charges Calculation Engine", () => {
  describe("calculateTotalQuantity", () => {
    it("should calculate total quantity as lotSize * numberOfLots", () => {
      expect(calculateTotalQuantity(75, 1)).toBe(75);
      expect(calculateTotalQuantity(75, 2)).toBe(150);
      expect(calculateTotalQuantity(50, 4)).toBe(200);
      expect(calculateTotalQuantity(25, 3)).toBe(75);
    });

    it("should default to 1 lot if invalid number of lots passed", () => {
      expect(calculateTotalQuantity(75, 0)).toBe(75);
      expect(calculateTotalQuantity(75, -5)).toBe(75);
      expect(calculateTotalQuantity(75, null)).toBe(75);
    });
  });

  describe("calculateTradePnl", () => {
    it("should accurately calculate profitable trade P&L and return %", () => {
      // Bought 75 units @ ₹120, Current/Exit @ ₹160, charges ₹40
      const pnl = calculateTradePnl({
        entryPremium: 120,
        currentOrExitPremium: 160,
        totalQuantity: 75,
        estimatedCharges: 40,
      });

      // Gross: (160 - 120) * 75 = 40 * 75 = 3000
      // Net: 3000 - 40 = 2960
      // Return %: (40 / 120) * 100 = 33.33%
      expect(pnl.grossPnl).toBe(3000);
      expect(pnl.estimatedCharges).toBe(40);
      expect(pnl.netPnl).toBe(2960);
      expect(pnl.returnPercentage).toBe(33.33);
    });

    it("should accurately calculate losing trade P&L and return %", () => {
      // Bought 75 units @ ₹150, Exit @ ₹110, charges ₹40
      const pnl = calculateTradePnl({
        entryPremium: 150,
        currentOrExitPremium: 110,
        totalQuantity: 75,
        estimatedCharges: 40,
      });

      // Gross: (110 - 150) * 75 = -40 * 75 = -3000
      // Net: -3000 - 40 = -3040
      // Return %: (-40 / 150) * 100 = -26.67%
      expect(pnl.grossPnl).toBe(-3000);
      expect(pnl.estimatedCharges).toBe(40);
      expect(pnl.netPnl).toBe(-3040);
      expect(pnl.returnPercentage).toBe(-26.67);
    });

    it("should handle zero charges", () => {
      const pnl = calculateTradePnl({
        entryPremium: 100,
        currentOrExitPremium: 120,
        totalQuantity: 50,
        estimatedCharges: 0,
      });

      expect(pnl.grossPnl).toBe(1000);
      expect(pnl.estimatedCharges).toBe(0);
      expect(pnl.netPnl).toBe(1000);
      expect(pnl.returnPercentage).toBe(20.0);
    });

    it("should reject invalid premiums or zero quantity", () => {
      expect(() =>
        calculateTradePnl({
          entryPremium: 0,
          currentOrExitPremium: 100,
          totalQuantity: 75,
        })
      ).toThrow();

      expect(() =>
        calculateTradePnl({
          entryPremium: 100,
          currentOrExitPremium: 120,
          totalQuantity: 0,
        })
      ).toThrow();
    });
  });
});
