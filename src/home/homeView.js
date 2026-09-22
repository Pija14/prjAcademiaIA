/* Meu Treino — Home visual refresh only. No business/data mutations. */
(function () {
  const originalRenderHome = window.renderHome;
  if (typeof originalRenderHome !== "function") return;

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

  // Paleta suave e distinguível para a distribuição por grupo muscular.
  const MUSCLE_PALETTE = ["#E9A0A0", "#F2B27D", "#F2CF72", "#86C8A8", "#83B5E3", "#9E92D8", "#C6A1D8"];

  function donutGradient(values, total) {
    if (!total) return "conic-gradient(#e9eef2 0 100%)";
    const segments = [];
    let cursor = 0;
    values.forEach((value, i) => {
      const next = cursor + (value / total) * 100;
      segments.push(`${MUSCLE_PALETTE[i % MUSCLE_PALETTE.length]} ${cursor}% ${next}%`);
      cursor = next;
    });
    return `conic-gradient(${segments.join(",")})`;
  }

  function renderMonthChart(workouts, month) {
    const { days, values } = buildMonthData(workouts, month);
    const max = Math.max(...values, 1);
    return `<div class="home-month-chart-scroll"><div class="home-month-chart" role="img" aria-label="Tempo de treino por dia do mês">
      ${days.map((day, i) => {
        const height = values[i] ? Math.max(10, Math.round((values[i] / max) * 100)) : 3;
        return `<div class="home-month-column"><div class="home-month-value">${values[i] ? formatMinutes(values[i]) : ""}</div><div class="home-month-track"><span style="height:${height}%"></span></div><small>${day}</small></div>`;
      }).join("")}
    </div></div>`;
  }

  function renderMuscleChart(workouts) {
    const data = buildMuscleData(workouts);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (!total) return `<div class="home-chart-empty">Conclua um treino para visualizar a distribuição.</div>`;
    const gradient = donutGradient(data.map(x => x.value), total);
    return `<div class="home-muscle-chart">
      <div class="home-donut-wrap"><div class="home-donut" style="background:${gradient}" role="img" aria-label="Distribuição de ${total} exercícios por grupo muscular"><div><strong>${total}</strong><span>exercícios</span></div></div></div>
      <div class="home-muscle-legend">${data.map((item, i) => {
        const percentage = Math.round((item.value / total) * 100);
        return `<div class="home-legend-row"><span class="home-legend-dot" style="background:${MUSCLE_PALETTE[i % MUSCLE_PALETTE.length]}"></span><span>${escapeHtml(item.label)}</span><strong>${percentage}%</strong></div>`;
      }).join("")}</div>
    </div>`;
  }

  function renderWeeklyGauge(weeklyCount, weeklyTarget) {
    const progress = Math.min(100, Math.round((weeklyCount / weeklyTarget) * 100));
    const angle = -90 + (progress * 1.8);
    return `<section class="home-gauge-card" aria-label="Meta semanal">
      <div class="home-chart-head"><div><span class="eyebrow">META SEMANAL</span><h3>Seu progresso na semana</h3></div><strong class="home-gauge-percent">${progress}%</strong></div>
      <div class="home-gauge-wrap"><div class="home-gauge" style="--gauge-progress:${progress}%;--gauge-angle:${angle}deg" role="img" aria-label="${progress}% da meta semanal concluída"><span class="home-gauge-needle"></span><div class="home-gauge-center"><strong>${weeklyCount}</strong><span>de ${weeklyTarget} treinos</span></div></div></div>
    </section>`;
  }

  function renderHomeModern() {
    if (typeof window.ensurePhase2Data === "function") window.ensurePhase2Data();
    const user = typeof window.getCurrentUser === "function" ? window.getCurrentUser() : null;
    const stored = window.MeuTreinoStorage?.read?.({}) || {};
    const workouts = Array.isArray(stored.workouts) ? stored.workouts : [];
    const todayISO = typeof window.todayISO === "function" ? window.todayISO : () => new Date().toISOString().slice(0, 10);
    const today = todayISO();
    const month = today.slice(0, 7);
    const weeklyTarget = Number(stored.settings?.weeklyGoal) || 4;
    const weekStart = new Date(`${today}T12:00:00`);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    const weekStartISO = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const weeklyCount = workouts.filter(w => w.date >= weekStartISO && w.date <= today).length;
    const monthCount = workouts.filter(w => String(w.date || "").startsWith(month)).length;
    const totalTime = workouts.reduce((sum, w) => sum + (Number(w.totalTime) || 0), 0);
    const recent = workouts[workouts.length - 1] || null;
    const displayName = typeof window.f2DisplayName === "function" ? window.f2DisplayName : value => String(value || "");
    const fmt = typeof window.fmt === "function" ? window.fmt : formatMinutes;

    window.layout(`
      <section class="home-modern-head">
        <div>
          <h2>Olá, ${escapeHtml(user?.name || "")}!</h2>
          <p>Como está seu treino?</p>
        </div>
      </section>

      <section class="home-kpi-grid" aria-label="Indicadores do treino">
        <article class="home-kpi"><strong>${monthCount}</strong><span>Treinos este mês</span></article>
        <article class="home-kpi"><strong>${formatMinutes(totalTime)}</strong><span>Tempo total</span></article>
      </section>

      ${recent ? `<button class="home-recent-row" onclick="showWorkoutDetails('${escapeHtml(recent.id)}')"><span><small>ÚLTIMO TREINO</small><b>${escapeHtml(displayName(recent.type))}</b></span><span>${fmt(recent.totalTime || 0)} · ${recent.completedExercises || 0} exercícios</span></button>` : `<div class="home-empty-row"><span>Ainda não há treinos registrados.</span><button class="primary" onclick="go('trainings')">Começar um treino</button></div>`}

      ${renderWeeklyGauge(weeklyCount, weeklyTarget)}

      <section class="home-chart-card">
        <div class="home-chart-head"><div><span class="eyebrow">DISTRIBUIÇÃO</span><h3>Treinos por grupo muscular</h3></div></div>
        ${renderMuscleChart(workouts)}
      </section>

      <section class="home-chart-card">
        <div class="home-chart-head"><div><span class="eyebrow">ATIVIDADE</span><h3>Tempo de treino por dia do mês</h3></div></div>
        ${renderMonthChart(workouts, month)}
      </section>
    `, "home");
  }

  window.renderHome = renderHomeModern;
})();
