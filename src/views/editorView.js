import { esc, f2DisplayName, f2EscapeAttr } from "../utils/format.js";
import { emptyStateView, noteView, plural, subheaderView } from "./components/common.js";
import { chipGroup, mdTextField, numberStepperView } from "./components/fields.js";
import { mdIcon } from "./components/icons.js";

// Views de criação e edição de treinos, incluindo o conteúdo dos diálogos do editor.

export function newWorkoutView(levels){
  return `
    <div class="m3-page editor">
      ${subheaderView({onBack:"go('trainings')",overline:"Meus Treinos",title:"Novo treino"})}
      <section class="m3-card">
        <h2 class="m3-card-title">Informações básicas</h2>
        ${mdTextField({id:"newWorkoutName",label:"Nome do treino",hint:"Ex.: Peito e Tríceps.",extra:'maxlength="80" autocomplete="off" required'})}
        ${mdTextField({id:"newWorkoutDescription",label:"Descrição",multiline:true,hint:"Opcional.",extra:'maxlength="180"'})}
        ${chipGroup("newWorkoutLevel","Nível",levels,"Básico")}
      </section>
      ${noteView("Depois de criar o treino, você adiciona os grupos musculares e os exercícios.")}
      <button class="md-filled-button" onclick="createMyWorkoutFromForm()">${mdIcon("add")}<span>Criar treino</span></button>
    </div>`;
}

function editorExerciseView(wid,gid,e,index){
  const eid=f2EscapeAttr(e.id);
  return `<div class="m3-list-item is-static editor-ex">
          <button class="editor-ex-main" onclick="configureMyExercise('${wid}','${gid}','${eid}')" aria-label="Editar séries de ${f2EscapeAttr(e.name)}">
            <span class="details-index">${index+1}</span>
            <span class="m3-list-text">
              <span class="m3-list-title is-wrap">${esc(e.name)}</span>
              <span class="m3-list-support">${e.count?plural(e.count,"série","séries"):'<span class="editor-warn">Séries não configuradas</span>'}${e.reps?` · ${esc(e.reps)} reps`:""}${e.equipment?` · ${esc(e.equipment)}`:""}</span>
            </span>
          </button>
          <button class="md-icon-button" onclick="openExerciseMenu('${wid}','${gid}','${eid}')" aria-label="Ações do exercício ${f2EscapeAttr(e.name)}" title="Ações do exercício">${mdIcon("moreVert")}</button>
        </div>`;
}

function editorGroupView(wid,g,index){
  const gid=f2EscapeAttr(g.id);
  return `
    <section class="editor-group" aria-label="${f2EscapeAttr(g.name)}">
      <header class="editor-group-head">
        <div class="editor-group-text">
          <h3>${esc(g.name)}</h3>
          <p>${plural(g.exercises.length,"exercício","exercícios")} · ${plural(g.sets,"série","séries")}</p>
        </div>
        <button class="md-icon-button" onclick="openGroupMenu('${wid}','${gid}',${index})" aria-label="Ações do grupo ${f2EscapeAttr(g.name)}" title="Ações do grupo">${mdIcon("moreVert")}</button>
      </header>
      ${g.exercises.length?`<div class="m3-list">${g.exercises.map((e,i)=>editorExerciseView(wid,gid,e,i)).join("")}</div>`:noteView("Nenhum exercício neste grupo ainda.")}
      <button class="md-text-button editor-add-ex" onclick="addExerciseToMyGroup('${wid}','${gid}')">${mdIcon("add")}<span>Adicionar exercício</span></button>
    </section>`;
}

export function workoutEditorView({id,title,name,description,level,levels,groups}){
  const wid=f2EscapeAttr(id);
  return `
    <div class="m3-page editor">
      ${subheaderView({onBack:"go('trainings')",overline:"Editar treino",title:esc(title)})}
      <section class="m3-card">
        <h2 class="m3-card-title">Informações</h2>
        ${mdTextField({id:"f2Name",label:"Nome do treino",value:name,extra:'maxlength="80" autocomplete="off"'})}
        ${mdTextField({id:"f2Desc",label:"Descrição",value:description,multiline:true,hint:"Opcional.",extra:'maxlength="180"'})}
        ${chipGroup("f2Level","Nível",levels,level)}
      </section>
      <div class="editor-groups-head">
        <h2 class="m3-list-heading">Grupos musculares <span>${groups.length||""}</span></h2>
        <button class="md-tonal-button is-small" onclick="addMyGroup('${wid}')">${mdIcon("add")}<span>Adicionar grupo</span></button>
      </div>
      ${groups.length?groups.map((g,i)=>editorGroupView(wid,g,i)).join(""):emptyStateView({icon:"logo",title:"Nenhum grupo muscular",text:"Comece adicionando um grupo, como Peito ou Costas, e depois os exercícios."})}
      <button class="md-filled-button" onclick="saveMyWorkoutHeader('${wid}')">${mdIcon("check")}<span>Salvar treino</span></button>
    </div>`;
}

// Conteúdo do diálogo "Adicionar exercício": campo de busca e área de resultados.
export function exercisePickerView(){
  return `${mdTextField({id:"exercise-picker-search",label:"Buscar ou digitar exercício",icon:"search",onInput:"filterExercisePicker(this.value)",extra:'autocomplete="off" maxlength="100" onkeydown="if(event.key===\'Enter\'){event.preventDefault();chooseExercisePicker(0);}"'})}<div id="exercise-picker-results" class="exercise-picker-results" role="listbox" aria-label="Exercícios"></div>`;
}

export function exercisePickerResultsView(matches,query,canCreate){
  const items=matches.map((e,i)=>`<button type="button" class="md-sheet-action" role="option" onclick="chooseExercisePicker(${i})">${mdIcon("logo","md-icon is-dumbbell")}<span class="exercise-picker-text"><b>${esc(f2DisplayName(e.name))}</b><small>${esc(f2DisplayName(e.section||""))}${e.sets?` · ${esc(String(e.sets))} séries`:""}${e.reps?` · ${esc(String(e.reps))} reps`:""}</small></span></button>`);
  if(canCreate) items.push(`<button type="button" class="md-sheet-action is-create" role="option" onclick="chooseExercisePicker(-1)">${mdIcon("add")}<span class="exercise-picker-text"><b>Criar “${esc(query)}”</b><small>Exercício personalizado</small></span></button>`);
  return items.join("")||noteView("Digite o nome do exercício.");
}

// Conteúdo do diálogo de séries e repetições de um exercício.
export function exerciseSetsDialogView(count,reps){
  return `
      ${numberStepperView({id:"exercise-sets",label:"Séries",value:count,hint:"Entre 1 e 20.",step:1,min:1,max:20})}
      ${mdTextField({id:"exercise-reps",label:"Repetições por série",value:reps,hint:"Ex.: 12 ou 12/10/8. Aplicado a todas as séries.",extra:'maxlength="30" autocomplete="off"'})}`;
}
