import mongoose from "mongoose";

const IndicatorSchema = new mongoose.Schema(
  {
    instrumentToken: {
      type: Number,
      required: true,
      index: true,
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
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

IndicatorSchema.index(
  { instrumentToken: 1, timeframe: 1, candleTimestamp: 1 },
  { unique: true }
);

export default mongoose.models.Indicator || mongoose.model("Indicator", IndicatorSchema);

