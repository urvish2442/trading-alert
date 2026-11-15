import * as webpush from "web-push";
import { connectToDatabase } from "@/lib/mongodb/connection";
import PushSubscription from "@/lib/mongodb/models/PushSubscription";
import NotificationLog from "@/lib/mongodb/models/NotificationLog";

/**
 * Configures web-push with VAPID credentials
 */
export function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@trading.local";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/**
 * Dispatches a push notification to a single PushSubscription document
 * Automatically deletes subscriptions that return 410 Gone or 404 Not Found.
 *
 * @param {object} subDoc - Mongoose PushSubscription document
 * @param {object} payload - Notification payload object { title, body, tag, url, icon, badge }
 * @param {string | null} signalId - Optional ObjectId of the signal
 * @returns {Promise<{ success: boolean, statusCode: number, error: string | null }>}
 */
export async function sendNotificationToSubscription(subDoc, payload, signalId = null) {
  configureVapid();

  const payloadString = JSON.stringify(payload);

  try {
    const response = await webpush.sendNotification(subDoc.subscription, payloadString);

    // Log success
    await NotificationLog.create({
      signalId: signalId || null,
      subscriptionId: subDoc._id,
      status: "sent",
      errorMessage: null,
      sentAt: new Date(),
    }).catch(() => {});

    return {
      success: true,
      statusCode: response.statusCode || 201,
      error: null,
    };
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const errorMessage = err.message || "Push dispatch failed";

    // Auto cleanup expired or unsubscribed endpoints
    if (statusCode === 410 || statusCode === 404) {
      console.warn(`Removing expired push subscription ${subDoc.endpoint.slice(0, 40)}... (status ${statusCode})`);
      await PushSubscription.findByIdAndDelete(subDoc._id).catch(() => {});
    }

    // Log failure
    await NotificationLog.create({
      signalId: signalId || null,
      subscriptionId: subDoc._id,
      status: "failed",
      errorMessage: `${statusCode}: ${errorMessage}`,
      sentAt: new Date(),
    }).catch(() => {});

    return {
      success: false,
      statusCode,
      error: errorMessage,
    };
  }
}

/**
 * Formats a signal into a clean, financial Web Push payload
 * Conforms to GEMINI.md Section 11 specifications
 *
 * @param {object} signal
 * @returns {object}
 */
export function formatSignalNotificationPayload(signal) {
  const title = `${signal.signalType} ALERT - NIFTY 50`;

  const istTime = new Date(new Date(signal.candleTimestamp).getTime() + 5.5 * 3600000);
  const timeFormatted = istTime.toISOString().replace("T", " ").slice(0, 19) + " IST";

  let actionText = "";
  if (signal.signalType === "BUY CALL") {
    actionText = "Bullish Crossover above VWAP. State transitioned to CALL ACTIVE.";
  } else if (signal.signalType === "BUY PUT") {
    actionText = "Bearish Crossunder below VWAP. State transitioned to PUT ACTIVE.";
  } else if (signal.signalType === "EXIT CALL") {
    actionText = "Price crossed below EMA 9 trailing stop. Exited to FLAT.";
  } else if (signal.signalType === "EXIT PUT") {
    actionText = "Price crossed above EMA 9 trailing stop. Exited to FLAT.";
  }

  const body = [
    `Direction: ${signal.signalType}`,
    `Close: ₹${signal.candleClose?.toLocaleString("en-IN")}`,
    `VWAP: ₹${signal.vwap}`,
    `EMA 9: ₹${signal.ema9}`,
    `Time: ${timeFormatted}`,
    actionText,
  ].filter(Boolean).join("\n");

  return {
    title,
    body,
    tag: `signal-${signal._id || Date.now()}`,
    url: "/signals",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: "/signals",
      signalId: signal._id ? signal._id.toString() : null,
      signalType: signal.signalType,
      candleTimestamp: signal.candleTimestamp,
    },
  };
}

/**
 * Broadcasts a trading alert to all active device push subscriptions in MongoDB Atlas
 *
 * @param {object} signal - Stored Signal document
 * @returns {Promise<{ totalSubscribers: number, sent: number, failed: number, results: Array<object> }>}
 */
export async function broadcastSignalAlert(signal) {
  if (!signal) {
    return { totalSubscribers: 0, sent: 0, failed: 0, results: [] };
  }

  await connectToDatabase();

  const subscribers = await PushSubscription.find({ enabled: true }).lean();

  if (subscribers.length === 0) {
    return { totalSubscribers: 0, sent: 0, failed: 0, results: [] };
  }

  const payload = formatSignalNotificationPayload(signal);

  const promises = subscribers.map((sub) =>
    sendNotificationToSubscription(sub, payload, signal._id)
  );

  const results = await Promise.allSettled(promises);

  let sent = 0;
  let failed = 0;

  results.forEach((res) => {
    if (res.status === "fulfilled" && res.value.success) {
      sent++;
    } else {
      failed++;
    }
  });

  return {
    totalSubscribers: subscribers.length,
    sent,
    failed,
    results,
  };
}

/**
 * Sends an immediate test notification to a specific subscription
 *
 * @param {object} subscription - Web Push subscription object
 * @returns {Promise<object>}
 */
export async function sendTestNotification(subscription) {
  configureVapid();

  const payload = {
    title: "TEST ALERT - NIFTY 50 PWA",
    body: "Your device is successfully subscribed to NIFTY Option Buyer push notifications!\nTime: " + new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
    tag: `test-alert-${Date.now()}`,
    url: "/dashboard",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  const response = await webpush.sendNotification(subscription, JSON.stringify(payload));

  return {
    success: true,
    statusCode: response.statusCode || 201,
  };
}
