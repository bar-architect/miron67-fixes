// Keeps the two screens and the photos on the phone, so they open with no reception.
// Pages: always try the network first (a new version shows at once), with a saved copy as backup.
// Photos: never change, so a saved copy is used whenever there is one.
// Status updates to the Google Sheet are not touched here: they go straight to Google.
const PAGES = "miron-pages-v1";
const IMGS = "miron-img-v1";
const SLOW_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

async function page(url) {
  const cache = await caches.open(PAGES);
  const saved = await cache.match(url.pathname);
  const fresh = fetch(url.pathname + url.search, { cache: "no-cache" }).then(res => {
    if (res.ok) cache.put(url.pathname, res.clone());
    return res;
  });
  if (!saved) return fresh;
  // Weak reception: show the saved copy instead of a blank screen; the new one is kept for next time.
  const slow = new Promise(resolve => setTimeout(() => resolve(saved), SLOW_MS));
  return Promise.race([fresh.catch(() => saved), slow]);
}

async function photo(request) {
  const cache = await caches.open(IMGS);
  const saved = await cache.match(request.url, { ignoreSearch: true });
  if (saved) return saved;
  const res = await fetch(request);
  if (res.ok) cache.put(request.url, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/img/")) e.respondWith(photo(e.request));
  else if (e.request.mode === "navigate") e.respondWith(page(url));
});
