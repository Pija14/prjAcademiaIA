/* Meu Treino — Home visual refresh only. No business/data mutations. */
(function () {
  const originalRenderHome = window.renderHome;
  if (typeof originalRenderHome !== "function") return;

  let googleChartsPromise = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[m]));
  }

  function formatMinutes(seconds) {
    const minutes = Math.round(Math.max(0, Number(seconds) || 0) / 60);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  function ensureGoogleCharts() {
    if (window.google?.visualization?.PieChart) return Promise.resolve();
    if (googleChartsPromise) return googleChartsPromise;
    googleChartsPromise = new Promise((resolve, reject) => {
      const finish = () => {
        try {
          if (!window.google?.charts?.load || !window.google?.charts?.setOnLoadCallback) { reject(new Error("Google Charts indisponível")); return; }
          window.google.charts.load("current", { packages: ["corechart"] });
          window.google.charts.setOnLoadCallback(resolve);
        } catch (error) { reject(error); }
      };
      const existing = document.getElementById("google-charts-loader");
      if (existing) {
        if (window.google?.charts?.load) finish();
        else existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("Falha ao carregar Google Charts")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "google-charts-loader";
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.async = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("Falha ao carregar Google Charts"));
      document.head.appendChild(script);
    });
    return googleChartsPromise;
  }

  function buildMonthData(workouts, month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const values = Array(daysInMonth).fill(0);
    workouts.forEach(w => {
      const date = String(w.date || "");
      if (!date.startsWith(month)) return;
      const day = Number(date.slice(8, 10));
      if (day >= 1 && day <= daysInMonth) values[day - 1] += Number(w.totalTime) || 0;
    });
    return { days: Array.from({ length: daysInMonth }, (_, i) => i + 1), values };
  }

  function buildMuscleData(workouts) {
    const totals = new Map();
    workouts.forEach(workout => {
      const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
      exercises.forEach(exercise => {
        if (exercise.completed === false) return;
        const group = String(exercise.section || "Outros").trim() || "Outros";
        const key = group.toLocaleLowerCase("pt-BR");
        const current = totals.get(key) || { label: group, value: 0 };
        current.value += 1;
        totals.set(key, current);
      });
    });
    const preferred = ["Peito", "Peitorais", "Costas", "Pernas", "Membros inferiores", "Ombros", "Bíceps", "Tríceps"];
    const ordered = [];
    preferred.forEach(name => {
      const key = name.toLocaleLowerCase("pt-BR");
      const item = totals.get(key);
      if (item) { ordered.push(item); totals.delete(key); }
    });
    [...totals.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR")).forEach(item => ordered.push(item));
    if (ordered.length > 7) {
      const visible = ordered.slice(0, 6);
      const other = ordered.slice(6).reduce((sum, item) => sum + item.value, 0);
      visible.push({ label: "Outros", value: other });
      return visible;
    }
    return ordered;
  }

  const MUSCLE_PALETTE = ["#E86F6A", "#F39A3D", "#F6C344", "#6BC79A", "#5B9BE8", "#8D82E8", "#B48AD0"];

  function renderMonthChart(workouts, month) {
    const { days, values } = buildMonthData(workouts, month);
    const chartId = `home-month-google-chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    requestAnimationFrame(() => {
      const draw = () => {
        try {
          const container = document.getElementById(chartId);
          if (!container || !window.google?.visualization?.ColumnChart) return;
          const table = new google.visualization.DataTable();
          table.addColumn("string", "Dia"); table.addColumn("number", "Minutos"); table.addColumn({ type: "string", role: "tooltip" });
          table.addRows(days.map((day, i) => { const minutes = Math.round(Math.max(0, Number(values[i]) || 0) / 60); return [String(day), minutes, `${day}: ${formatMinutes(values[i])}`]; }));
          const chart = new google.visualization.ColumnChart(container);
          chart.draw(table, { backgroundColor: "transparent", colors: ["#6FA9DF"], legend: { position: "none" }, chartArea: { left: 48, top: 16, width: "92%", height: "72%" }, hAxis: { title: "Dia", textStyle: { color: "#60708A", fontName: "Arial", fontSize: 11 }, titleTextStyle: { color: "#60708A", fontName: "Arial", fontSize: 11 }, slantedText: false, showTextEvery: days.length > 20 ? 2 : 1, gridlines: { color: "transparent" } }, vAxis: { title: "Minutos", minValue: 0, format: "0", textStyle: { color: "#60708A", fontName: "Arial", fontSize: 11 }, titleTextStyle: { color: "#60708A", fontName: "Arial", fontSize: 11 }, gridlines: { color: "#E6EBF2", count: 5 } }, bar: { groupWidth: "58%" }, tooltip: { textStyle: { fontName: "Arial", fontSize: 12 } }, enableInteractivity: true });
        } catch (_) {}
      };
      ensureGoogleCharts().then(draw).catch(() => {});
    });
    return `<div class="home-month-chart-scroll"><div class="home-month-google-chart" id="${chartId}" role="img" aria-label="Tempo de treino por dia do mês"></div></div>`;
  }

  function renderMuscleChart(workouts) {
    const data = buildMuscleData(workouts);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (!total) return `<div class="home-chart-empty">Conclua um treino para visualizar a distribuição.</div>`;
    const chartId = `home-muscle-google-chart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const calloutId = `home-muscle-callouts-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const callouts = data.map((item, i) => {
      const start = data.slice(0, i).reduce((sum, current) => sum + current.value, 0);
      const angle = ((start + item.value / 2) / total) * Math.PI * 2 - Math.PI / 2;
      const x1 = 50 + Math.cos(angle) * 31;
      const y1 = 50 + Math.sin(angle) * 31;
      const x2 = 50 + Math.cos(angle) * 39;
      const y2 = 50 + Math.sin(angle) * 39;
      const side = Math.cos(angle) >= 0 ? 1 : -1;
      const x3 = x2 + side * 8;
      const y3 = y2;
      const percentage = Math.round((item.value / total) * 100);
      const anchor = side > 0 ? "start" : "end";
      return `<path class="home-donut-callout-line" d="M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)}"></path><text class="home-donut-callout-text" x="${(x3 + side * 2).toFixed(2)}" y="${(y3 - 1).toFixed(2)}" text-anchor="${anchor}">${percentage}%</text>`;
    }).join("");
    requestAnimationFrame(() => {
      const draw = () => {
        try {
          const container = document.getElementById(chartId);
          if (!container || !window.google?.visualization?.PieChart) return;
          const table = new google.visualization.DataTable();
          table.addColumn("string", "Grupo"); table.addColumn("number", "Exercícios"); table.addColumn({ type: "string", role: "tooltip" });
          table.addRows(data.map(item => [item.label, item.value, `${item.label}: ${item.value} exercícios`]));
          const chart = new google.visualization.PieChart(container);
          chart.draw(table, { backgroundColor: "transparent", pieHole: 0.64, pieSliceText: "none", pieSliceBorderColor: "#FFFFFF", colors: data.map((_, i) => MUSCLE_PALETTE[i % MUSCLE_PALETTE.length]), legend: { position: "none" }, chartArea: { left: 4, top: 4, width: "92%", height: "92%" }, tooltip: { textStyle: { fontName: "Arial", fontSize: 12 } }, enableInteractivity: true, pieStartAngle: 0 });
        } catch (_) {}
      };
      ensureGoogleCharts().then(draw).catch(() => {});
    });
    return `<div class="home-google-donut-wrap"><div class="home-google-donut" id="${chartId}" role="img" aria-label="Distribuição de ${total} exercícios por grupo muscular"></div><svg id="${calloutId}" class="home-donut-callouts" viewBox="0 0 100 100" aria-hidden="true">${callouts}</svg><div class="home-google-donut-center" aria-hidden="true"><strong>${total}</strong><span>exercícios</span></div></div>`;
  }

  function renderWeeklyGauge(weeklyCount, weeklyTarget) {
    const safeTarget = Math.max(1, Number(weeklyTarget) || 1);
    const safeCount = Math.max(0, Number(weeklyCount) || 0);
    const progress = Math.min(100, Math.round((safeCount / safeTarget) * 100));
    const gaugeId = `home-weekly-progress-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `<section class="home-gauge-card" aria-label="Meta semanal"><div class="home-chart-head"><div><div class="eyebrow">META SEMANAL</div><h3>Treinos realizados</h3></div></div><div class="home-semicircle-wrap"><svg class="home-semicircle" viewBox="0 0 220 125" role="img" aria-label="${safeCount} de ${safeTarget} treinos realizados nesta semana"><path class="home-semicircle-track" d="M 18 110 A 92 92 0 0 1 202 110" pathLength="100"></path><path id="${gaugeId}" class="home-semicircle-progress" d="M 18 110 A 92 92 0 0 1 202 110" pathLength="100" style="stroke-dasharray:${progress} 100"></path></svg><div class="home-semicircle-caption"><strong>${safeCount} de ${safeTarget}</strong><span>${progress}%</span></div></div></section>`;
  }

  function renderHomeModern() {
    if (typeof window.ensurePhase2Data === "function") window.ensurePhase2Data();
    const user = typeof window.getCurrentUser === "function" ? window.getCurrentUser() : null;
    const stored = window.MeuTreinoStorage?.read?.({}) || {};
    const workouts = Array.isArray(stored.workouts) ? stored.workouts : [];
    const todayISO = typeof window.todayISO === "function" ? window.todayISO : () => new Date().toISOString().slice(0, 10);
    const today = todayISO(); const month = today.slice(0, 7);
    const weeklyTarget = Number(stored.settings?.weeklyGoal) || 4;
    const weekStart = new Date(`${today}T12:00:00`); const day = (weekStart.getDay() + 6) % 7; weekStart.setDate(weekStart.getDate() - day);
    const weekStartISO = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const weeklyCount = workouts.filter(w => w.date >= weekStartISO && w.date <= today).length;
    const monthCount = workouts.filter(w => String(w.date || "").startsWith(month)).length;
    const totalTime = workouts.reduce((sum, w) => sum + (Number(w.totalTime) || 0), 0);
    const recent = workouts[workouts.length - 1] || null;
    const displayName = typeof window.f2DisplayName === "function" ? window.f2DisplayName : value => String(value || "");
    const name = String(user?.name || "").trim();

    window.layout(`
      <section class="home-modern-head"><div class="home-greeting-copy"><h2>Olá, ${escapeHtml(name || "!")}!</h2><p>Como está seu treino?</p></div></section>
      <section class="home-kpi-grid" aria-label="Indicadores do treino"><article class="home-kpi home-kpi-blue"><div><span>Treinos este mês</span><strong>${monthCount}</strong></div></article><article class="home-kpi home-kpi-green"><div><span>Tempo total</span><strong>${formatMinutes(totalTime)}</strong></div></article>
      ${recent ? `<button class="home-recent-row" onclick="showWorkoutDetails('${escapeHtml(recent.id)}')"><span><small>Último Treino</small><b>${escapeHtml(displayName(recent.type))}</b></span></button>` : `<div class="home-empty-row"><span>Ainda não há treinos registrados.</span><button class="primary" onclick="go('trainings')">Começar um treino</button></div>`}</section>
      <section class="home-analysis-grid"><section class="home-chart-card home-distribution-card"><div class="home-chart-head"><div><h3>Distribuição por Grupo Muscular</h3></div></div><div class="home-muscle-chart">${renderMuscleChart(workouts)}</div></section>${renderWeeklyGauge(weeklyCount, weeklyTarget)}</section>
      <section class="home-chart-card home-activity-card"><div class="home-chart-head home-activity-head"><div><span class="eyebrow">ATIVIDADE</span><h3>Tempo de treino por dia do mês</h3></div></div>${renderMonthChart(workouts, month)}</section>
    `, "home");
    const homeTopbar = document.querySelector(".topbar");
    if (homeTopbar) homeTopbar.style.display = "none";
  }

  window.renderHome = renderHomeModern;
})();