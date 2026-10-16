export function uid(prefix="id"){ return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`; }

export function normalizeEmail(value){ return String(value || "").trim().toLowerCase(); }

export function pad(n){ return String(n).padStart(2,"0"); }

export function fmt(sec){ sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}:${pad(sec%60)}`; }

export function fmtShort(sec){ sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/60))}:${pad(sec%60)}`; }

export function esc(s){ return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;", ">":"&gt;", '"':"&quot;","'":"&#039;"}[m])); }

export function todayISO(){ return new Date().toISOString().slice(0,10); }

export function dateBR(iso){ if(!iso)return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }

export function monthLabel(y,m){ return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m,1)); }

export function isoDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

export function fmtDuration(sec){
  sec=Math.max(0,Math.round(sec||0));
  if(sec>0&&sec<60) return "menos de 1 min";
  const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60);
  return h?`${h}h${m?` ${m}min`:""}`:`${m} min`;
}

export function relativeDayLabel(iso){
  if(!iso) return "";
  const today=new Date(); today.setHours(0,0,0,0);
  const [y,m,d]=iso.split("-").map(Number);
  const diff=Math.round((today-new Date(y,m-1,d))/86400000);
  if(diff===0) return "Hoje";
  if(diff===1) return "Ontem";
  if(diff>1&&diff<7) return new Intl.DateTimeFormat("pt-BR",{weekday:"long"}).format(new Date(y,m-1,d)).replace(/^./,c=>c.toUpperCase());
  return `${pad(d)}/${pad(m)}`;
}

export function cloneJSON(x){ return JSON.parse(JSON.stringify(x)); }

export function f2EscapeAttr(s){ return esc(String(s)).replace(/`/g,"&#96;"); }

const NAME_MINOR_WORDS=new Set(["e","de","da","do","das","dos","com","em","na","no","nas","nos","a","o","as","os","ao","aos","à","às","para","por","ou","sem"]);

export function f2DisplayName(value){
  const text=String(value??"").trim().replace(/\s+/g," ");
  if(!text) return "";
  // Nomes digitados todos em maiúsculas não permitem distinguir siglas; nos demais, "ART" e "TRX" são preservados.
  const allCaps=text===text.toLocaleUpperCase("pt-BR");
  return text.split(" ").map((word,i)=>{
    if(!allCaps && word.length>1 && /\p{L}/u.test(word) && word===word.toLocaleUpperCase("pt-BR")) return word;
    const lower=word.toLocaleLowerCase("pt-BR");
    if(i>0 && NAME_MINOR_WORDS.has(lower)) return lower;
    return lower.replace(/(^|[-/(])(\p{L})/gu,(_,sep,ch)=>sep+ch.toLocaleUpperCase("pt-BR"));
  }).join(" ");
}

export function capitalize(text){ return String(text||"").replace(/^./,c=>c.toUpperCase()); }
