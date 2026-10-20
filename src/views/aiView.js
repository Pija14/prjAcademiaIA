import { esc, f2DisplayName } from "../utils/format.js";
import { chipGroup, mdTextField } from "./components/fields.js";
import { mdIcon } from "./components/icons.js";

// Views do planejador de IA: formulário e prévia da sugestão.

const AI_OBJECTIVES=[{value:"hipertrofia",label:"Hipertrofia"},{value:"força",label:"Força"},{value:"condicionamento",label:"Condicionamento"},{value:"saúde geral",label:"Saúde geral"}];
const AI_LEVELS=["Iniciante","Intermediário","Avançado"];
const AI_DAYS=[2,3,4,5,6].map(n=>({value:String(n),label:`${n} dias`}));

function aiModeSwitch(mode){
  const option=(id,icon,label)=>`<button type="button" class="ai-mode-option${mode===id?" is-selected":""}" role="radio" aria-checked="${mode===id}" onclick="setAiPlannerModeUi('${id}')">${mdIcon(mode===id?"check":icon)}<span>${label}</span></button>`;
  return `<div class="ai-mode-switch" role="radiogroup" aria-label="Como criar o treino">${option("describe","sparkle","Descrever objetivo")}${option("photo","camera","Foto da ficha")}</div>`;
}

function aiHeader(){
  return `
      <div class="m3-subheader">
        <button class="md-icon-button" onclick="renderTrainings()" aria-label="Voltar para treinos" title="Voltar">${mdIcon("arrowBack")}</button>
        <div class="m3-subheader-text"><span class="m3-subheader-overline">Treinos</span><h1 class="m3-subheader-title">Planejar com IA</h1></div>
      </div>`;
}

// Modo foto: a IA lê a ficha da academia (até 3 fotos) e transcreve os treinos.
export function aiSheetView(sheet,maxImages=3){
  const thumbs=sheet.images.map((img,i)=>`
    <figure class="ai-sheet-thumb">
      <img src="${img.preview}" alt="Foto ${i+1} da ficha">
      <button type="button" class="md-icon-button ai-sheet-remove" onclick="removeSheetPhoto(${i})" aria-label="Remover foto ${i+1}" title="Remover">${mdIcon("close")}</button>
      <figcaption>Foto ${i+1}</figcaption>
    </figure>`).join("");
  const canAdd=sheet.images.length<maxImages;
  return `
    <div class="m3-page ai-planner">
      ${aiHeader()}
      ${aiModeSwitch("photo")}
      <section class="ai-intro">
        <span class="ai-intro-icon" aria-hidden="true">${mdIcon("docScan")}</span>
        <p>Fotografe a ficha da sua academia. A IA lê os exercícios, séries, repetições e cargas, e você revisa tudo antes de salvar.</p>
      </section>
      <section class="m3-card" aria-labelledby="ai-sheet-title">
        <h2 id="ai-sheet-title" class="m3-card-title">Fotos da ficha <span>${sheet.images.length}/${maxImages}</span></h2>
        ${sheet.images.length?`<div class="ai-sheet-thumbs">${thumbs}</div>`:`
        <div class="ai-sheet-empty">
          <span class="ai-sheet-empty-icon" aria-hidden="true">${mdIcon("photo")}</span>
          <p>Nenhuma foto ainda. Se a ficha tiver frente e verso ou várias folhas, adicione até ${maxImages} fotos.</p>
        </div>`}
        ${canAdd?`
        <div class="ai-sheet-actions">
          <label class="md-filled-button ai-sheet-pick">${mdIcon("camera")}<span>Tirar foto</span>
            <input type="file" accept="image/*" capture="environment" onchange="pickSheetPhoto(this)" class="ai-sheet-input">
          </label>
          <label class="md-outlined-button ai-sheet-pick">${mdIcon("photo")}<span>Galeria</span>
            <input type="file" accept="image/*" multiple onchange="pickSheetPhoto(this)" class="ai-sheet-input">
          </label>
        </div>`:`<p class="ai-sheet-limit">Limite de ${maxImages} fotos atingido. Remova uma para trocar.</p>`}
        <ul class="ai-sheet-tips">
          <li>${mdIcon("check")}<span>Ficha inteira na foto, de frente e sem cortes</span></li>
          <li>${mdIcon("check")}<span>Boa luz, sem sombra e sem reflexo do plástico</span></li>
          <li>${mdIcon("check")}<span>Letra legível: aproxime se a ficha for pequena</span></li>
        </ul>
      </section>
      <section class="m3-card" aria-labelledby="ai-sheet-notes-title">
        <h2 id="ai-sheet-notes-title" class="m3-card-title">Observações <span>opcional</span></h2>
        ${mdTextField({id:"aiSheetNotes",label:"Algo que a IA precisa saber?",value:sheet.notes,multiline:true,hint:"Ex.: a ficha tem treinos A, B e C; ignore os alongamentos.",extra:'maxlength="400"',onInput:"rememberSheetNotes(this.value)"})}
      </section>
      <p class="m3-note">${mdIcon("shield")}<span>As fotos são usadas só para ler a ficha e não ficam salvas no servidor.</span></p>
      <div id="aiPlannerMessage" aria-live="polite"></div>
      <div class="m3-actions">
        <button class="md-text-button" onclick="renderTrainings()">Cancelar</button>
        <button id="aiSheetButton" class="md-filled-button" onclick="readSheetWithAi()" ${sheet.images.length?"":"disabled"}><span class="md-spinner" aria-hidden="true"></span>${mdIcon("sparkle")}<span class="md-button-label">Ler ficha</span></button>
      </div>
    </div>`;
}

export function aiPlannerView(input){
  return `
    <div class="m3-page ai-planner">
      ${aiHeader()}
      ${aiModeSwitch("describe")}
      <section class="ai-intro">
        <span class="ai-intro-icon" aria-hidden="true">${mdIcon("sparkle")}</span>
        <p>Conte seu objetivo e sua rotina. A IA sugere uma ficha completa e você revisa tudo antes de salvar.</p>
      </section>
      <section class="m3-card" aria-labelledby="ai-goal-title">
        <h2 id="ai-goal-title" class="m3-card-title">Seu objetivo</h2>
        ${chipGroup("aiObjective","Objetivo",AI_OBJECTIVES,input.objective)}
        ${chipGroup("aiLevel","Nível",AI_LEVELS,input.level)}
      </section>
      <section class="m3-card" aria-labelledby="ai-routine-title">
        <h2 id="ai-routine-title" class="m3-card-title">Sua rotina</h2>
        ${chipGroup("aiDays","Dias por semana",AI_DAYS,String(input.daysPerWeek))}
        ${mdTextField({id:"aiDuration",label:"Duração por treino",type:"number",icon:"timer",value:String(input.durationMinutes),hint:"Entre 20 e 180 minutos.",suffix:"min",extra:'min="20" max="180" inputmode="numeric"'})}
      </section>
      <section class="m3-card" aria-labelledby="ai-details-title">
        <h2 id="ai-details-title" class="m3-card-title">Detalhes <span>opcional</span></h2>
        ${mdTextField({id:"aiEquipment",label:"Equipamentos disponíveis",value:input.equipment,multiline:true,hint:"Ex.: halteres, banco, barra, academia completa.",extra:'maxlength="400"'})}
        ${mdTextField({id:"aiLimitations",label:"Limitações ou observações",value:input.limitations,multiline:true,hint:"Ex.: desconforto no joelho; evitar impacto.",extra:'maxlength="600"'})}
        ${mdTextField({id:"aiSplit",label:"Preferência de divisão",value:input.splitPreference,multiline:true,hint:"Ex.: superior/inferior ou corpo inteiro.",extra:'maxlength="300"'})}
      </section>
      <p class="m3-note">${mdIcon("info")}<span>A sugestão tem finalidade educacional. Revise exercícios, cargas e limitações com um profissional qualificado.</span></p>
      <div id="aiPlannerMessage" aria-live="polite"></div>
      <div class="m3-actions">
        <button class="md-text-button" onclick="renderTrainings()">Cancelar</button>
        <button id="aiGenerateButton" class="md-filled-button" onclick="generateAiPlan()"><span class="md-spinner" aria-hidden="true"></span>${mdIcon("sparkle")}<span class="md-button-label">Gerar sugestão</span></button>
      </div>
    </div>`;
}

export function aiMessageView(message,isError=false){
  return `<div class="auth-banner auth-banner-${isError?"error":"info"}" role="${isError?"alert":"status"}">${mdIcon(isError?"error":"info")}<span>${esc(message)}</span></div>`;
}

export function aiPlanPreviewView(plan){
  const exercises=plan.groups.reduce((n,g)=>n+g.exercises.length,0);
  const groups=plan.groups.map(g=>`
    <section class="m3-list-section">
      <h2 class="m3-list-heading">${esc(f2DisplayName(g.name))} <span>${g.exercises.length}</span></h2>
      <div class="m3-list">${g.exercises.map((e,i)=>`
        <div class="m3-list-item is-static">
          <span class="details-index">${i+1}</span>
          <span class="m3-list-text">
            <span class="m3-list-title is-wrap">${esc(f2DisplayName(e.name))}</span>
            <span class="m3-list-support">${e.seriesCount} ${e.seriesCount===1?"série":"séries"}${e.sets.some(s=>s.reps)?` · ${esc(e.sets.map(s=>s.reps).join("/"))} reps`:""}${e.sets.some(s=>s.weight)?` · ${esc([...new Set(e.sets.map(s=>s.weight).filter(Boolean))].join("/"))}`:""}${e.equipment?` · ${esc(e.equipment)}`:""}</span>
          </span>
        </div>`).join("")}</div>
    </section>`).join("");
  return `
    <div class="m3-page ai-preview">
      <div class="m3-subheader">
        <button class="md-icon-button" onclick="renderAiPlanner()" aria-label="Alterar dados" title="Alterar dados">${mdIcon("arrowBack")}</button>
        <div class="m3-subheader-text"><span class="m3-subheader-overline">Sugestão da IA</span><h1 class="m3-subheader-title">${esc(f2DisplayName(plan.name))}</h1></div>
      </div>
      <section class="ai-intro is-preview">
        <span class="ai-intro-icon" aria-hidden="true">${mdIcon("sparkle")}</span>
        <div>
          <p>${esc(plan.description)}</p>
          <div class="ai-preview-chips"><span class="m3-chip">${esc(plan.level)}</span><span class="m3-chip">${plan.groups.length} ${plan.groups.length===1?"grupo":"grupos"}</span><span class="m3-chip">${exercises} ${exercises===1?"exercício":"exercícios"}</span></div>
        </div>
      </section>
      ${groups}
      ${(plan.aiNotes||[]).length?`<section class="m3-card"><h2 class="m3-card-title">Observações da IA</h2><ul class="ai-notes">${plan.aiNotes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></section>`:""}
      <p class="m3-note">${mdIcon("info")}<span>${plan.groups.some(g=>g.exercises.some(e=>e.sets.some(s=>s.weight)))?"As cargas da ficha já foram preenchidas. Confira tudo antes de salvar.":"As cargas ficam em branco para serem preenchidas antes de iniciar cada série."}</span></p>
      <div class="m3-actions">
        <button class="md-text-button" onclick="discardAiPlanDraft()">Descartar</button>
        <button class="md-filled-button" onclick="saveAiPlanDraft()">${mdIcon("check")}<span>Salvar em Meus Treinos</span></button>
      </div>
    </div>`;
}
