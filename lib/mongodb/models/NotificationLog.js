import mongoose from "mongoose";

const NotificationLogSchema = new mongoose.Schema(
  {
    signalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Signal",
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PushSubscription",
      index: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.models.NotificationLog || mongoose.model("NotificationLog", NotificationLogSchema);

