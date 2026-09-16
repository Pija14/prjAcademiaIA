const CACHE = "meu-treino-v64";
const ASSETS = ["./", "./index.html", "./styles.css?v=60", "./home-layout.css?v=60", "./login.css?v=63", "./app.js?v=60", "./manifest.json?v=63", "./assets/logo-gymia.svg?v=63"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
