import mongoose from "mongoose";

const InstrumentSchema = new mongoose.Schema(
  {
    instrumentToken: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    exchange: {
      type: String,
      required: true,
    },
    tradingSymbol: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    instrumentType: {
      type: String,
      enum: ["EQ", "FUT", "INDEX", "CE", "PE"],
      required: true,
    },
    expiry: {
      type: Date,
      default: null,
    },
    lotSize: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Instrument || mongoose.model("Instrument", InstrumentSchema);

