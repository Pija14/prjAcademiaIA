import { esc, f2DisplayName, f2EscapeAttr, fmtDuration } from "../utils/format.js";
import { emptyStateView, noteView, pageHeaderView, plural, statTileView, subheaderView } from "./components/common.js";
import { mdIcon } from "./components/icons.js";

// Views do Histórico e dos Detalhes de um treino concluído.

function historyItemView(item){
  return `<button class="m3-list-item" onclick="showWorkoutDetails('${f2EscapeAttr(item.id)}','history')">
      <span class="history-date"><b>${item.day||"—"}</b><span>${esc(item.weekday)}</span></span>
      <span class="m3-list-text">
        <span class="m3-list-title">${esc(item.name)}</span>
        <span class="m3-list-support">${esc(item.summary)}</span>
      </span>
      ${mdIcon("chevronRight","md-icon m3-list-chevron")}
    </button>`;
}

export function historyView({count,total,groups}){
  return `
    <div class="m3-page history">
      ${pageHeaderView("Histórico",count?`${plural(count,"treino concluído","treinos concluídos")} · ${fmtDuration(total)} no total`:"Seus treinos concluídos aparecem aqui")}
      ${count?groups.map(g=>`<section class="m3-list-section"><h2 class="m3-list-heading">${esc(g.label)} <span>${g.items.length}</span></h2><div class="m3-list">${g.items.map(historyItemView).join("")}</div></section>`).join("")
        :emptyStateView({icon:"history",title:"Nenhum treino concluído",text:"Ao finalizar um treino, ele aparece aqui com data, duração e séries."})}
    </div>`;
}

export function workoutDetailsView({back,fullDate,name,exercisesCount,totalTime,totalSets,exercises}){
  return `
    <div class="m3-page details">
      ${subheaderView({onBack:back,overline:esc(fullDate),title:esc(name)})}
      <section class="home-stats" aria-label="Resumo">
        ${statTileView({icon:"logo",iconClass:"md-icon is-dumbbell",value:exercisesCount,label:exercisesCount===1?"exercício":"exercícios"})}
        ${statTileView({icon:"timer",value:fmtDuration(totalTime),label:"tempo"})}
        ${statTileView({icon:"repeat",value:totalSets,label:totalSets===1?"série":"séries"})}
      </section>
      <section class="m3-list-section" aria-labelledby="details-ex-title">
        <h2 id="details-ex-title" class="m3-list-heading">Exercícios <span>${exercises.length||""}</span></h2>
        ${exercises.length?`<div class="m3-list">${exercises.map((e,i)=>{
          const sets=e.sets||[], doneSets=sets.filter(s=>s.done);
          return `<div class="m3-list-item is-static">
            <span class="details-index${e.completed?" is-done":""}">${e.completed?mdIcon("check"):i+1}</span>
            <span class="m3-list-text">
              <span class="m3-list-title is-wrap">${esc(f2DisplayName(e.name))}</span>
              <span class="m3-list-support">${doneSets.length} de ${sets.length} ${sets.length===1?"série concluída":"séries concluídas"}</span>
              ${doneSets.length?`<span class="details-sets">${doneSets.map(s=>`<span class="m3-chip">${esc(s.reps||"—")} × ${s.weight?esc(s.weight)+" kg":"sem carga"}</span>`).join("")}</span>`:""}
            </span>
          </div>`;}).join("")}</div>`:noteView("Os detalhes dos exercícios não estão disponíveis para este registro.")}
      </section>
    </div>`;
}

// Resumo de uma linha usado nas listas: "52 min · 5 exercícios · 15 séries".
export function workoutSummaryText(w){
  const n=w.completedExercises||0;
  return `${fmtDuration(w.totalTime)} · ${plural(n,"exercício","exercícios")}${w.totalSets?` · ${plural(w.totalSets,"série","séries")}`:""}`;
}
