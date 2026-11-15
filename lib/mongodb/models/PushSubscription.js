import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subscription: {
      type: Object,
      required: true,
    },
    deviceName: {
      type: String,
      default: "Browser / PWA Client",
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema);

