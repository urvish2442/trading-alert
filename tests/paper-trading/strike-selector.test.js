import { describe, it, expect } from "vitest";
import {
  calculateAtmStrike,
  selectItmStrike,
} from "@/lib/paper-trading/strike-selector";

describe("Milestone 6: Strike Selector Engine", () => {
  describe("calculateAtmStrike", () => {
    it("should round spot price to nearest 50-point ATM strike", () => {
      expect(calculateAtmStrike(26240, 50)).toBe(26250);
      expect(calculateAtmStrike(26225, 50)).toBe(26250);
      expect(calculateAtmStrike(26224, 50)).toBe(26200);
      expect(calculateAtmStrike(24110, 50)).toBe(24100);
      expect(calculateAtmStrike(25000, 50)).toBe(25000);
    });

    it("should support custom strike intervals", () => {
      expect(calculateAtmStrike(26240, 100)).toBe(26200);
      expect(calculateAtmStrike(26260, 100)).toBe(26300);
      expect(calculateAtmStrike(26210, 25)).toBe(26200);
    });

    it("should throw error for invalid spot price or interval", () => {
      expect(() => calculateAtmStrike(-100)).toThrow();
      expect(() => calculateAtmStrike(NaN)).toThrow();
      expect(() => calculateAtmStrike(25000, 0)).toThrow();
    });
  });

  describe("selectItmStrike", () => {
    it("should select 100 points below ATM for CE (Call Option)", () => {
      // Spot: 26240 -> ATM: 26250 -> 100 ITM CE = 26150 CE
      const result = selectItmStrike({
        spotPrice: 26240,
        optionType: "CE",
        itmDistance: 100,
        strikeInterval: 50,
      });

      expect(result.atmStrike).toBe(26250);
      expect(result.selectedStrike).toBe(26150);
      expect(result.optionType).toBe("CE");
      expect(result.itmDistance).toBe(100);
    });

    it("should select 100 points above ATM for PE (Put Option)", () => {
      // Spot: 26240 -> ATM: 26250 -> 100 ITM PE = 26350 PE
      const result = selectItmStrike({
        spotPrice: 26240,
        optionType: "PE",
        itmDistance: 100,
        strikeInterval: 50,
      });

      expect(result.atmStrike).toBe(26250);
      expect(result.selectedStrike).toBe(26350);
      expect(result.optionType).toBe("PE");
      expect(result.itmDistance).toBe(100);
    });

    it("should support configurable ITM distance (e.g. 50 or 150 points)", () => {
      const ce50 = selectItmStrike({
        spotPrice: 25000,
        optionType: "CE",
        itmDistance: 50,
      });
      expect(ce50.selectedStrike).toBe(24950);

      const pe150 = selectItmStrike({
        spotPrice: 25000,
        optionType: "PE",
        itmDistance: 150,
      });
      expect(pe150.selectedStrike).toBe(25150);
    });

    it("should reject invalid option type", () => {
      expect(() =>
        selectItmStrike({
          spotPrice: 25000,
          optionType: "FUT",
        })
      ).toThrow(/Invalid option type/);
    });
  });
});

