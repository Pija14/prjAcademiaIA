const CACHE = "meu-treino-v61";
// Todos os arquivos do app (inclusive cada módulo em src/) precisam estar aqui para o modo offline.
// Ao criar um módulo novo, adicione-o a esta lista e incremente CACHE.
const ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.json",
  "./icons/logo.svg", "./icons/favicon-32.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png",
  "./src/views/components/brand.js",
  "./src/config/constants.js",
  "./src/config/exerciseCatalog.js",
  "./src/controllers/aiController.js",
  "./src/controllers/authController.js",
  "./src/controllers/calendarController.js",
  "./src/controllers/editorController.js",
  "./src/controllers/historyController.js",
  "./src/controllers/homeController.js",
  "./src/controllers/navigationController.js",
  "./src/controllers/settingsController.js",
  "./src/controllers/trainingsController.js",
  "./src/controllers/workoutController.js",
  "./src/main.js",
  "./src/models/aiModel.js",
  "./src/models/api.js",
  "./src/models/authModel.js",
  "./src/models/exerciseLibraryStore.js",
  "./src/models/historyModel.js",
  "./src/models/session.js",
  "./src/models/settingsModel.js",
  "./src/models/store.js",
  "./src/models/sync.js",
  "./src/models/workoutModel.js",
  "./src/models/workoutSession.js",
  "./src/utils/events.js",
  "./src/utils/format.js",
  "./src/views/aiView.js",
  "./src/views/authView.js",
  "./src/views/calendarView.js",
  "./src/views/components/common.js",
  "./src/views/components/dialogs.js",
  "./src/views/components/fields.js",
  "./src/views/components/icons.js",
  "./src/views/components/snackbar.js",
  "./src/views/editorView.js",
  "./src/views/historyView.js",
  "./src/views/homeView.js",
  "./src/views/layoutView.js",
  "./src/views/settingsView.js",
  "./src/views/trainingsView.js",
  "./src/views/workoutView.js",
];
// cache: "reload" evita gravar no cache do SW uma versão antiga vinda do cache HTTP do navegador.
// skipWaiting/clients.claim: a versão nova assume na hora, sem esperar o app ser fechado.
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })))));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  // AI requests go to a separate backend and must never be cached by the PWA.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  // Páginas (HTML): rede primeiro, para nunca ficar preso a um index.html antigo; cache só sem internet.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then(response => { const copy = response.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return response; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Demais arquivos: cache primeiro. ignoreSearch: "styles.css?v=61" corresponde à entrada sem query string.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(cached => cached || fetch(e.request)));
});
