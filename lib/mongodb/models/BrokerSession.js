import mongoose from "mongoose";

const BrokerSessionSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: "zerodha",
      index: true,
    },
    accessTokenEncrypted: {
      type: String,
      default: null,
    },
    tokenExpiry: {
      type: Date,
      default: null,
    },
    connected: {
      type: Boolean,
      default: false,
    },
    lastAuthenticatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.BrokerSession || mongoose.model("BrokerSession", BrokerSessionSchema);

