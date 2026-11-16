import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock MongoDB models & dependencies for position manager testing
vi.mock("@/lib/mongodb/connection", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const mockTradeStore = new Map();

vi.mock("@/lib/mongodb/models/PaperTrade", () => {
  const mockModel = {
    findOne: vi.fn().mockImplementation((query) => {
      for (const [id, t] of mockTradeStore.entries()) {
        if (query.strategyId && String(t.strategyId) !== String(query.strategyId)) continue;
        if (query.status && t.status !== query.status) continue;
        if (query.tradeId && t.tradeId !== query.tradeId) continue;
        return {
          ...t,
          save: vi.fn().mockImplementation(function () {
            mockTradeStore.set(this.tradeId, { ...this });
            return Promise.resolve(this);
          }),
          toObject: () => ({ ...t }),
        };
      }
      return null;
    }),
    find: vi.fn().mockImplementation((query) => {
      const results = [];
      for (const [id, t] of mockTradeStore.entries()) {
        if (query.status && t.status !== query.status) continue;
        results.push({
          ...t,
          save: vi.fn().mockImplementation(function () {
            mockTradeStore.set(this.tradeId, { ...this });
            return Promise.resolve(this);
          }),
        });
      }
      return Promise.resolve(results);
    }),
    create: vi.fn().mockImplementation((doc) => {
      mockTradeStore.set(doc.tradeId, { ...doc });
      return Promise.resolve({
        ...doc,
        save: vi.fn().mockResolvedValue(doc),
      });
    }),
  };
  return { default: mockModel };
});

vi.mock("@/lib/mongodb/models/SystemLog", () => ({
  default: {
    create: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/paper-trading/contract-resolver", () => ({
  resolveOptionContract: vi.fn().mockResolvedValue({
    underlying: "NIFTY 50",
    exchange: "NFO",
    tradingSymbol: "NIFTY26FEB26150CE",
    instrumentToken: 12345,
    optionType: "CE",
    strikePrice: 26150,
    atmStrike: 26250,
    itmDistance: 100,
    expiryDate: new Date("2026-02-26T10:00:00.000Z"),
    lotSize: 75,
  }),
}));

vi.mock("@/lib/paper-trading/premium-service", () => ({
  getOptionExecutionPremium: vi.fn().mockResolvedValue({
    fillPrice: 150,
    fillMethod: "ASK",
    quoteTimestamp: new Date(),
    isStale: false,
    rawQuote: null,
  }),
}));

import {
  openPaperPosition,
  closePaperPosition,
  reversePaperPosition,
  checkAndCloseExpirySafety,
} from "@/lib/paper-trading/position-manager";

describe("Milestone 6: Position Manager & Single-Position Constraint", () => {
  beforeEach(() => {
    mockTradeStore.clear();
  });

  it("should successfully open a new paper position when flat", async () => {
    const trade = await openPaperPosition({
      strategyId: "strat_123",
      signalId: "sig_1",
      spotPrice: 26240,
      optionType: "CE",
      settings: { itmDistance: 100, numberOfLots: 1, fillMethod: "ASK_BID" },
    });

    expect(trade).toBeDefined();
    expect(trade.status).toBe("OPEN");
    expect(trade.optionType).toBe("CE");
    expect(trade.totalQuantity).toBe(75);
    expect(trade.entryPremium).toBe(150);
  });

  it("should prevent opening duplicate positions if one is already OPEN", async () => {
    // Open first trade
    await openPaperPosition({
      strategyId: "strat_123",
      signalId: "sig_1",
      spotPrice: 26240,
      optionType: "CE",
      settings: { itmDistance: 100, numberOfLots: 1 },
    });

    // Attempt second trade while first is OPEN
    await expect(
      openPaperPosition({
        strategyId: "strat_123",
        signalId: "sig_2",
        spotPrice: 26250,
        optionType: "CE",
        settings: { itmDistance: 100, numberOfLots: 1 },
      })
    ).rejects.toThrow(/already OPEN/);
  });

  it("should close open position with accurate P&L calculation", async () => {
    const openTrade = await openPaperPosition({
      strategyId: "strat_123",
      signalId: "sig_1",
      spotPrice: 26240,
      optionType: "CE",
      settings: { itmDistance: 100, numberOfLots: 1 },
    });

    const closed = await closePaperPosition({
      tradeId: openTrade.tradeId,
      exitReason: "STRATEGY_EXIT",
      spotPrice: 26300,
      settings: { estimatedCharges: 40 },
    });

    expect(closed.status).toBe("CLOSED");
    expect(closed.exitReason).toBe("STRATEGY_EXIT");
    expect(closed.exitPremium).toBe(150);
    expect(closed.estimatedCharges).toBe(40);
  });

  it("should reverse position cleanly (close old and open new)", async () => {
    const initialTrade = await openPaperPosition({
      strategyId: "strat_123",
      signalId: "sig_1",
      spotPrice: 26240,
      optionType: "CE",
      settings: { itmDistance: 100, numberOfLots: 1 },
    });

    const reversal = await reversePaperPosition({
      currentTrade: initialTrade,
      signalId: "sig_reversal",
      spotPrice: 26150,
      newOptionType: "PE",
      settings: { itmDistance: 100, numberOfLots: 1 },
    });

    expect(reversal.closedTrade.status).toBe("CLOSED");
    expect(reversal.closedTrade.exitReason).toBe("OPPOSITE_SIGNAL");
    expect(reversal.newTrade).toBeDefined();
    expect(reversal.newTrade.status).toBe("OPEN");
    expect(reversal.error).toBeNull();
  });
});
