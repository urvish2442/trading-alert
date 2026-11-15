import mongoose from "mongoose";

const StrategyStateSchema = new mongoose.Schema(
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
    tradeState: {
      type: Number,
      enum: [0, 1, 2], // 0 = FLAT, 1 = PUT ACTIVE, 2 = CALL ACTIVE
      default: 0,
    },
    lastSignalType: {
      type: String,
      default: null,
    },
    lastProcessedCandle: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

StrategyStateSchema.index(
  { strategyId: 1, instrumentToken: 1 },
  { unique: true }
);

export default mongoose.models.StrategyState || mongoose.model("StrategyState", StrategyStateSchema);
