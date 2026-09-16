const CACHE = "meu-treino-v57";
const ASSETS = ["./", "./index.html", "./styles.css", "./home-layout.css", "./app.js", "./manifest.json", "./icons/icon.svg", "./assets/gymia-logo.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => {
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
