"use client";

import { useState, useEffect } from "react";
import {
  BellRing,
  Smartphone,
  ShieldCheck,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Trash2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationsPage() {
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [subscribersList, setSubscribersList] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);

  // 1. Detect browser environment and existing subscription
  useEffect(() => {
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsStandalone(standalone);

      // Auto-detect a friendly device name
      const ua = navigator.userAgent;
      let detected = "Browser Client";
      if (/iPhone|iPad|iPod/.test(ua)) detected = "Apple iOS Device";
      else if (/Android/.test(ua)) detected = "Android Device";
      else if (/Macintosh/.test(ua)) detected = "Mac Desktop";
      else if (/Windows/.test(ua)) detected = "Windows PC";
      setDeviceName(detected);

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setIsSupported(false);
        return;
      }

      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
        setCurrentSubscription(sub);
      } else {
        setIsSubscribed(false);
        setCurrentSubscription(null);
      }
    } catch {
      // Ignored
    }
  };

  const loadServerStatus = async () => {
    try {
      const res = await fetch("/api/notifications/status");
      if (res.ok) {
        const data = await res.json();
        setTotalSubscribers(data.totalSubscribers || 0);
        setSubscribersList(data.subscribers || []);
        setDeliveryLogs(data.recentLogs || []);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadServerStatus();
  }, [isSubscribed]);

  // 2. Subscribe to Web Push
  const handleSubscribe = async () => {
    setIsLoading(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      // Request notification permission
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== "granted") {
        setErrorMessage("Notification permission was denied. Please allow notifications in browser settings.");
        setIsLoading(false);
        return;
      }

      // Fetch VAPID public key from backend
      const keyRes = await fetch("/api/notifications/vapid-key");
      const keyData = await keyRes.json();

      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || "Failed to retrieve VAPID public key");
      }

      const reg = await navigator.serviceWorker.ready;
      const applicationServerKey = urlB64ToUint8Array(keyData.publicKey);

      // Subscribe via PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Save to MongoDB Atlas
      const saveRes = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to persist subscription");
      }

      setIsSubscribed(true);
      setCurrentSubscription(subscription);
      setStatusMessage("Device successfully subscribed! You will now receive background trading alerts.");
      await loadServerStatus();
    } catch (err) {
      setErrorMessage("Subscription error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Unsubscribe from Web Push
  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      if (currentSubscription) {
        const endpoint = currentSubscription.endpoint;
        await currentSubscription.unsubscribe();

        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      setCurrentSubscription(null);
      setStatusMessage("Device unsubscribed from notifications.");
      await loadServerStatus();
    } catch (err) {
      setErrorMessage("Unsubscribe error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Send Test Notification
  const handleSendTest = async () => {
    if (!currentSubscription) return;
    setIsTesting(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: currentSubscription.toJSON(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage("Test push alert dispatched! Check your notification center.");
        await loadServerStatus();
      } else {
        setErrorMessage(data.error || "Failed to send test push");
      }
    } catch (err) {
      setErrorMessage("Test alert failed: " + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-emerald-400" />
            PWA Push Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Background alerts delivered to your device via Web Push API and Service Worker
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="terminal" className="text-emerald-400">VAPID SECURED</Badge>
          <Badge
            variant={isSubscribed ? "buy" : "neutral"}
            className="text-[11px] font-mono"
          >
            {isSubscribed ? "DEVICE SUBSCRIBED" : "NOT SUBSCRIBED"}
          </Badge>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-md bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Subscription & Device Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Device Subscription Control Card */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>This Device Status</span>
              <Smartphone className="h-4 w-4 text-emerald-400" />
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Register this browser or installed PWA to receive instant BUY CALL, BUY PUT, and EXIT alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-3.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Browser Permission:</span>
                <span
                  className={`font-semibold uppercase ${
                    permission === "granted"
                      ? "text-emerald-400"
                      : permission === "denied"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {permission}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PWA Mode:</span>
                <span className={isStandalone ? "text-emerald-400" : "text-slate-400"}>
                  {isStandalone ? "Installed Standalone PWA" : "Browser Tab"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PushManager Supported:</span>
                <span className={isSupported ? "text-emerald-400" : "text-red-400"}>
                  {isSupported ? "Yes (Active)" : "Unsupported Browser"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Device Label:</span>
                <span className="text-slate-200">{deviceName}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {!isSubscribed ? (
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading || !isSupported}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs h-9 gap-1.5"
                >
                  <BellRing className="h-3.5 w-3.5" />
                  <span>{isLoading ? "Subscribing..." : "Enable Push Notifications"}</span>
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSendTest}
                    disabled={isTesting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs h-9 gap-1.5"
                  >
                    <Send className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
                    <span>{isTesting ? "Sending..." : "Send Test Alert"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUnsubscribe}
                    disabled={isLoading}
                    className="border-red-500/30 text-red-400 hover:bg-red-950/20 text-xs h-9 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Unsubscribe</span>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform Guidance Card */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-400" />
              Platform Installation &amp; iOS Guidance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-3 text-slate-300">
            <div className="space-y-1 bg-slate-950/40 p-2.5 rounded border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Share2 className="h-3.5 w-3.5 text-sky-400" />
                <span>Apple iOS (iPhone / iPad):</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                Web Push on iOS requires <strong>iOS 16.4 or later</strong>. Tap Safari&apos;s Share button &rarr; tap <strong>&quot;Add to Home Screen&quot;</strong> &rarr; launch the app from your Home Screen &rarr; tap &quot;Enable Push Notifications&quot;.
              </p>
            </div>

            <div className="space-y-1 bg-slate-950/40 p-2.5 rounded border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                <span>Android &amp; Desktop Chrome:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                Works directly in browser tabs or installed PWA. Notifications will wake your lock screen and notify sound/vibration even when the app is in the background.
              </p>
            </div>

            <div className="pt-1 flex items-center gap-1.5 text-slate-400 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>VAPID keys are cryptographically signed. Private keys never leave the server.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribed Devices & Notification Delivery Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Registered Devices */}
        <Card className="bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Active Subscribed Devices</span>
              <Badge variant="terminal">{totalSubscribers} SUBSCRIBED</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {subscribersList.map((s) => (
              <div
                key={s._id}
                className="p-3 rounded-md bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="text-slate-200 font-semibold">{s.deviceName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Added: {new Date(s.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                    {s.endpointPreview}
                  </div>
                </div>
                <Badge variant="buy" className="text-[10px]">ACTIVE</Badge>
              </div>
            ))}
            {subscribersList.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No devices currently subscribed. Click &quot;Enable Push Notifications&quot; above.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real-time Delivery Log Stream */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>Recent Push Delivery Stream (MongoDB Atlas)</span>
                <Badge variant="terminal">{deliveryLogs.length} LOGS</Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadServerStatus}
                className="h-7 w-7 text-slate-400"
                aria-label="Refresh notification logs"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Audit log of push notification dispatches per Section 11 specifications
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-950/60 border-b border-border/80 text-[11px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-3">Signal</th>
                    <th className="py-2.5 px-3">Device</th>
                    <th className="py-2.5 px-3">Sent Time (IST)</th>
                    <th className="py-2.5 px-4">Result / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {deliveryLogs.map((log) => {
                    const isSent = log.status === "sent";
                    return (
                      <tr key={log._id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-4">
                          <Badge variant={isSent ? "buy" : "sell"} className="text-[10px]">
                            {isSent ? "DELIVERED" : "FAILED"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {log.signalId?.signalType || "TEST ALERT"}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {log.subscriptionId?.deviceName || "Client Device"}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {new Date(log.sentAt).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-4 text-[11px] text-slate-400">
                          {log.errorMessage ? (
                            <span className="text-red-400">{log.errorMessage}</span>
                          ) : (
                            <span className="text-emerald-400">201 Created</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {deliveryLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No notification logs recorded yet. Send a test alert above to verify delivery.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
