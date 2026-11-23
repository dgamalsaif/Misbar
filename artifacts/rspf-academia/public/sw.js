const CACHE_PREFIX = "misbar-app-";
const CACHE_NAME = "misbar-app-v7";
const APP_SHELL_URL = new URL("./", self.registration.scope).toString();
const APP_SHELL_ASSETS = [
  new URL("./favicon.svg", self.registration.scope).toString(),
  new URL("./misbar-logo.svg", self.registration.scope).toString(),
];

function isCacheableAppAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === "/favicon.svg" || url.pathname === "/misbar-logo.svg") return true;
  return url.pathname.startsWith("/assets/") && /\.(?:js|css|woff2?|svg|png|webp|jpe?g)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const landingPage = await fetch(APP_SHELL_URL, { cache: "no-store" });
      if (!landingPage.ok) {
        throw new Error(`Could not fetch the Misbar app shell (${landingPage.status}).`);
      }
      const html = await landingPage.clone().text();
      const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|woff2?))[^"]*"/g)]
        .map((match) => new URL(match[1], APP_SHELL_URL))
        .filter((url) => url.origin === self.location.origin && url.pathname.startsWith("/assets/"))
        .map((url) => url.toString());
      await cache.put(APP_SHELL_URL, landingPage);
      await cache.addAll([...new Set([...APP_SHELL_ASSETS, ...assetUrls])]);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  ) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(APP_SHELL_URL, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(APP_SHELL_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (!isCacheableAppAsset(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === "basic") {
      await cache.put(event.request, response.clone());
    }
    return response;
  })());
});