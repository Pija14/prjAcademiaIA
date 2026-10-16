import { esc, f2EscapeAttr } from "../../utils/format.js";
import { mdIcon } from "./icons.js";

export function mdTextField({id,label,type="text",icon="",value="",hint="",extra="",multiline=false,suffix="",onInput=""}){
  const cls=["md-field",icon?"":"no-leading",multiline?"is-multiline":"",suffix?"has-suffix":""].filter(Boolean).join(" ");
  const handler=`clearFieldError(this)${onInput?";"+onInput:""}`;
  const input=multiline
    ?`<textarea id="${id}" class="md-field-input" placeholder=" " rows="3" aria-describedby="${id}-support" aria-invalid="false" oninput="${handler}" ${extra}>${esc(value)}</textarea>`
    :`<input id="${id}" class="md-field-input" type="${type}" value="${f2EscapeAttr(value)}" placeholder=" " aria-describedby="${id}-support" aria-invalid="false" oninput="${handler}" ${extra}>`;
  return `
    <div class="${cls}">
      <div class="md-field-box">
        ${icon?mdIcon(icon,"md-icon md-field-leading"):""}
        ${input}
        <label class="md-field-label" for="${id}">${label}</label>
        ${suffix?`<span class="md-field-suffix" aria-hidden="true">${suffix}</span>`:""}
      </div>
      <p id="${id}-support" class="md-field-support" data-hint="${f2EscapeAttr(hint)}">${esc(hint)}</p>
    </div>`;
}

export function chipGroup(id,label,options,value){
  return `
    <div class="m3-chip-field">
      <span class="m3-chip-field-label" id="${id}-label">${label}</span>
      <input type="hidden" id="${id}" value="${f2EscapeAttr(value)}">
      <div class="m3-chip-set" role="radiogroup" aria-labelledby="${id}-label">
        ${options.map(o=>{ const v=typeof o==="object"?o.value:o, t=typeof o==="object"?o.label:o, on=String(v)===String(value);
          return `<button type="button" class="m3-filter-chip${on?" is-selected":""}" role="radio" aria-checked="${on}" data-target="${id}" data-value="${f2EscapeAttr(v)}" onclick="selectChip(this)">${mdIcon("check","md-icon m3-filter-chip-check")}<span>${esc(t)}</span></button>`; }).join("")}
      </div>
    </div>`;
}

export function selectChip(button){
  const input=document.getElementById(button.dataset.target);
  if(!input) return;
  input.value=button.dataset.value;
  button.parentElement.querySelectorAll(".m3-filter-chip").forEach(chip=>{
    const on=chip===button;
    chip.classList.toggle("is-selected",on);
    chip.setAttribute("aria-checked",String(on));
  });
}

export function stepNumber(id,delta,min,max){
  const input=document.getElementById(id); if(!input) return;
  const current=Number.parseInt(input.value,10);
  input.value=String(Math.min(max,Math.max(min,(Number.isFinite(current)?current:min)+delta)));
  clearFieldError(input);
}

export function setFieldError(id,message){
  const input=document.getElementById(id);
  const field=input?.closest(".md-field");
  const support=document.getElementById(`${id}-support`);
  if(!field) return;
  field.classList.toggle("is-error",!!message);
  input.setAttribute("aria-invalid",message?"true":"false");
  if(support) support.textContent=message||support.dataset.hint||"";
}

export function clearFieldError(input){ if(input?.id) setFieldError(input.id,""); }

// Campo numérico com botões − e +. Usado nas Configurações e no diálogo de séries.
export function numberStepperView({id,label,value,hint="",step=1,min,max,suffix="",unitLabel=""}){
  const what=`${label.toLowerCase()}${unitLabel?` em ${step} ${unitLabel}`:""}`;
  return `
    <div class="settings-stepper">
      <button type="button" class="md-icon-button settings-step" onclick="stepNumber('${id}',${-step},${min},${max})" aria-label="Diminuir ${what}">${mdIcon("remove")}</button>
      ${mdTextField({id,label,type:"number",value:String(value),hint,suffix,extra:`min="${min}" max="${max}" step="1" inputmode="numeric" autocomplete="off"`})}
      <button type="button" class="md-icon-button settings-step" onclick="stepNumber('${id}',${step},${min},${max})" aria-label="Aumentar ${what}">${mdIcon("add")}</button>
    </div>`;
}
