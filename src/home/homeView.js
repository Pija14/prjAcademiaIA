/* Meu Treino — Home visual refresh only. No business/data mutations. */
(function () {
  const originalRenderHome = window.renderHome;
  if (typeof originalRenderHome !== "function") return;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[m]));
  }

  function weekdayIndex(iso) {
    if (!iso) return -1;
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? -1 : (d.getDay() + 6) % 7;
  }

  function formatMinutes(seconds) {
    const minutes = Math.round(Math.max(0, Number(seconds) || 0) / 60);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  function buildWeekdayData(workouts) {
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const values = Array(7).fill(0);
    workouts.forEach(w => {
      const index = weekdayIndex(w.date);
      if (index >= 0) values[index] += Number(w.totalTime) || 0;
    });
    return { labels, values };
  }

  function buildMuscleData(workouts) {
    const totals = new Map();
    workouts.forEach(workout => {
      const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
      exercises.forEach(exercise => {
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

  function donutGradient(values, total) {
    if (!total) return "conic-gradient(#e9eef2 0 100%)";
    const segments = [];
    let cursor = 0;
    const palette = ["#22c55e", "#15803d", "#166534", "#65a30d", "#0f766e", "#2563eb", "#64748b"];
    values.forEach((value, i) => {
      const next = cursor + (value / total) * 100;
      segments.push(`${palette[i % palette.length]} ${cursor}% ${next}%`);
      cursor = next;
    });
    return `conic-gradient(${segments.join(",")})`;
  }

  function renderWeekdayChart(workouts) {
    const { labels, values } = buildWeekdayData(workouts);
    const max = Math.max(...values, 1);
    return `<div class="home-week-chart" role="img" aria-label="Tempo de treino por dia da semana">
      ${labels.map((label, i) => {
        const height = values[i] ? Math.max(10, Math.round((values[i] / max) * 100)) : 4;
        return `<div class="home-week-column"><div class="home-week-value">${values[i] ? formatMinutes(values[i]) : ""}</div><div class="home-week-track"><span style="height:${height}%"></span></div><small>${label}</small></div>`;
      }).join("")}
    </div>`;
  }

  function renderMuscleChart(workouts) {
    const data = buildMuscleData(workouts);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (!total) return `<div class="home-chart-empty">Conclua um treino para visualizar a distribuição.</div>`;
    const gradient = donutGradient(data.map(x => x.value), total);
    const palette = ["#22c55e", "#15803d", "#166534", "#65a30d", "#0f766e", "#2563eb", "#64748b"];
    return `<div class="home-muscle-chart">
      <div class="home-donut-wrap"><div class="home-donut" style="background:${gradient}" role="img" aria-label="Distribuição de treinos por grupo muscular"><div><strong>${total}</strong><span>exercícios</span></div></div></div>
      <div class="home-muscle-legend">${data.map((item, i) => `<div class="home-legend-row"><span class="home-legend-dot" style="background:${palette[i % palette.length]}"></span><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong></div>`).join("")}</div>
    </div>`;
  }

  function renderHomeModern() {
    if (typeof window.ensurePhase2Data === "function") window.ensurePhase2Data();
    const user = typeof window.getCurrentUser === "function" ? window.getCurrentUser() : null;
    const stored = window.MeuTreinoStorage?.read?.({}) || {};
    const workouts = Array.isArray(stored.workouts) ? stored.workouts : [];
    const todayISO = typeof window.todayISO === "function" ? window.todayISO : () => new Date().toISOString().slice(0, 10);
    const today = todayISO();
    const month = today.slice(0, 7);
    const weekStart = new Date(`${today}T12:00:00`);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    const weekStartISO = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const weeklyTarget = Number(stored.settings?.weeklyGoal) || 4;
    const weeklyCount = workouts.filter(w => w.date >= weekStartISO && w.date <= today).length;
    const monthCount = workouts.filter(w => String(w.date || "").startsWith(month)).length;
    const totalTime = workouts.reduce((sum, w) => sum + (Number(w.totalTime) || 0), 0);
    const progress = Math.min(100, Math.round((weeklyCount / weeklyTarget) * 100));
    const recent = workouts[workouts.length - 1] || null;
    const byType = (Array.isArray(stored.myWorkouts) ? stored.myWorkouts : []).map(w => ({ name: w.name, total: workouts.filter(x => x.workoutId === w.id).length }));
    const favorite = byType.sort((a, b) => b.total - a.total)[0] || null;
    const displayName = typeof window.f2DisplayName === "function" ? window.f2DisplayName : value => String(value || "");
    const fmt = typeof window.fmt === "function" ? window.fmt : formatMinutes;

    window.layout(`
      <section class="home-modern-head">
        <div>
          <span class="eyebrow">MEU TREINO</span>
          <h2>Olá, ${escapeHtml(user?.name || "")}!</h2>
          <p>Como está seu treino?</p>
        </div>
      </section>

      <section class="home-kpi-grid" aria-label="Indicadores do treino">
        <article class="home-kpi"><strong>${monthCount}</strong><span>Treinos este mês</span></article>
        <article class="home-kpi"><strong>${progress}%</strong><span>Meta semanal</span><small>${weeklyCount} de ${weeklyTarget}</small></article>
        <article class="home-kpi"><strong>${formatMinutes(totalTime)}</strong><span>Tempo total</span></article>
        <article class="home-kpi"><strong>${favorite ? escapeHtml(favorite.name) : "—"}</strong><span>Treino mais realizado</span></article>
      </section>

      ${recent ? `<button class="home-recent-row" onclick="showWorkoutDetails('${escapeHtml(recent.id)}')"><span><small>ÚLTIMO TREINO</small><b>${escapeHtml(displayName(recent.type))}</b></span><span>${fmt(recent.totalTime || 0)} · ${recent.completedExercises || 0} exercícios</span></button>` : `<div class="home-empty-row"><span>Ainda não há treinos registrados.</span><button class="primary" onclick="go('trainings')">Começar um treino</button></div>`}

      <section class="home-chart-card">
        <div class="home-chart-head"><div><span class="eyebrow">ATIVIDADE</span><h3>Tempo de treino por dia da semana</h3></div></div>
        ${renderWeekdayChart(workouts)}
      </section>

      <section class="home-chart-card">
        <div class="home-chart-head"><div><span class="eyebrow">DISTRIBUIÇÃO</span><h3>Treinos por grupo muscular</h3></div></div>
        ${renderMuscleChart(workouts)}
      </section>
    `, "home");
  }

  window.renderHome = renderHomeModern;
})();
