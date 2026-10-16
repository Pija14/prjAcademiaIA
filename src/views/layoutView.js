import { esc } from "../utils/format.js";
import { mdIcon } from "./components/icons.js";

const NAV_ITEMS=[
  {page:"home",label:"Início",icon:"home",activeIcon:"homeFilled"},
  {page:"calendar",label:"Calendário",icon:"calendar",activeIcon:"calendarFilled"},
  {page:"trainings",label:"Treinos",icon:"logo",activeIcon:"logo"},
  {page:"history",label:"Histórico",icon:"history",activeIcon:"history"}
];

export function layout(content, active="home"){
  const navActive = (active === "training-edit" || active === "training-new") ? "trainings" : active;
  const app=document.getElementById("app");
  if(!app) throw new Error("Elemento #app não encontrado.");
  const nav=NAV_ITEMS.map(item=>{
    const on=navActive===item.page;
    return `<button class="${on?"active":""}" onclick="go('${item.page}')" ${on?'aria-current="page"':""}><span class="nav-indicator" aria-hidden="true">${mdIcon(on?item.activeIcon:item.icon,`md-icon${item.page==="trainings"?" nav-icon-dumbbell":""}`)}</span><span class="nav-label">${item.label}</span></button>`;
  }).join("");
  app.innerHTML = `
  <div class="shell page-${esc(active)}">
    <header class="topbar md-top-app-bar">
      <div class="topbar-brand"><span class="topbar-logo" aria-hidden="true">${mdIcon("logo")}</span><span class="topbar-title">Meu Treino</span></div>
      <div class="topbar-actions"><button class="md-icon-button" onclick="openSettings()" aria-label="Configurações" title="Configurações">${mdIcon("settings")}</button></div>
    </header>
    <main>${content}</main>
    <nav class="bottomnav md-navigation-bar" aria-label="Navegação principal">${nav}</nav>
  </div>`;
}
