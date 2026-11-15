// Service Worker for NIFTY 50 Intraday Alert PWA
// Conforms to GEMINI.md Section 11 specifications

const SW_VERSION = "2.0.0";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Web Push Event Handler
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.warn("Push event received with no payload");
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "NIFTY 50 Alert",
      body: event.data.text(),
      url: "/signals",
    };
  }

  const title = data.title || "NIFTY Option Buyer Alert";
  const isPut = title.includes("PUT");
  const isCall = title.includes("CALL");

  // Differentiated vibration patterns
  const vibratePattern = isPut
    ? [300, 100, 300, 100, 300] // Urgency for PUT
    : isCall
    ? [200, 100, 200]           // Upward tone for CALL
    : [150, 50, 150];            // Exit / Flat

  const options = {
    body: data.body || "New completed 5-minute candle transition detected.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || `signal-${Date.now()}`,
    data: data.data || { url: data.url || "/signals" },
    vibrate: vibratePattern,
    requireInteraction: true, // Keep notification visible until dismissed
    actions: [
      { action: "view", title: "View Signal" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl =
    event.notification.data?.url ||
    (typeof event.notification.data === "string" ? event.notification.data : "/signals");

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Push Subscription Change Handler
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        return fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: newSubscription,
            deviceName: "Auto-Renewed Client",
          }),
        });
      })
      .catch((err) => {
        console.error("Failed to auto-renew push subscription:", err);
      })
  );
});
