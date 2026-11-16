import mongoose from "mongoose";

const PaperTradingSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    strategyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Strategy",
      required: true,
      unique: true,
    },
    underlying: {
      type: String,
      default: "NIFTY 50",
    },
    expirySelection: {
      type: String,
      default: "CURRENT_WEEK",
    },
    itmDistance: {
      type: Number,
      default: 100, // 100 points ITM
      min: 0,
      max: 1000,
    },
    numberOfLots: {
      type: Number,
      default: 1,
      min: 1,
      max: 50,
    },
    fillMethod: {
      type: String,
      enum: ["ASK_BID", "LTP"],
      default: "ASK_BID",
    },
    exitOnNeutral: {
      type: Boolean,
      default: false,
    },
    estimatedCharges: {
      type: Number,
      default: 0, // In rupees per trade
      min: 0,
    },
    quoteFreshnessLimit: {
      type: Number,
      default: 60, // Maximum allowed age in seconds
      min: 5,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PaperTradingSettings ||
  mongoose.model("PaperTradingSettings", PaperTradingSettingsSchema);

