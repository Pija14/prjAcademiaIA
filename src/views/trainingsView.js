import { esc, f2EscapeAttr } from "../utils/format.js";
import { emptyStateView, noteView, pageHeaderView, plural } from "./components/common.js";
import { mdIcon } from "./components/icons.js";

// View da lista de treinos. Recebe cartões já calculados pelo controller.

function workoutCardView(card){
  const id=f2EscapeAttr(card.id), name=card.name;
  return `
    <article class="training-card-m3" onclick="startWorkoutById('${id}')">
      <div class="training-card-top">
        <span class="training-card-icon" aria-hidden="true">${mdIcon("logo")}</span>
        <div class="training-card-text">
          <h2 class="training-card-title">${esc(name)}</h2>
          <p class="training-card-meta">${plural(card.exercises,"exercício","exercícios")} · ${plural(card.sets,"série","séries")}</p>
        </div>
        <button class="md-icon-button training-card-delete" onclick="event.stopPropagation();deleteMyWorkout('${id}')" aria-label="Excluir treino ${f2EscapeAttr(name)}" title="Excluir treino">${mdIcon("delete")}</button>
      </div>
      ${card.groups.length?`<div class="training-card-chips">${card.groups.slice(0,4).map(g=>`<span class="m3-chip">${esc(g)}</span>`).join("")}${card.groups.length>4?`<span class="m3-chip">+${card.groups.length-4}</span>`:""}</div>`:""}
      <div class="training-card-foot">
        <span class="training-card-last">${mdIcon("history")}${esc(card.lastLabel)}</span>
        <div class="training-card-actions">
          <button class="md-outlined-button" onclick="event.stopPropagation();editMyWorkout('${id}')" aria-label="Editar treino ${f2EscapeAttr(name)}">${mdIcon("edit")}<span>Editar</span></button>
          <button class="md-filled-button training-card-start" onclick="event.stopPropagation();startWorkoutById('${id}')" aria-label="Iniciar treino ${f2EscapeAttr(name)}">${mdIcon("play")}<span>Iniciar</span></button>
        </div>
      </div>
    </article>`;
}

export function trainingsView({cards,aiReady}){
  const aiAction=aiReady
    ? `<button class="trainings-ai" onclick="renderAiPlanner()">
        <span class="trainings-ai-icon" aria-hidden="true">${mdIcon("sparkle")}</span>
        <span class="trainings-ai-text"><b>Planejar com IA</b><span>Crie um treino sob medida em segundos</span></span>
        ${mdIcon("chevronRight","md-icon trainings-ai-chevron")}
      </button>`
    : noteView("Planejamento com IA indisponível no momento.");
  return `
    <div class="m3-page trainings">
      ${pageHeaderView("Treinos",cards.length?plural(cards.length,"treino ativo","treinos ativos"):"Monte sua rotina de treinos")}
      ${aiAction}
      ${cards.length?`<div class="trainings-list">${cards.map(workoutCardView).join("")}</div>`:emptyStateView({icon:"logo",title:"Nenhum treino ativo",text:"Crie seu primeiro treino com os exercícios e séries que você costuma fazer."})}
      <button class="m3-fab" onclick="renderNewWorkout()">${mdIcon("add")}<span>Novo treino</span></button>
    </div>`;
}
