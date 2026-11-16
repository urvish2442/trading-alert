import { describe, it, expect, vi } from "vitest";
import {
  generateNiftyOptionSymbol,
  resolveOptionContract,
} from "@/lib/paper-trading/contract-resolver";

vi.mock("@/lib/mongodb/connection", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/mongodb/models/Instrument", () => ({
  default: {
    distinct: vi.fn().mockResolvedValue(["2026-02-19T00:00:00.000Z", "2026-02-26T00:00:00.000Z"]),
    findOne: vi.fn().mockImplementation((query) => ({
      lean: vi.fn().mockResolvedValue({
        instrumentToken: 123456,
        tradingSymbol: `NIFTY26FEB${query.strikePrice}${query.instrumentType}`,
        exchange: "NFO",
        lotSize: 75,
      }),
    })),
  },
}));

describe("Milestone 6: Contract Resolver", () => {
  it("should generate standard NSE option symbol format", () => {
    const symbol = generateNiftyOptionSymbol({
      expiryDate: new Date("2026-02-26T10:00:00.000Z"),
      strikePrice: 26150,
      optionType: "CE",
    });

    expect(symbol).toBe("NIFTY26FEB26150CE");
  });

  it("should resolve contract parameters cleanly", async () => {
    const contract = await resolveOptionContract({
      spotPrice: 26240,
      optionType: "CE",
      itmDistance: 100,
      strikeInterval: 50,
      referenceDate: new Date("2026-02-17T10:00:00.000Z"),
    });

    expect(contract.underlying).toBe("NIFTY 50");
    expect(contract.optionType).toBe("CE");
    expect(contract.strikePrice).toBe(26150);
    expect(contract.atmStrike).toBe(26250);
    expect(contract.lotSize).toBe(75);
    expect(contract.tradingSymbol).toBe("NIFTY26FEB26150CE");
  });

  it("should resolve PE contract with strike above ATM", async () => {
    const contract = await resolveOptionContract({
      spotPrice: 26240,
      optionType: "PE",
      itmDistance: 100,
      strikeInterval: 50,
      referenceDate: new Date("2026-02-17T10:00:00.000Z"),
    });

    expect(contract.optionType).toBe("PE");
    expect(contract.strikePrice).toBe(26350);
    expect(contract.tradingSymbol).toBe("NIFTY26FEB26350PE");
  });
});
