// Compatibilidade com instalações antigas do PWA.
// Service workers anteriores à v59 guardaram um index.html que carrega este arquivo.
// Ele apenas carrega o app modular atual; o novo service worker substitui o HTML antigo em seguida.
import("./src/main.js").catch(err => console.error("Falha ao carregar o app:", err));
