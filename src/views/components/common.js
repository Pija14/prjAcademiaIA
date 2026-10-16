import { mdIcon } from "./icons.js";

// Blocos de layout reutilizados por várias telas.

// Cabeçalho de tela secundária: botão de voltar/fechar, linha de apoio e título.
export function subheaderView({onBack,backLabel="Voltar",backIcon="arrowBack",overline="",title,trailing=""}){
  return `
      <div class="m3-subheader">
        <button class="md-icon-button" onclick="${onBack}" aria-label="${backLabel}" title="${backLabel}">${mdIcon(backIcon)}</button>
        <div class="m3-subheader-text">${overline?`<span class="m3-subheader-overline">${overline}</span>`:""}<h1 class="m3-subheader-title">${title}</h1></div>
        ${trailing}
      </div>`;
}

// Cabeçalho de tela principal (Treinos, Histórico).
export function pageHeaderView(title,support){
  return `
      <header class="m3-page-header">
        <h1 class="m3-page-title">${title}</h1>
        <p class="m3-page-support">${support}</p>
      </header>`;
}

export function emptyStateView({icon,title,text}){
  return `
        <div class="home-empty">
          <span class="home-empty-icon">${mdIcon(icon)}</span>
          <p class="home-empty-title">${title}</p>
          <p class="home-empty-text">${text}</p>
        </div>`;
}

export function noteView(text,icon="info"){ return `<p class="m3-note">${mdIcon(icon)}<span>${text}</span></p>`; }

// Bloco de indicador: ícone, valor e rótulo. iconClass permite girar o halter, por exemplo.
export function statTileView({icon,value,label,iconClass="md-icon"}){
  return `<article class="home-stat"><span class="home-stat-icon">${mdIcon(icon,iconClass)}</span><strong class="home-stat-value">${value}</strong><span class="home-stat-label">${label}</span></article>`;
}

export function plural(n,singular,pluralForm){ return `${n} ${n===1?singular:pluralForm}`; }
