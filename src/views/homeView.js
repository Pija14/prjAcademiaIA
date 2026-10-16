import { esc, f2EscapeAttr, fmtDuration, pad } from "../utils/format.js";
import { emptyStateView, plural, statTileView } from "./components/common.js";
import { mdIcon } from "./components/icons.js";

// View da tela Início. Recebe um view-model pronto (ver controllers/homeController.js).

const RING_CIRCUMFERENCE=2*Math.PI*26; // r=26 no viewBox 64×64 (≈163,36)

function homeWeekStripView(days){
  return days.map(d=>{
    const cls=[d.done?"is-done":"",d.isToday?"is-today":"",d.future?"is-future":""].filter(Boolean).join(" ");
    const status=d.done?"treinou":d.future?"ainda não chegou":"sem treino";
    return `<li class="${cls}" aria-label="${d.name}, dia ${d.day}${d.isToday?" (hoje)":""}: ${status}"><span class="home-week-label" aria-hidden="true">${d.label}</span><span class="home-week-dot" aria-hidden="true">${d.done?mdIcon("check"):d.day}</span></li>`;
  }).join("");
}

function homeHeroView({week,heroText,suggested,aiReady}){
  const ratio=Math.min(1,week.count/week.goal);
  const primaryAction=suggested
    ? `<button class="md-filled-button home-cta" onclick="startWorkoutById('${f2EscapeAttr(suggested.id)}')">${mdIcon("play")}<span class="home-cta-label">Iniciar ${esc(suggested.name)}</span></button>`
    : `<button class="md-filled-button home-cta" onclick="renderNewWorkout()">${mdIcon("add")}<span>Criar meu primeiro treino</span></button>`;
  const aiAction=aiReady?`<button class="md-tonal-button" onclick="renderAiPlanner()">${mdIcon("sparkle")}<span>Planejar com IA</span></button>`:"";
  return `
      <section class="home-hero${week.reached?" is-complete":""}" aria-labelledby="home-goal-title">
        <div class="home-hero-top">
          <div class="home-ring" role="img" aria-label="${week.count} de ${week.goal} treinos nesta semana">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle class="home-ring-track" cx="32" cy="32" r="26"></circle>
              <circle class="home-ring-value" cx="32" cy="32" r="26" stroke-dasharray="${RING_CIRCUMFERENCE.toFixed(2)}" stroke-dashoffset="${(RING_CIRCUMFERENCE*(1-ratio)).toFixed(2)}"></circle>
            </svg>
            <span class="home-ring-label" aria-hidden="true">${week.reached?mdIcon("trophy"):`<span>${week.count}<small>/${week.goal}</small></span>`}</span>
          </div>
          <div class="home-hero-copy">
            <h2 id="home-goal-title" class="home-hero-title">Meta semanal</h2>
            <p class="home-hero-text">${heroText}</p>
          </div>
        </div>
        <ol class="home-week" aria-label="Treinos nesta semana">${homeWeekStripView(week.days)}</ol>
        <div class="home-hero-actions">${primaryAction}${aiAction}</div>
      </section>`;
}

function homeRecentView(recent){
  if(!recent) return emptyStateView({icon:"logo",title:"Nenhum treino registrado ainda",text:"Quando você concluir um treino, ele aparece aqui com tempo e exercícios."});
  return `
      <button class="home-list-item" onclick="showWorkoutDetails('${f2EscapeAttr(recent.id)}','home')">
        <span class="home-list-icon">${mdIcon("logo")}</span>
        <span class="home-list-text">
          <span class="home-list-title">${esc(recent.name)}</span>
          <span class="home-list-support">${fmtDuration(recent.totalTime)} · ${plural(recent.exercises,"exercício","exercícios")}</span>
        </span>
        <span class="home-list-trailing">${esc(recent.dateLabel)}</span>
        ${mdIcon("chevronRight","md-icon home-list-chevron")}
      </button>`;
}

function homeQuickStartView(workouts){
  if(workouts.length<2) return "";
  return `
    <section class="home-section" aria-labelledby="home-quick-title">
      <div class="home-section-head">
        <h2 id="home-quick-title" class="home-section-title">Seus treinos</h2>
        <button class="md-text-button" onclick="go('trainings')">Ver todos</button>
      </div>
      <div class="home-quick" role="list">
        ${workouts.map(w=>`
          <button class="home-quick-card" role="listitem" onclick="startWorkoutById('${f2EscapeAttr(w.id)}')" aria-label="Iniciar ${f2EscapeAttr(w.name)}, ${plural(w.exercises,"exercício","exercícios")}">
            <span class="home-quick-name">${esc(w.name)}</span>
            <span class="home-quick-meta">${plural(w.exercises,"exercício","exercícios")}</span>
            <span class="home-quick-play" aria-hidden="true">${mdIcon("play")}</span>
          </button>`).join("")}
      </div>
    </section>`;
}

// Gráfico de barras (série única) com dica por barra e tabela equivalente para leitores de tela.
function homeActivityView({days,month,monthName,today}){
  const values=days.map(d=>d.value);
  const max=Math.max(...values,0), total=values.reduce((a,b)=>a+b,0), activeDays=values.filter(Boolean).length;
  const summary=total
    ? `${total} ${total===1?"exercício concluído":"exercícios concluídos"} em ${plural(activeDays,"dia","dias")} de ${monthName}`
    : `Nenhum exercício concluído em ${monthName} até agora`;
  const ticks=new Set([1,8,15,22,days.length]);
  const mm=pad(month+1);
  const bars=days.map(({day,iso,value:v})=>{
    const h=v&&max?Math.max(6,Math.round(v/max*100)):0;
    const tip=v?`${day}/${mm} · ${plural(v,"exercício","exercícios")}`:`${day}/${mm} · sem treino`;
    return `<div class="home-bar${v?"":" is-empty"}${iso===today?" is-today":""}${v&&v===max?" is-max":""}" style="--h:${h}%" data-tip="${tip}" aria-hidden="true">
      <span class="home-bar-fill"></span>
      ${v&&v===max?`<span class="home-bar-value">${v}</span>`:""}
      <span class="home-bar-tick">${ticks.has(day)?day:""}</span>
    </div>`;
  }).join("");
  const rows=days.filter(d=>d.value).map(d=>`<tr><td>${d.day}/${mm}</td><td>${d.value}</td></tr>`).join("");
  return `
      <section class="home-section home-activity" aria-labelledby="home-chart-title">
        <div class="home-section-head">
          <div>
            <h2 id="home-chart-title" class="home-section-title">Atividade em ${monthName}</h2>
            <p class="home-section-support">${summary}</p>
          </div>
        </div>
        ${total?`<div class="home-chart" style="--days:${days.length}" role="img" aria-label="Gráfico de exercícios concluídos por dia. ${summary}.">${bars}</div>`:""}
        ${rows?`<table class="sr-only"><caption>Exercícios concluídos por dia em ${monthName}</caption><thead><tr><th>Dia</th><th>Exercícios</th></tr></thead><tbody>${rows}</tbody></table>`:""}
      </section>`;
}

export function homeView(vm){
  return `
    <div class="home m3-page">
      <header class="home-greeting">
        <p class="home-date">${esc(vm.dateLine)}</p>
        <h1 class="home-title">${vm.greeting}${vm.firstName?`, ${esc(vm.firstName)}`:""}</h1>
      </header>
      ${homeHeroView(vm)}
      <section class="home-stats" aria-label="Resumo">
        ${statTileView({icon:"calendar",value:vm.stats.monthCount,label:`${vm.stats.monthCount===1?"treino":"treinos"} em ${vm.monthName}`})}
        ${statTileView({icon:"timer",value:fmtDuration(vm.stats.totalTime),label:"tempo total"})}
        ${statTileView({icon:"star",value:vm.stats.favorite?esc(vm.stats.favorite):"—",label:vm.stats.favorite?"seu favorito":"sem favorito"})}
      </section>
      <section class="home-section" aria-labelledby="home-recent-title">
        <div class="home-section-head">
          <h2 id="home-recent-title" class="home-section-title">Último treino</h2>
          ${vm.recent?`<button class="md-text-button" onclick="go('history')">Histórico</button>`:""}
        </div>
        ${homeRecentView(vm.recent)}
      </section>
      ${homeQuickStartView(vm.quick)}
      ${homeActivityView(vm.activity)}
    </div>`;
}
