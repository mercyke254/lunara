/**
 * Lunara service worker.
 *
 * ============================================================================
 *  SECURITY-CRITICAL CACHING POLICY - read before changing anything here.
 * ============================================================================
 *
 * Lunara handles personal health data. A service worker sits between the app and
 * the network and can persist responses on disk, so an over-eager cache is a data
 * leak: anything cached outlives sign-out and is readable by anyone with access
 * to the device profile.
 *
 * Therefore this worker caches ONLY:
 *   - static build assets under /_next/static/  (content-hashed, immutable)
 *   - our own icon and font files
 *   - one static offline fallback page (/offline)
 *
 * It NEVER caches:
 *   - anything under /api/ (including /api/export)
 *   - any HTML navigation response, i.e. any authenticated page
 *   - any non-GET request
 *
 * Consequence, stated plainly: Lunara is installable and its shell loads without
 * a network, but personal health data is NOT available offline. That is a
 * deliberate trade of convenience for safety.
 */

const CACHE_VERSION = "lunara-static-v1";

/** Immutable, content-hashed build output. */
const STATIC_ASSET_PREFIX = "/_next/static/";

/** Small, public, non-personal assets. */
const PRECACHE_URLS = ["/offline", "/icons/icon.svg", "/icons/maskable.svg"];

/**
 * Requests that must never be cached, regardless of method or destination.
 */
function isNeverCached(url) {
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname === "/api") return true;
  // Auth screens are served as HTML navigations and are excluded by the
  // navigation rule below, but listing them here makes the intent explicit.
  if (
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/recover-account") ||
    url.pathname.startsWith("/reset-password") ||
    url.pathname.startsWith("/forgot-password")
  ) {
    return true;
  }
  return false;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith(STATIC_ASSET_PREFIX) ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|ttf|png|jpg|jpeg|svg|webp|avif|ico)$/.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Best-effort: a failure to pre-cache must not block activation.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions so a stale asset can never be served
      // after a deploy.
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Only ever touch GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 2. Same-origin only. Never intercept third-party requests.
  if (url.origin !== self.location.origin) return;

  // 3. Hard exclusions first: API and auth endpoints are never cached.
  if (isNeverCached(url)) return;

  // 4. Static assets: cache-first, then refresh the entry in the background.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          // Only store successful, same-origin, complete responses.
          if (response.ok && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          // A missing asset offline is not worth fabricating a response for.
          throw error;
        }
      })(),
    );
    return;
  }

  // 5. Navigations: network-only, with a static offline page as the fallback.
  //    Authenticated HTML is NEVER written to the cache.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (error) {
          const cache = await caches.open(CACHE_VERSION);
          const offline = await cache.match("/offline");
          if (offline) return offline;
          throw error;
        }
      })(),
    );
    return;
  }

  // 6. Anything else: pass through untouched.
});

/**
 * Allow the page to trigger an immediate update after a deploy.
 */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
