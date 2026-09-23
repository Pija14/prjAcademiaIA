/* Home — reposiciona o último treino junto aos KPIs, sem alterar regras de negócio. */
(function () {
  function arrange() {
    const grid = document.querySelector(".home-kpi-grid");
    const recent = document.querySelector(".home-recent-row");
    if (!grid || !recent) return;
    if (recent.parentElement !== grid) grid.appendChild(recent);
  }

  function start() {
    arrange();
    const app = document.getElementById("app");
    if (!app) return;
    new MutationObserver(arrange).observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
