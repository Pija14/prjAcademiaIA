import { esc, f2EscapeAttr } from "../utils/format.js";
import { noteView, plural } from "./components/common.js";
import { mdIcon } from "./components/icons.js";

// View do Calendário mensal com a lista de treinos do dia selecionado.

function calendarCellView(cell){
  if(cell.blank) return '<span class="cal-cell is-blank" aria-hidden="true"></span>';
  const cls=["cal-cell",cell.count?"has-workout":"",cell.isToday?"is-today":"",cell.selected?"is-selected":"",cell.future?"is-future":""].filter(Boolean).join(" ");
  return `<button class="${cls}" onclick="calendarDay('${cell.iso}')" aria-pressed="${cell.selected}" aria-label="${esc(cell.label)}${cell.isToday?", hoje":""}${cell.count?`, ${plural(cell.count,"treino","treinos")}`:""}"><span class="cal-num">${cell.day}</span>${cell.count?`<span class="cal-dots" aria-hidden="true">${"<i></i>".repeat(Math.min(cell.count,3))}</span>`:""}</button>`;
}

function calendarDayListView(day){
  if(!day) return noteView("Toque em um dia para ver os treinos realizados.");
  return `
        <section class="m3-list-section" aria-live="polite">
          <h2 class="m3-list-heading">${esc(day.label)} <span>${day.items.length||""}</span></h2>
          ${day.items.length?`<div class="m3-list">${day.items.map(w=>`
            <button class="m3-list-item" onclick="showWorkoutDetails('${f2EscapeAttr(w.id)}')">
              <span class="home-list-icon">${mdIcon("logo")}</span>
              <span class="m3-list-text">
                <span class="m3-list-title">${esc(w.name)}</span>
                <span class="m3-list-support">${esc(w.summary)}</span>
              </span>
              ${mdIcon("chevronRight","md-icon m3-list-chevron")}
            </button>`).join("")}</div>`:noteView(day.future?"Este dia ainda não chegou.":"Nenhum treino concluído neste dia.")}
        </section>`;
}

export function calendarView({title,summary,isCurrentMonth,cells,day}){
  return `
    <div class="m3-page calendar-page">
      <header class="cal-header">
        <div class="cal-title-wrap">
          <h1 class="m3-page-title cal-title">${esc(title)}</h1>
          <p class="m3-page-support">${summary}</p>
        </div>
        <div class="cal-nav">
          ${isCurrentMonth?"":`<button class="md-text-button" onclick="calendarToday()">Hoje</button>`}
          <button class="md-icon-button" onclick="changeMonth(-1)" aria-label="Mês anterior" title="Mês anterior">${mdIcon("chevronLeft")}</button>
          <button class="md-icon-button" onclick="changeMonth(1)" aria-label="Próximo mês" title="Próximo mês">${mdIcon("chevronRight")}</button>
        </div>
      </header>
      <section class="cal-card" aria-label="Calendário de ${f2EscapeAttr(title)}">
        <div class="cal-weekdays" aria-hidden="true"><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span><span>D</span></div>
        <div class="cal-grid">${cells.map(calendarCellView).join("")}</div>
      </section>
      ${calendarDayListView(day)}
    </div>`;
}
