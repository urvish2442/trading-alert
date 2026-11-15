import mongoose from "mongoose";

const CandleSchema = new mongoose.Schema(
  {
    instrumentToken: {
      type: Number,
      required: true,
      index: true,
    },
    tradingSymbol: {
      type: String,
      required: true,
    },
    timeframe: {
      type: String,
      default: "5minute",
      index: true,
    },
    candleTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    open: {
      type: Number,
      required: true,
    },
    high: {
      type: Number,
      required: true,
    },
    low: {
      type: Number,
      required: true,
    },
    close: {
      type: Number,
      required: true,
    },
    volume: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      default: "kite",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Idempotency: Unique compound index preventing duplicate candle insertion
CandleSchema.index(
  { instrumentToken: 1, timeframe: 1, candleTimestamp: 1 },
  { unique: true }
);

export default mongoose.models.Candle || mongoose.model("Candle", CandleSchema);

