import mongoose from "mongoose";

const StrategySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "NIFTY Option Buyer - VWAP EMA9 Both Trends",
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    timeframe: {
      type: String,
      default: "5minute",
    },
    emaFastPeriod: {
      type: Number,
      default: 9,
    },
    emaSlowPeriod: {
      type: Number,
      default: null,
    },
    calculationInstrument: {
      type: String,
      enum: ["FUTURES", "SPOT"],
      default: "FUTURES",
    },
    rules: {
      type: Object,
      default: {
        type: "PineScript v6 Option Buyer",
        indicators: ["EMA 9", "Session VWAP"],
        states: ["0: FLAT", "1: PUT ACTIVE", "2: CALL ACTIVE"],
        entries: [
          "State 0 + vwapDown -> BUY PUT (State 1)",
          "State 0 + vwapUp -> BUY CALL (State 2)",
        ],
        reversals: [
          "State 1 + vwapUp and not emaUp -> BUY CALL (State 2)",
          "State 2 + vwapDown and not emaDown -> BUY PUT (State 1)",
        ],
        exits: [
          "State 1 + emaUp -> EXIT PUT (State 0)",
          "State 2 + emaDown -> EXIT CALL (State 0)",
        ],
      },
    },
    version: {
      type: String,
      default: "2.0.0",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Strategy || mongoose.model("Strategy", StrategySchema);

