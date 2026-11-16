// Service Worker for NIFTY 50 Intraday Alert PWA
// Conforms to Chrome Android PWA installability requirements and GEMINI.md Section 11

const SW_VERSION = "3.0.1";
const CACHE_NAME = `nifty-pwa-v${SW_VERSION}`;

const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

// Install: Cache essential PWA static assets & claim immediate activation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Required for Chrome Android PWA Installability criteria
// Passes dynamic API/data calls through directly to network, while serving cached icons/assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Ignore non-HTTP requests (e.g. chrome-extension://, data:)
  if (!request.url.startsWith("http")) {
    return;
  }

  // 2. API routes & Non-GET requests: Always go directly to network
  if (request.url.includes("/api/") || request.method !== "GET") {
    return;
  }

  // 2. Static icons & manifest: Cache-first strategy for fast offline readiness
  if (request.url.includes("/icons/") || request.url.includes("manifest.json")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Navigation & pages: Network-first with cache fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
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
    requireInteraction: true,
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
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
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
