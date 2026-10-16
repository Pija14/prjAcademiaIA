import { esc, f2EscapeAttr } from "../../utils/format.js";
import { clearFieldError, mdTextField, setFieldError } from "./fields.js";
import { mdIcon } from "./icons.js";

let mdDialogState=null;

export function openDialog({title,content="",confirmLabel="Confirmar",cancelLabel="Cancelar",destructive=false,sheet=false,showConfirm=true,onConfirm,onOpen}){
  closeDialog();
  const dialog=document.createElement("dialog");
  dialog.className=`md-dialog${sheet?" is-sheet":""}`;
  dialog.setAttribute("aria-labelledby","md-dialog-title");
  dialog.innerHTML=`
    <form class="md-dialog-form" novalidate onsubmit="return mdDialogSubmit(event)">
      ${sheet?'<span class="md-sheet-handle" aria-hidden="true"></span>':""}
      <h2 id="md-dialog-title" class="md-dialog-title">${title}</h2>
      <div class="md-dialog-content">${content}</div>
      <div class="md-dialog-actions">
        <button type="button" class="md-text-button" onclick="closeDialog()">${cancelLabel}</button>
        ${showConfirm?`<button type="submit" class="md-text-button${destructive?" is-destructive":""}">${confirmLabel}</button>`:""}
      </div>
    </form>`;
  dialog.onclick=event=>{ if(event.target===dialog) closeDialog(); };
  dialog.oncancel=event=>{ event.preventDefault(); closeDialog(); };
  document.body.appendChild(dialog);
  mdDialogState={el:dialog,onConfirm,actions:[]};
  dialog.showModal();
  if(onOpen) onOpen(dialog); else dialog.querySelector(".md-field-input")?.focus();
  return dialog;
}

export function mdDialogSubmit(event){
  event.preventDefault();
  const state_=mdDialogState;
  if(!state_) return false;
  const result=state_.onConfirm?state_.onConfirm(state_.el):undefined;
  if(result!==false && mdDialogState===state_) closeDialog();
  return false;
}

export function closeDialog(){
  if(!mdDialogState) return;
  const {el}=mdDialogState;
  mdDialogState=null;
  if(el.open) el.close();
  el.remove();
}

export function confirmDialog({title,text,confirmLabel="Confirmar",destructive=false,onConfirm}){
  openDialog({title,content:`<p class="md-dialog-text">${text}</p>`,confirmLabel,destructive,onConfirm,onOpen:d=>d.querySelector('[type="submit"]')?.focus()});
}

export function promptDialog({title,label,value="",hint="",confirmLabel="Salvar",suggestions=[],validate,onConfirm}){
  const chips=suggestions.length?`<div class="md-dialog-suggestions" aria-label="Sugestões">${suggestions.map(s=>`<button type="button" class="m3-chip m3-suggestion-chip" data-value="${f2EscapeAttr(s)}" onclick="fillDialogField(this.dataset.value)">${esc(s)}</button>`).join("")}</div>`:"";
  openDialog({title,confirmLabel,content:`${mdTextField({id:"md-dialog-field",label,value,hint,extra:'maxlength="80" autocomplete="off"'})}${chips}`,
    onConfirm:()=>{
      const input=document.getElementById("md-dialog-field");
      const text=input.value.trim();
      const error=validate?validate(text):(!text?"Preencha este campo.":"");
      if(error){ setFieldError("md-dialog-field",error); input.focus(); return false; }
      return onConfirm(text);
    }});
}

export function fillDialogField(value){ const input=document.getElementById("md-dialog-field"); if(!input) return; input.value=value; clearFieldError(input); input.focus(); }

export function actionSheet({title,actions}){
  openDialog({title,sheet:true,showConfirm:false,cancelLabel:"Fechar",
    content:`<div class="md-sheet-actions">${actions.map((a,i)=>`<button type="button" class="md-sheet-action${a.destructive?" is-destructive":""}" ${a.disabled?"disabled":""} onclick="mdSheetAction(${i})">${mdIcon(a.icon)}<span>${a.label}</span></button>`).join("")}</div>`,
    onOpen:d=>d.querySelector(".md-sheet-action:not(:disabled)")?.focus()});
  mdDialogState.actions=actions;
}

export function mdSheetAction(index){
  const action=mdDialogState?.actions?.[index];
  closeDialog();
  if(action&&!action.disabled) action.onSelect();
}
