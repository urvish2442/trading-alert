import mongoose from "mongoose";

const PaperTradeSchema = new mongoose.Schema(
  {
    tradeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    strategyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Strategy",
      required: true,
      index: true,
    },
    signalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Signal",
      required: true,
      index: true,
    },
    underlying: {
      type: String,
      default: "NIFTY 50",
    },
    exchange: {
      type: String,
      default: "NFO",
    },
    optionSymbol: {
      type: String,
      required: true,
    },
    instrumentToken: {
      type: Number,
      required: true,
    },
    optionType: {
      type: String,
      enum: ["CE", "PE"],
      required: true,
    },
    strikePrice: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    entryPremium: {
      type: Number,
      required: true,
    },
    entryTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    entrySpotPrice: {
      type: Number,
      required: true,
    },
    entryQuantity: {
      type: Number,
      required: true,
    },
    lotSize: {
      type: Number,
      required: true,
      default: 75,
    },
    numberOfLots: {
      type: Number,
      required: true,
      default: 1,
    },
    totalQuantity: {
      type: Number,
      required: true,
    },
    entryFillMethod: {
      type: String,
      enum: ["ASK", "BID", "LTP"],
      default: "ASK",
    },
    currentPremium: {
      type: Number,
      default: null,
    },
    currentPremiumTimestamp: {
      type: Date,
      default: null,
    },
    unrealizedPnl: {
      type: Number,
      default: 0,
    },
    exitPremium: {
      type: Number,
      default: null,
    },
    exitTimestamp: {
      type: Date,
      default: null,
      index: true,
    },
    exitReason: {
      type: String,
      enum: ["OPPOSITE_SIGNAL", "STRATEGY_EXIT", "MANUAL_EXIT", "EXPIRY_CUTOFF", null],
      default: null,
    },
    exitFillMethod: {
      type: String,
      enum: ["ASK", "BID", "LTP", null],
      default: null,
    },
    grossPnl: {
      type: Number,
      default: 0,
    },
    estimatedCharges: {
      type: Number,
      default: 0,
    },
    netPnl: {
      type: Number,
      default: 0,
    },
    returnPercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "EXPIRED", "FAILED"],
      default: "OPEN",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// 1. Prevent duplicate trade creation for the same triggering signal
PaperTradeSchema.index({ strategyId: 1, signalId: 1 }, { unique: true });

// 2. Partial unique index to enforce at most ONE "OPEN" position per strategy at the database level
PaperTradeSchema.index(
  { strategyId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "OPEN" },
  }
);

// 3. Date queries for history and monthly P&L
PaperTradeSchema.index({ strategyId: 1, exitTimestamp: -1 });

export default mongoose.models.PaperTrade || mongoose.model("PaperTrade", PaperTradeSchema);
