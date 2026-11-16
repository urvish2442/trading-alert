"use client";

import { useState, useEffect } from "react";

let globalDeferredPrompt = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber error
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the default mini-infobar so our custom install UI can prompt cleanly
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

/**
 * Universal hook for PWA install state across Desktop, Android Chrome, and iOS
 */
export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      if (typeof window === "undefined") return;

      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        (document.referrer && document.referrer.includes("android-app://"));

      setIsInstalled(Boolean(isStandalone));
      setCanInstall(!isStandalone && Boolean(globalDeferredPrompt));
    };

    checkStatus();
    listeners.add(checkStatus);

    return () => {
      listeners.delete(checkStatus);
    };
  }, []);

  const promptInstall = async () => {
    if (!globalDeferredPrompt) {
      return { supported: false, outcome: "unavailable" };
    }

    try {
      globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setCanInstall(false);
      }
      globalDeferredPrompt = null;
      notifyListeners();
      return { supported: true, outcome: choice.outcome };
    } catch (err) {
      console.error("PWA prompt error:", err);
      return { supported: false, error: err.message };
    }
  };

  return {
    isInstalled,
    canInstall,
    promptInstall,
  };
}
