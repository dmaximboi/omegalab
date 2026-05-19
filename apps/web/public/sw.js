// Service Worker - De-Omega Labaffairs
// Advanced caching for fast, smooth experience
const CACHE_NAME = "omega-v2";
const STATIC_CACHE = "omega-static-v2";
const DYNAMIC_CACHE = "omega-dynamic-v2";

// Static assets to pre-cache
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/offline.html",
];

// Install event - pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some assets fail
        console.log("[SW] Some static assets failed to cache");
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first - for HTML pages
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      return cached || caches.match("/offline.html");
    }
  },

  // Cache first - for static assets
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response("", { status: 503 });
    }
  },

  // Stale while revalidate - for images
  staleWhileRevalidate: async (request) => {
    const cached = await caches.match(request);
    
    // Start fetch in background
    const fetchPromise = fetch(request).then(async (response) => {
      if (response.ok) {
        try {
          const cache = await caches.open(DYNAMIC_CACHE);
          // Clone before using
          await cache.put(request, response.clone());
        } catch (e) {
          console.log("[SW] Cache put failed:", e);
        }
      }
      return response;
    }).catch(() => null);

    // Return cached immediately if available, otherwise wait for fetch
    if (cached) {
      // Update cache in background
      fetchPromise.catch(() => {});
      return cached;
    }
    
    const response = await fetchPromise;
    return response || new Response("", { status: 503 });
  },
};

// Fetch event handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip certain paths
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("auth") ||
    url.pathname.includes("_next/webpack") ||
    url.pathname.includes("chrome-extension") ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // Choose strategy based on request type
  if (request.mode === "navigate") {
    // HTML pages - network first
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
  } else if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)
  ) {
    // Images - stale while revalidate
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
  } else if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    url.pathname.match(/\.(css|js|woff2?)$/)
  ) {
    // Static assets - cache first
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
  } else {
    // Everything else - network first
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
  }
});

// Background sync for offline form submissions
self.addEventListener("sync", (event) => {
  if (event.tag === "contact-form") {
    event.waitUntil(syncContactForm());
  }
});

async function syncContactForm() {
  // Get pending submissions from IndexedDB and retry
  console.log("[SW] Syncing contact form submissions");
}
