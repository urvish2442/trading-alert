import mongoose from "mongoose";

const SignalSchema = new mongoose.Schema(
  {
    strategyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Strategy",
      required: true,
      index: true,
    },
    instrumentToken: {
      type: Number,
      required: true,
      index: true,
    },
    tradingSymbol: {
      type: String,
      required: true,
    },
    signalType: {
      type: String,
      enum: ["BUY CALL", "BUY PUT", "EXIT CALL", "EXIT PUT"],
      required: true,
      index: true,
    },
    timeframe: {
      type: String,
      default: "5minute",
    },
    candleTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    candleClose: {
      type: Number,
      required: true,
    },
    vwap: {
      type: Number,
      required: true,
    },
    ema9: {
      type: Number,
      required: true,
    },
    ema20: {
      type: Number,
      default: null,
    },
    previousState: {
      type: Number,
      enum: [0, 1, 2], // 0 = FLAT, 1 = PUT, 2 = CALL
      default: 0,
    },
    newState: {
      type: Number,
      enum: [0, 1, 2],
      default: 0,
    },
    strategyVersion: {
      type: String,
      default: "2.0.0",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique index preventing duplicate signal creation for same candle
SignalSchema.index(
  { strategyId: 1, instrumentToken: 1, candleTimestamp: 1, signalType: 1 },
  { unique: true }
);

export default mongoose.models.Signal || mongoose.model("Signal", SignalSchema);
