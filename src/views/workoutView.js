import { dateBR, esc, f2DisplayName, fmt, fmtDuration, fmtShort } from "../utils/format.js";
import { noteView, plural, statTileView, subheaderView } from "./components/common.js";
import { mdIcon } from "./components/icons.js";

// Views da execução de treino e da tela de conclusão.
// Os ids exerciseTimer, restTimer e workoutTimer são atualizados pelo controller a cada tique.

function workoutSetsView({sets,count,current}){
  if(!count) return noteView("Configure a quantidade de séries antes de iniciar este exercício.");
  return `
    <div class="workout-set-head" aria-hidden="true"><span>Série</span><span>Reps</span><span>Carga (kg)</span><span></span></div>
    ${sets.map((s,i)=>`
    <div class="workout-set-row${s.done?" is-done":""}${i===current&&!s.done?" is-current":""}">
      <span class="workout-set-num">${s.done?mdIcon("check"):i+1}</span>
      <input class="workout-set-input set-reps" value="${esc(s.reps)}" placeholder="—" disabled aria-label="Repetições da série ${i+1}">
      <input class="workout-set-input set-weight" value="${esc(s.weight)}" placeholder="kg" inputmode="decimal" onchange="setValue(${i},'weight',this.value)" aria-label="Carga em Kg da série ${i+1}">
      <span class="workout-set-status" aria-label="${s.done?"Concluída":"Pendente"}">${mdIcon(s.done?"checkCircle":"radioUnchecked")}</span>
    </div>`).join("")}`;
}

export function workoutView(vm){
  const series=vm.count?vm.series.map(cls=>`<span class="${cls}"></span>`).join(""):"";
  return `
    <div class="m3-page workout">
      ${subheaderView({onBack:"confirmExitWorkout()",backLabel:"Sair do treino",backIcon:"close",overline:"Treino em andamento",title:esc(vm.workoutName),
        trailing:`<span class="workout-clock" title="Tempo total do treino">${mdIcon("timer")}<b id="workoutTimer">${fmt(vm.elapsed)}</b></span>`})}

      <div class="workout-progress-row"><span>Exercício ${vm.exerciseNumber} de ${vm.exerciseTotal}</span><span>${vm.progress}%</span></div>
      <div class="m3-linear-progress" role="progressbar" aria-label="Progresso do treino" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${vm.progress}"><span style="width:${vm.progress}%"></span></div>

      <section class="workout-focus" data-state="${vm.phase}">
        <span class="workout-phase">${mdIcon(vm.phaseIcon)}<span>${vm.phaseLabel}</span></span>
        <p class="workout-section">${esc(vm.section)}</p>
        <h2 class="workout-exercise">${esc(vm.exerciseName)}</h2>
        <div class="workout-prescription">
          <span class="m3-chip">${mdIcon("repeat")}${vm.count?plural(vm.count,"série","séries"):"Séries não configuradas"}</span>
          ${vm.reps?`<span class="m3-chip">${esc(vm.reps)} reps</span>`:""}
        </div>
        <div class="workout-timer" id="exerciseTimer">${fmt(vm.exerciseTimer)}</div>
        ${series?`<div class="workout-series" role="img" aria-label="Série ${vm.setNo} de ${vm.count}, ${vm.doneSets} ${vm.doneSets===1?"concluída":"concluídas"}">${series}</div>`:""}
        <button class="workout-start" onclick="startExerciseTimer()" ${vm.buttonDisabled?"disabled":""}>${mdIcon(vm.buttonIcon)}<span>${vm.buttonLabel}</span></button>
      </section>

      <section class="workout-rest${vm.resting?" is-active":""}">
        <span class="workout-rest-icon">${mdIcon("hourglass")}</span>
        <span class="workout-rest-text">
          <span class="workout-rest-label">Descanso automático</span>
          <span class="workout-rest-hint">${vm.resting?"A próxima série é liberada ao fim do descanso":"Começa sozinho ao terminar cada série"}</span>
        </span>
        <b class="workout-rest-time" id="restTimer">${fmtShort(vm.restSeconds)}</b>
      </section>

      ${vm.lastLoads?noteView(`Último registro: ${vm.lastLoads}`,"history"):""}

      <section class="workout-sets" aria-labelledby="workout-sets-title">
        <h3 id="workout-sets-title" class="workout-sets-title">Séries e carga</h3>
        ${workoutSetsView(vm.setsView)}
      </section>

      ${vm.nextName?`<p class="workout-next">${mdIcon("chevronRight")}<span>A seguir: <b>${esc(vm.nextName)}</b></span></p>`:""}
    </div>`;
}

export function workoutCompletionView(done){
  return `
    <div class="m3-page complete-page">
      <div class="complete-hero">
        <span class="complete-badge" aria-hidden="true">${mdIcon("checkCircle")}</span>
        <p class="complete-overline">Treino finalizado</p>
        <h1 class="complete-title">Excelente trabalho!</h1>
        <p class="complete-text"><b>${esc(f2DisplayName(done.type))}</b> concluído em ${dateBR(done.date)}.</p>
      </div>
      <section class="home-stats" aria-label="Resumo do treino">
        ${statTileView({icon:"timer",value:fmtDuration(done.totalTime),label:"tempo total"})}
        ${statTileView({icon:"logo",iconClass:"md-icon is-dumbbell",value:done.completedExercises,label:done.completedExercises===1?"exercício":"exercícios"})}
        ${statTileView({icon:"repeat",value:done.totalSets,label:done.totalSets===1?"série":"séries"})}
      </section>
      <div class="complete-actions">
        <button class="md-filled-button" onclick="go('calendar')">${mdIcon("calendar")}<span>Ver no calendário</span></button>
        <button class="md-tonal-button" onclick="go('home')">${mdIcon("home")}<span>Voltar ao início</span></button>
      </div>
    </div>`;
}
