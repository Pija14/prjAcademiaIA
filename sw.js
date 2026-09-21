const CACHE = "meu-treino-v51";
const DESIGN_SYSTEM = "./styles/meu-treino-design-system.css";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.json", "./icons/icon.svg", DESIGN_SYSTEM];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function applyDesignSystem(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const html = await response.text();
  if (html.includes("styles/meu-treino-design-system.css")) return new Response(html, {status: response.status, statusText: response.statusText, headers: response.headers});
  const updated = html.replace("</head>", `  <link rel="stylesheet" href="${DESIGN_SYSTEM}">\n</head>`);
  return new Response(updated, {status: response.status, statusText: response.statusText, headers: response.headers});
}

self.addEventListener("fetch", event => {
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return applyDesignSystem(cached);
      const response = await fetch(event.request);
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
      }
      return applyDesignSystem(response);
    })
  );
});
