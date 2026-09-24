"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Only in production: during development a service worker intercepting requests
 * fights with hot reload and produces stale-asset confusion that looks like a
 * bug in the app. It is also skipped in browsers without support, so the app
 * degrades to an ordinary web page rather than failing to load.
 *
 * Registration is deferred until the window `load` event so it never competes
 * with first paint for bandwidth.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => {
          // Non-fatal: the app works without offline support.
          console.warn("[lunara:pwa] service worker registration failed", error);
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
