const CACHE_NAME = "ministerio-seven-v4-step7-4-cifra-public-controls";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/musicas.html",
  "/cifras.html",
  "/agenda.html",
  "/fotos.html",
  "/downloads.html",
  "/contato.html",
  "/assets/css/main.css",
  "/assets/css/theme.css",
  "/assets/css/layout.css",
  "/assets/js/app.js",
  "/assets/js/public-auth.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
