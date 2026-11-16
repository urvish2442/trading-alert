"use client";

import { useEffect } from "react";

/**
 * Automatically registers the service worker upon app initialization
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Immediately check for service worker updates
          registration.update().catch(() => {});

          // Check for service worker updates periodically
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("New Service Worker version available. Restart app to update.");
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}

