import mongoose from "mongoose";

const SystemLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ["info", "warn", "error", "debug"],
      default: "info",
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.models.SystemLog || mongoose.model("SystemLog", SystemLogSchema);

