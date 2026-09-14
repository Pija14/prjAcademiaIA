
/* =========================================================
   BIBLIOTECA DE EXERCÃCIOS - IndexedDB
   ========================================================= */
const EX_DB_NAME = "PrjAcademiaDB";
const EX_DB_VERSION = 2;
const EX_STORE = "exercicios";
const WORKOUT_STORE = "treino_exercicios";

function openExerciseDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EX_DB_NAME, EX_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EX_STORE)) {
        const store = db.createObjectStore(EX_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("nome", "nome", { unique: false });
        store.createIndex("ativo", "ativo", { unique: false });
      }
      if (!db.objectStoreNames.contains(WORKOUT_STORE)) {
        const store = db.createObjectStore(WORKOUT_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("exerciseId", "exerciseId", { unique: false });
        store.createIndex("treinoId", "treinoId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function exerciseDBGetAll() {
  const db = await openExerciseDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EX_STORE, "readonly");
    const req = tx.objectStore(EX_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function exerciseDBSave(exercise) {
  const db = await openExerciseDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EX_STORE, "readwrite");
    const store = tx.objectStore(EX_STORE);
    const req = store.put({
      ...exercise,
      nome: String(exercise.nome || exercise.name || "").trim(),
      ativo: exercise.ativo !== false,
      atualizadoEm: new Date().toISOString()
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function exerciseDBSeedFromCurrentData() {
  const existing = await exerciseDBGetAll();
  if (existing.length) return existing;

  // Tenta localizar arrays de exercÃ­cios jÃ¡ utilizados pelo aplicativo.
  const candidates = [
    window.exercises, window.exercicios, window.exerciseList,
    window.workoutExercises, window.treinoExercicios
  ];
  let source = candidates.find(Array.isArray) || [];

  const normalized = source.map((e, i) => {
    if (typeof e === "string") return { nome: e, ativo: true };
    return {
      ...e,
      nome: e.nome || e.name || e.titulo || `ExercÃ­cio ${i + 1}`,
      ativo: e.ativo !== false
    };
  }).filter(e => e.nome);

  for (const e of normalized) await exerciseDBSave(e);

  return exerciseDBGetAll();
}

async function exerciseLibrarySearch(term = "") {
  const all = await exerciseDBGetAll();
  const t = term.trim().toLowerCase();
  return all
    .filter(e => e.ativo !== false)
    .filter(e => !t || String(e.nome).toLowerCase().includes(t))
    .sort((a,b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

async function salvarNovoExercicio(nome, dados = {}) {
  const nomeLimpo = String(nome || "").trim();
  if (!nomeLimpo) throw new Error("Informe o nome do exercÃ­cio.");

  const all = await exerciseDBGetAll();
  const existente = all.find(e => String(e.nome).trim().toLowerCase() === nomeLimpo.toLowerCase());

  if (existente) {
    await exerciseDBSave({ ...existente, ...dados, nome: existente.nome });
    return existente;
  }

  const id = await exerciseDBSave({
    nome: nomeLimpo,
    grupoMuscular: dados.grupoMuscular || dados.grupo || "",
    equipamento: dados.equipamento || "",
    ativo: true
  });

  return (await exerciseDBGetAll()).find(e => e.id === id);
}

window.ExerciseLibrary = {
  list: exerciseDBGetAll,
  search: exerciseLibrarySearch,
  save: exerciseDBSave,
  create: salvarNovoExercicio,
  seed: exerciseDBSeedFromCurrentData
};

document.addEventListener("DOMContentLoaded", () => {
  exerciseDBSeedFromCurrentData().catch(err => console.warn("Biblioteca de exercÃ­cios:", err));
});


// === Regras de execuÃ§Ã£o do treino ===
const DEFAULT_REST_SECONDS = 30;
let restAlertTriggered = false;

function exerciseReadyForStart(exercise) {
  // A validaÃ§Ã£o Ã© feita SOMENTE para a sÃ©rie que serÃ¡ executada agora.
  const count = exerciseSetCount(exercise);
  if (!count) return {ok:false, message:"Informe o nÃºmero de sÃ©ries deste exercÃ­cio."};

  const ex = state.workout?.exercises?.[state.exerciseIndex];
  if (!ex) return {ok:false, message:"ExercÃ­cio invÃ¡lido."};

  const idx = Math.min(Math.max(state.currentSetIndex, 0), count - 1);
  const set = ex.sets?.[idx] || {reps:"", weight:"", done:false};
  const weight = String(set.weight ?? "").trim();
  const reps = String(set.reps ?? "").trim();

  if (!weight) return {ok:false, message:`Informe a carga da sÃ©rie ${idx + 1} antes de iniciar.`};
  if (!reps) return {ok:false, message:`Informe as repetiÃ§Ãµes da sÃ©rie ${idx + 1} antes de iniciar.`};
  return {ok:true, index:idx};
}

function notifyOneMinuteRest() {
  try {
    if ("vibrate" in navigator) navigator.vibrate([250, 120, 250]);
  } catch (_) {}
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.18;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close?.(); }, 500);
    }
  } catch (_) {}
}

const REST_SECONDS = 30;
const TRAININGS = {
  A: {
    name: "Treino A",
    muscles: ["Costas", "BÃ­ceps", "Abdominais"],
    sections: [
      {name:"Costas", exercises:[
        ["Puxador frente","4","12/12/8/8"],
        ["Crucifixo inverso","",""],
        ["ExtensÃ£o lombar","",""],
        ["MÃ¡quina remo ART","4","8"],
        ["Pull down","",""],
        ["Pull-over","",""],
        ["Puxador triangular ART","4","12/12/8/8"],
        ["MÃ¡quina remo ART aberta","4","8"]
      ]},
      {name:"BÃ­ceps", exercises:[
        ["Banco Scott","4","8 (P.C.)"],
        ["Rosca Cross Over","4","8"],
        ["Rosca","",""],
        ["Rosca","",""]
      ]},
      {name:"Abdominais", exercises:[
        ["Crunch","",""],
        ["Crunch + remador","4","15 + 10"],
        ["FlexÃ£o lateral","",""],
        ["Inferior","",""],
        ["OblÃ­quo","",""],
        ["Tesoura","",""],
        ["Prancha 30m.","4","45 segundos"]
      ]}
    ]
  },
  B: {
    name: "Treino B",
    muscles: ["Peitorais", "TrÃ­ceps", "Ombros"],
    sections: [
      {name:"Peitorais", exercises:[
        ["Cross Over","",""],
        ["Crucifixo aberto inclinado","4","8"],
        ["Fly mÃ¡quina","4","8"],
        ["Paralelas aberta","",""],
        ["Supino ART","4","12/12/8/8"],
        ["Voador / Peck Deck","",""],
        ["Supino reto (H)","4","12/12/8/8"]
      ]},
      {name:"TrÃ­ceps", exercises:[
        ["TrÃ­ceps puxador W","4","8 (P.C.)"],
        ["TrÃ­ceps francÃªs polia","4","8"],
        ["TrÃ­ceps graviton","",""],
        ["Supino trÃ­ceps","",""],
        ["TrÃ­ceps coice","",""]
      ]},
      {name:"Ombros", exercises:[
        ["Crucifixo inverso polia","",""],
        ["Desenvolvimento F/C","",""],
        ["ElevaÃ§Ã£o frontal","4","16"],
        ["Remada alta","",""],
        ["ElevaÃ§Ã£o lateral","4","8"]
      ]}
    ]
  },
  C: {
    name: "Treino C",
    muscles: ["Membros inferiores"],
    sections: [
      {name:"Membros inferiores", exercises:[
        ["Agachamento barra","",""],
        ["Agachamento Hack","3â€“4","12/12/8/8"],
        ["Cadeira extensora","4","8"],
        ["Cadeira flexora","4","8"],
        ["Leg Press A/B","",""],
        ["Leg Press 45Â°","3â€“4","12/12/8/8"],
        ["Stiff","",""],
        ["Cadeira abdutora","",""],
        ["Cadeira adutora","",""],
        ["Banco sÃ³leo","4","12"],
        ["GÃªmeos mÃ¡quina","4","12"],
        ["GlÃºteos","",""],
        ["Agachamento sumÃ´ (H)","3â€“4","8"],
        ["Mesa flexora","4","8"]
      ]}
    ]
  }
};

const ALL_EXERCISES = Object.fromEntries(
  Object.entries(TRAININGS).flatMap(([t, d]) =>
    d.sections.flatMap(s => s.exercises.map((e, i) => [
      `${t}-${s.name}-${i}`, {id:`${t}-${s.name}-${i}`, training:t, section:s.name, name:e[0], sets:e[1], reps:e[2]}
    ]))
  )
);

const KEY = "meuTreinoDataV1";
const DEFAULTS = {
  workouts: [],
  settings: {rest:30, sound:true, vibration:true, theme:"light"},
  excludedExercises: {A:[],B:[],C:[]},
  customExercises: {A:[],B:[],C:[]},
  workoutPlans: {A:null,B:null,C:null},
  workoutNames: {A:"Treino A",B:"Treino B",C:"Treino C"}
};
let db;
try {
  db = JSON.parse(localStorage.getItem(KEY) || "null") || JSON.parse(JSON.stringify(DEFAULTS));
} catch(e) {
  db = JSON.parse(JSON.stringify(DEFAULTS));
}
if(!db.excludedExercises) db.excludedExercises = {A:[],B:[],C:[]};
if(!db.customExercises) db.customExercises = {A:[],B:[],C:[]};
if(!db.workoutPlans) db.workoutPlans = {A:null,B:null,C:null};
if(!db.workoutNames) db.workoutNames = {A:"Treino A",B:"Treino B",C:"Treino C"};
["A","B","C"].forEach(k=>{
  if(!Array.isArray(db.excludedExercises[k])) db.excludedExercises[k]=[];
  if(!Array.isArray(db.customExercises[k])) db.customExercises[k]=[];
});
let state = { page:"home", training:null, exerciseIndex:0, workout:null, exerciseTimer:0, exerciseOneMinuteAlerted:false, exerciseRunning:false, exerciseStartedAt:null, currentSetIndex:0, restTimer:0, restRunning:false, timerInterval:null, restInterval:null };

function save(){ localStorage.setItem(KEY, JSON.stringify(db)); }
function pad(n){ return String(n).padStart(2,"0"); }
function fmt(sec){ sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}:${pad(sec%60)}`; }
function fmtShort(sec){ sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/60))}:${pad(sec%60)}`; }
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function flatTraining(code){
  // Quando o treino foi personalizado, sua lista passa a ser a fonte oficial.
  const plan = db.workoutPlans?.[code];
  if(Array.isArray(plan)){
    return plan.filter(e=>e.enabled!==false).map(e=>({
      id:e.id, section:e.section||"Outros", name:e.name, sets:e.sets||"", reps:e.reps||"", custom:!!e.custom
    }));
  }
  const excluded = new Set(db.excludedExercises?.[code] || []);
  const base = TRAININGS[code].sections.flatMap(s=>s.exercises.map((e,i)=>({
    id:`${code}-${s.name}-${i}`, section:s.name, name:e[0], sets:e[1], reps:e[2]
  })));
  const custom = (db.customExercises?.[code] || []).map(e=>({
    id:e.id, section:e.section || "Outros", name:e.name, sets:e.sets || "", reps:e.reps || "", custom:true
  }));
  return [...base, ...custom].filter(e=>!excluded.has(e.id));
}
function trainingName(code){ return db.workoutNames?.[code] || TRAININGS[code].name; }
function allExerciseLibrary(){
  const base=[];
  Object.entries(TRAININGS).forEach(([code,t])=>t.sections.forEach(s=>s.exercises.forEach((e,i)=>base.push({
    id:`${code}-${s.name}-${i}`, name:e[0], section:s.name, sets:e[1]||"", reps:e[2]||"", source:`Treino ${code}`
  }))));
  Object.entries(db.customExercises||{}).forEach(([code,list])=>list.forEach(e=>base.push({
    id:e.id, name:e.name, section:e.section||"Outros", sets:e.sets||"", reps:e.reps||"", source:`Meus exercÃ­cios â€¢ ${code}` , custom:true
  })));
  return base;
}
function ensureWorkoutPlan(code){
  if(Array.isArray(db.workoutPlans?.[code])) return db.workoutPlans[code];
  const excluded=new Set(db.excludedExercises?.[code]||[]);
  const plan=allExerciseLibrary().filter(e=>e.source===`Treino ${code}` || e.source===`Meus exercÃ­cios â€¢ ${code}`).map(e=>({...e,enabled:!excluded.has(e.id)}));
  db.workoutPlans[code]=plan; save(); return plan;
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function dateBR(iso){ if(!iso)return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function totalExercises(code){ return flatTraining(code).length; }
function monthLabel(y,m){ return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m,1)); }

function layout(content, active="home"){
  const navActive = (active === "training-edit" || active === "training-new") ? "trainings" : active;
  const app=document.getElementById("app");
  if(!app) throw new Error("Elemento #app nÃ£o encontrado.");
  app.innerHTML = `
  <div class="shell">
    <header class="topbar"><div><div class="eyebrow">CONTROLE DE TREINO</div><h1>Meu Treino</h1></div>
      <div class="topbar-actions">${active==='trainings'?'<button class="iconbtn top-add" onclick="renderNewWorkout()" aria-label="Novo treino" title="Novo treino">ï¼‹</button>':''}<button class="iconbtn" onclick="openSettings()" aria-label="ConfiguraÃ§Ãµes" title="ConfiguraÃ§Ãµes">âš™</button></div>
    </header>
    <main>${content}</main>
    <nav class="bottomnav">
      <button class="${navActive==='home'?'active':''}" onclick="go('home')"><span>âŒ‚</span>InÃ­cio</button>
      <button class="${navActive==='calendar'?'active':''}" onclick="go('calendar')"><span>â–¦</span>CalendÃ¡rio</button>
      <button class="${navActive==='trainings'?'active':''}" onclick="go('trainings')"><span>ðŸ’ª</span>Treinos</button>
      <button class="${navActive==='history'?'active':''}" onclick="go('history')"><span>â—·</span>HistÃ³rico</button>
    </nav>
  </div>`;
}

function go(page){
  stopIntervals();
  state.page=page; state.training=null; state.workout=null;
  if(page==="home")renderHome();
  if(page==="calendar")renderCalendar();
  if(page==="trainings")renderTrainings();
  if(page==="history")renderHistory();
}
function renderHome(){
  const recent=db.workouts[db.workouts.length-1];
  const month=todayISO().slice(0,7);
  const count=db.workouts.filter(w=>w.date.startsWith(month)).length;
  const total=db.workouts.reduce((a,w)=>a+(w.totalTime||0),0);
  layout(`
    <section class="hero"><div><span class="pill">4â€“5x por semana</span><h2>Pronto para treinar?</h2><p>Escolha a divisÃ£o e acompanhe cada exercÃ­cio, sÃ©rie e tempo.</p></div><div class="hero-icon">âš¡</div></section>
    <div class="stats"><div><b>${count}</b><span>treinos no mÃªs</span></div><div><b>${fmtShort(total)}</b><span>tempo total</span></div><div><b>${recent?recent.type:"â€”"}</b><span>Ãºltimo treino</span></div></div>
    <h3>DivisÃ£o</h3>
    <div class="training-grid">${["A","B","C"].map(code=>{
      const t=TRAININGS[code];
      return `<article class="training-card ${code.toLowerCase()}"><div class="card-top"><span class="badge">${code}</span><span class="exercise-count">${totalExercises(code)} exercÃ­cios</span></div><h3>${esc(trainingName(code))}</h3><p>${t.muscles.join(" â€¢ ")}</p><button class="primary" onclick="startWorkout('${code}')">â–¶ Iniciar treino</button></article>`
    }).join("")}</div>
    ${recent?`<section class="recent"><div><span class="eyebrow">ÃšLTIMO TREINO</span><h3>${recent.type} â€¢ ${dateBR(recent.date)}</h3><p>${fmt(recent.totalTime||0)} â€¢ ${recent.completedExercises||0} exercÃ­cios</p></div><button class="secondary" onclick="showWorkoutDetails('${recent.id}')">Detalhes</button></section>`:""}
  `,"home");
}

/* =========================================================
   Planejamento com IA (opcional)
   A chave nunca Ã© usada aqui: esta camada chama somente um backend configurado.
   ========================================================= */
let aiPlanDraft=null;
function aiPlanningApiUrl(){
  const raw=window.MEU_TREINO_CONFIG?.AI_API_URL;
  return typeof raw==="string" ? raw.trim().replace(/\/$/,"") : "";
}
function aiPlanningIsConfigured(){ return /^https:\/\//i.test(aiPlanningApiUrl()) || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(aiPlanningApiUrl()); }
function renderAiPlanner(){
  if(!aiPlanningIsConfigured()) return renderTrainings();
  layout(`
    <button class="back edit-back" onclick="renderTrainings()" aria-label="Voltar para treinos">â† <span>Meus Treinos</span></button>
    <div class="detail-head edit-detail-head"><div><h2>Planejar com IA</h2><p>Receba uma sugestÃ£o de ficha e revise tudo antes de salvar.</p></div></div>
    <section class="settings-card ai-planner-form">
      <label>Objetivo <select id="aiObjective"><option value="hipertrofia">Hipertrofia</option><option value="forÃ§a">ForÃ§a</option><option value="condicionamento">Condicionamento</option><option value="saÃºde geral">SaÃºde geral</option></select></label>
      <label>NÃ­vel <select id="aiLevel"><option>Iniciante</option><option>IntermediÃ¡rio</option><option>AvanÃ§ado</option></select></label>
      <label>Dias por semana <select id="aiDays"><option value="2">2 dias</option><option value="3" selected>3 dias</option><option value="4">4 dias</option><option value="5">5 dias</option><option value="6">6 dias</option></select></label>
      <label>DuraÃ§Ã£o por treino (minutos)<input id="aiDuration" type="number" min="20" max="180" value="60" inputmode="numeric"></label>
      <label>Equipamentos disponÃ­veis<textarea id="aiEquipment" rows="2" maxlength="400" placeholder="Ex.: halteres, banco, barra, academia completa"></textarea></label>
      <label>LimitaÃ§Ãµes ou observaÃ§Ãµes<textarea id="aiLimitations" rows="3" maxlength="600" placeholder="Opcional. Ex.: desconforto no joelho; evitar impacto."></textarea></label>
      <label>PreferÃªncia de divisÃ£o<textarea id="aiSplit" rows="2" maxlength="300" placeholder="Opcional. Ex.: superior/inferior ou corpo inteiro."></textarea></label>
      <p class="ai-planner-notice">A sugestÃ£o tem finalidade educacional. Revise exercÃ­cios, cargas e limitaÃ§Ãµes com um profissional qualificado.</p>
      <div id="aiPlannerMessage" aria-live="polite"></div>
      <div class="ai-planner-actions"><button class="secondary" onclick="renderTrainings()">Cancelar</button><button id="aiGenerateButton" class="primary" onclick="generateAiPlan()">âœ¨ Gerar sugestÃ£o</button></div>
    </section>
  `,"trainings");
}
function aiField(id,maxLength=600){ return String(document.getElementById(id)?.value||"").trim().slice(0,maxLength); }
function showAiPlannerMessage(message,isError=false){ const el=document.getElementById("aiPlannerMessage"); if(el)el.innerHTML=`<div class="${isError?"ai-planner-error":"ai-planner-notice"}">${esc(message)}</div>`; }
function normalizeAiPlan(raw){
  const plan=raw?.plan||raw;
  if(!plan||typeof plan!=="object") throw new Error("A IA retornou um plano invÃ¡lido.");
  const allowedLevels=["Iniciante","IntermediÃ¡rio","AvanÃ§ado","Personalizado"];
  const groups=Array.isArray(plan.groups)?plan.groups.slice(0,12).map((group,gi)=>{
    const name=String(group?.name||"").trim().slice(0,80);
    const exercises=Array.isArray(group?.exercises)?group.exercises.slice(0,16).map((exercise,ei)=>{
      const exerciseName=String(exercise?.name||"").trim().slice(0,100);
      const providedCount=Number.parseInt(exercise?.seriesCount,10) || (Array.isArray(exercise?.sets)?exercise.sets.length:0);
      const requestedCount=Math.min(12,Math.max(1,providedCount));
      const count=Math.min(12,Math.max(1,Number.isFinite(requestedCount)?requestedCount:3));
      const sourceSets=Array.isArray(exercise?.sets)?exercise.sets:[];
      if(!exerciseName) return null;
      return {id:uid("ex-"),name:exerciseName,equipment:String(exercise?.equipment||"").slice(0,120),order:ei,seriesCount:count,sets:Array.from({length:count},(_,si)=>({number:si+1,reps:String(sourceSets[si]?.reps??sourceSets[0]?.reps??"").slice(0,30),weight:"",done:false,completedAt:null}))};
    }).filter(Boolean):[];
    return name&&exercises.length?{id:uid("grupo-"),name,order:gi,exercises}:null;
  }).filter(Boolean):[];
  if(!groups.length) throw new Error("A sugestÃ£o nÃ£o contÃ©m grupos e exercÃ­cios utilizÃ¡veis.");
  return normalizeWorkout({id:uid("treino-"),name:String(plan.name||"Treino sugerido pela IA").trim().slice(0,80),description:String(plan.description||"Plano sugerido pela IA. Revise antes de executar.").trim().slice(0,300),level:allowedLevels.includes(plan.level)?plan.level:"Personalizado",groups,aiGenerated:true,aiNotes:Array.isArray(plan.notes)?plan.notes.map(n=>String(n).slice(0,220)).slice(0,5):[]});
}
async function generateAiPlan(){
  if(!aiPlanningIsConfigured()){ showAiPlannerMessage("Configure a URL segura do backend para usar a IA.",true); return; }
  const button=document.getElementById("aiGenerateButton");
  const input={objective:aiField("aiObjective",80),level:aiField("aiLevel",40),daysPerWeek:Number.parseInt(aiField("aiDays",2),10),durationMinutes:Number.parseInt(aiField("aiDuration",3),10),equipment:aiField("aiEquipment",400),limitations:aiField("aiLimitations",600),splitPreference:aiField("aiSplit",300)};
  if(!Number.isInteger(input.daysPerWeek)||input.daysPerWeek<1||input.daysPerWeek>7||!Number.isInteger(input.durationMinutes)||input.durationMinutes<20||input.durationMinutes>180){showAiPlannerMessage("Confira os dias e a duraÃ§Ã£o informados.",true);return;}
  button.disabled=true; button.textContent="Gerandoâ€¦"; showAiPlannerMessage("Gerando sugestÃ£o. Isso pode levar alguns segundos.");
  const controller=new AbortController(), timeout=window.setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(`${aiPlanningApiUrl()}/ai/plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(data?.detail||"NÃ£o foi possÃ­vel gerar o planejamento agora.");
    aiPlanDraft=normalizeAiPlan(data);
    renderAiPlanPreview();
  }catch(error){showAiPlannerMessage(error?.name==="AbortError"?"A solicitaÃ§Ã£o demorou demais. Tente novamente.":(error?.message||"Erro ao gerar a sugestÃ£o."),true);}
  finally{window.clearTimeout(timeout);if(button){button.disabled=false;button.textContent="âœ¨ Gerar sugestÃ£o";}}
}
function renderAiPlanPreview(){
  const plan=aiPlanDraft;if(!plan)return renderAiPlanner();
  const groups=plan.groups.map(g=>`<section class="ai-plan-group"><h3>${esc(f2DisplayName(g.name))}</h3><ul>${g.exercises.map(e=>`<li><b>${esc(f2DisplayName(e.name))}</b> â€” ${e.seriesCount} Ã— ${esc(e.sets.map(s=>s.reps).join("/"))}</li>`).join("")}</ul></section>`).join("");
  layout(`<button class="back edit-back" onclick="renderAiPlanner()">â† <span>Alterar dados</span></button><div class="detail-head edit-detail-head"><div><h2>${esc(f2DisplayName(plan.name))}</h2><p>${esc(plan.description)}</p></div></div><section class="ai-plan-preview">${groups}</section><p class="ai-plan-notes">${(plan.aiNotes||[]).map(esc).join("<br>")||"Revise a sugestÃ£o antes de salvar."}</p><p class="ai-planner-notice">As cargas ficam em branco para serem preenchidas antes de iniciar cada sÃ©rie.</p><div class="ai-planner-actions"><button class="secondary" onclick="renderAiPlanner()">Descartar</button><button class="primary" onclick="saveAiPlanDraft()">âœ“ Salvar em Meus Treinos</button></div>`,"trainings");
}
function saveAiPlanDraft(){
  if(!aiPlanDraft)return; db.myWorkouts.push(normalizeWorkout(aiPlanDraft));saveMyWorkouts();aiPlanDraft=null;renderTrainings();
}
function renderTrainings(){
  ensurePhase2Data();
  const cards=db.myWorkouts
    .filter(w=>w.active!==false)
    .map(f2WorkoutCard)
    .join("");

  layout(`<div class="training-grid">${cards||'<div class="empty big">Nenhum treino ativo.</div>'}</div>` ,"trainings");
}
function customizeTraining(code){ ensureWorkoutPlan(code); editTraining(code); }
function editTraining(code){
  const plan=ensureWorkoutPlan(code);
  const sections=[...new Set(plan.map(e=>e.section||"Outros"))];
  const sectionsHtml=sections.map(sec=>{
    const rows=plan.filter(e=>(e.section||"Outros")===sec).map((e,i)=>{
      const en=e.enabled!==false;
      return `<div class="exercise-row ${en?'':'exercise-disabled'}">
        <div><b>${i+1}. ${esc(f2DisplayName(e.name))}</b>
        <small>${e.sets?esc(e.sets)+' sÃ©ries':''}${e.reps?' â€¢ '+esc(e.reps):''}${en?'':' â€¢ desativado'}</small></div>
        <label class="exercise-switch" title="${en?'Desativar':'Ativar'} ${esc(f2DisplayName(e.name))}">
          <input type="checkbox" ${en?'checked':''}
            onchange="setPlanEnabled('${code}',${JSON.stringify(e.id)},this.checked)"
            aria-label="${en?'Desativar':'Ativar'} ${esc(f2DisplayName(e.name))}">
          <span class="switch-slider"></span>
        </label>
      </div>`;
    }).join("");
    return `<section class="section"><div class="section-title">${esc(sec)}</div>${rows}</section>`;
  }).join("");

  layout(`<button class="back" onclick="viewTraining('${code}')">â€¹ Voltar</button>
    <div class="detail-head"><span class="badge">${code}</span><div><h2>Editar ${esc(trainingName(code))}</h2><p>Ative ou desative os exercÃ­cios do treino.</p></div></div>
    ${sectionsHtml}
    <button class="add-exercise" onclick="openAddExercise('${code}',true)">ï¼‹ Adicionar exercÃ­cio</button>
    <button class="primary full" onclick="saveTrainingCustomization('${code}')">âœ“ Salvar treino</button>
  `,"trainings");
}

function saveTrainingCustomization(code){
  const input=document.getElementById("workoutNameEdit");
  const name=input?.value.trim() || `Treino ${code}`;
  db.workoutNames[code]=name;
  if(!Array.isArray(db.workoutPlans?.[code])) ensureWorkoutPlan(code);
  save();
  viewTraining(code);
}
function openAddExercise(code, intoPlan=false){
  const groups = TRAININGS[code].sections.map(s=>s.name);
  layout(`<button class="back" onclick="${intoPlan?`editTraining('${code}')`:`viewTraining('${code}')`}">â€¹ Voltar</button>
    <div class="detail-head"><span class="badge">${code}</span><div><h2>Adicionar exercÃ­cio</h2><p>${intoPlan?'Crie um exercÃ­cio diretamente neste treino.':`Personalize seu ${esc(trainingName(code))}`}</p></div></div>
    <form class="exercise-form" onsubmit="event.preventDefault(); saveCustomExercise('${code}',${intoPlan})">
      <label>Nome do exercÃ­cio
        <input id="newExerciseName" required maxlength="80" placeholder="Ex.: Rosca direta">
      </label>
      <label>Grupo muscular
        <select id="newExerciseSection">
          ${groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          <option value="Outros">Outros</option>
        </select>
      </label>
      <div class="form-grid">
        <label>SÃ©ries
          <input id="newExerciseSets" inputmode="numeric" maxlength="10" placeholder="Ex.: 4">
        </label>
        <label>RepetiÃ§Ãµes / tempo
          <input id="newExerciseReps" maxlength="30" placeholder="Ex.: 10 ou 45s">
        </label>
      </div>
      <p class="form-hint">VocÃª pode deixar sÃ©ries e repetiÃ§Ãµes em branco e preencher durante o treino.</p>
      <button class="primary full" type="submit">âœ“ Salvar exercÃ­cio</button>
      <button class="secondary full" type="button" onclick="viewTraining('${code}')">Cancelar</button>
    </form>`);
  setTimeout(()=>document.getElementById("newExerciseName")?.focus(),50);
}

function saveCustomExercise(code, intoPlan=false){
  const name=document.getElementById("newExerciseName")?.value.trim();
  const section=document.getElementById("newExerciseSection")?.value.trim() || "Outros";
  const sets=document.getElementById("newExerciseSets")?.value.trim() || "";
  const reps=document.getElementById("newExerciseReps")?.value.trim() || "";
  if(!name){ alert("Informe o nome do exercÃ­cio."); return; }
  const id=`custom-${code}-${Date.now()}`;
  db.customExercises[code].push({id,name,section,sets,reps});
  if(intoPlan){ ensureWorkoutPlan(code).push({id,name,section,sets,reps,custom:true,source:'Criado neste treino',enabled:true}); }
  save();
  intoPlan ? editTraining(code) : viewTraining(code);
}

function viewTraining(code){
  // Tela de apresentaÃ§Ã£o: sem switch e sem botÃ£o de remoÃ§Ã£o.
  const t=TRAININGS[code];
  const ex=flatTraining(code);
  const groups=[...new Set(ex.map(e=>e.section||"Outros"))];

  const sectionsHtml=groups.map(sec=>{
    const rows=ex.filter(e=>(e.section||"Outros")===sec).map((e,i)=>
      `<div class="exercise-row">
        <div><b>${i+1}. ${esc(f2DisplayName(e.name))}</b>
        <small>${e.sets?esc(e.sets)+' sÃ©ries':'SÃ©ries nÃ£o informadas'}${e.reps?' â€¢ '+esc(e.reps):''}</small></div>
      </div>`).join("");
    return `<section class="section"><div class="section-title">${esc(sec)}</div>${rows}</section>`;
  }).join("");

  layout(`<button class="back" onclick="go('trainings')">â€¹ Voltar</button>
    <div class="detail-head"><span class="badge">${code}</span><div><h2>${esc(trainingName(code))}</h2><p>ApresentaÃ§Ã£o do treino â€¢ ${t.muscles.join(" â€¢ ")}</p></div></div>
    ${sectionsHtml || '<div class="empty big">Nenhum exercÃ­cio ativo neste treino.</div>'}
    ${ex.length?`<button class="primary full" onclick="startWorkout('${code}')">â–¶ Iniciar treino</button>`:''}
    <button class="secondary full" onclick="editTraining('${code}')">âœŽ Editar treino</button>
  `,"trainings");
}

function startWorkout(code){
  stopIntervals();
  const ex=flatTraining(code);
  state.training=code; state.exerciseIndex=0; state.exerciseTimer=0; state.exerciseRunning=false; state.exerciseStartedAt=null; state.currentSetIndex=0; state.restTimer=0; state.restRunning=false;
  state.workout={id:Date.now().toString(), type:code, date:todayISO(), startedAt:new Date().toISOString(), totalTime:0, exercises:ex.map(e=>({id:e.id,name:e.name,section:e.section,prescribedSets:e.sets,prescribedReps:e.reps,duration:0,sets:[]}))};
  state.workoutTimerStart=Date.now();
  renderWorkout();
}

function currentExercise(){ return state.workout.exercises[state.exerciseIndex]; }
function exerciseSetCount(e){
  const n=parseInt(e.prescribedSets);
  return Number.isFinite(n) && n>0 ? n : 0;
}
function nextPendingSetIndex(e){
  const ex=state.workout.exercises[state.exerciseIndex];
  const count=exerciseSetCount(e);
  if(!count) return -1;
  while(ex.sets.length<count) ex.sets.push({reps:"",weight:"",done:false});
  for(let i=Math.max(0,state.currentSetIndex);i<count;i++) if(!ex.sets[i].done) return i;
  for(let i=0;i<count;i++) if(!ex.sets[i].done) return i;
  return -1;
}
function allSetsDone(e){
  const count=exerciseSetCount(e);
  if(!count) return false;
  const ex=state.workout.exercises[state.exerciseIndex];
  while(ex.sets.length<count) ex.sets.push({reps:"",weight:"",done:false});
  return ex.sets.slice(0,count).every(s=>s.done);
}
function startExerciseTimer(){
  if(state.restRunning || state.exerciseRunning) return;
  const e=currentExercise();
  if(allSetsDone(e)) return;
  const ready=exerciseReadyForStart(e);
  if(!ready.ok){
    alert(ready.message);
    return;
  }

  const idx=nextPendingSetIndex(e);
  if(idx>=0) state.currentSetIndex=idx;

  state.exerciseTimer=0;
  state.exerciseOneMinuteAlerted=false;
  state.exerciseRunning=true;
  state.exerciseStartedAt=Date.now();
  startMainTick();
  renderWorkout();
}

function pauseExerciseTimer(){
  // SÃ©rie fixa de 60 segundos: nÃ£o hÃ¡ pausa.
  return;
}

function startMainTick(){
  if(state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval=setInterval(()=>{
    if(state.exerciseRunning && state.exerciseStartedAt){
      state.exerciseTimer=(Date.now()-state.exerciseStartedAt)/1000;

      if(state.exerciseTimer>=60){
        state.exerciseTimer=60;
        state.exerciseRunning=false;
        state.exerciseStartedAt=null;
        if(state.timerInterval){
          clearInterval(state.timerInterval);
          state.timerInterval=null;
        }

        // 1 minuto de exercÃ­cio terminou: alerta e inicia descanso de 30s.
        if(navigator.vibrate && db.settings.vibration) navigator.vibrate([250,120,250]);
        beep();
        startRest();
        return;
      }
    }
    updateTimers();
  },100);
}

function startRest(){
  if(state.restRunning) return;

  const e=currentExercise();
  const count=exerciseSetCount(e);
  if(!count) return;

  const ex=state.workout.exercises[state.exerciseIndex];
  while(ex.sets.length<count) ex.sets.push({reps:"",weight:"",done:false});

  state.restRunning=true;
  state.restTimer=30;

  if(state.restInterval) clearInterval(state.restInterval);
  state.restInterval=setInterval(()=>{
    state.restTimer-=1;
    updateTimers();

    if(state.restTimer<=0){
      finishRestAndEnableNextSeries();
    }
  },1000);

  renderWorkout();
}

function finishRestAndEnableNextSeries(){
  if(!state.restRunning) return;

  if(state.restInterval){
    clearInterval(state.restInterval);
    state.restInterval=null;
  }

  state.restRunning=false;
  state.restTimer=0;

  const e=currentExercise();
  const count=exerciseSetCount(e);
  const ex=state.workout.exercises[state.exerciseIndex];

  // A sÃ©rie somente Ã© concluÃ­da depois dos 30 segundos de descanso.
  const idx=Math.min(state.currentSetIndex,count-1);
  if(ex.sets[idx]) ex.sets[idx].done=true;
  state.currentSetIndex=idx+1;

  // Fim do descanso: alerta e libera a prÃ³xima sÃ©rie.
  if(navigator.vibrate && db.settings.vibration) navigator.vibrate([250,120,250]);
  beep();

  state.exerciseTimer=0;
  state.exerciseStartedAt=null;
  state.exerciseOneMinuteAlerted=false;
  e.completed=allSetsDone(e);
  renderWorkout();
}

function stopRest(){
  // O descanso nÃ£o pode ser pulado/interrompido.
  return;
}

function stopIntervals(){if(state.timerInterval)clearInterval(state.timerInterval);if(state.restInterval)clearInterval(state.restInterval);state.timerInterval=null;state.restInterval=null;state.exerciseRunning=false;state.restRunning=false;}
function beep(){if(!db.settings.sound)return;try{const c=new(window.AudioContext||window.webkitAudioContext)();const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.05;o.start();o.stop(c.currentTime+.18);}catch(e){}}
function updateTimers(){
  const a=document.getElementById('exerciseTimer'); if(a)a.textContent=fmt(state.exerciseTimer);
  const b=document.getElementById('restTimer'); if(b)b.textContent=fmtShort(state.restRunning?state.restTimer:30);
  const c=document.getElementById('workoutTimer'); if(c&&state.workoutTimerStart)c.textContent=fmt((Date.now()-state.workoutTimerStart)/1000);
}

function renderWorkout(){
  const e=currentExercise(), all=state.workout.exercises, progress=Math.round(((state.exerciseIndex+1)/all.length)*100);
  const last=db.workouts.flatMap(w=>w.exercises||[]).slice().reverse().find(x=>x.name===e.name) || null;
  const count=exerciseSetCount(e);
  const doneSets=count ? e.sets.slice(0,count).filter(s=>s.done).length : 0;
  const complete=allSetsDone(e);
  const canNext=complete && !state.restRunning;
  const setLabel=count ? `SÃ©rie ${Math.min(state.currentSetIndex+1,count)} de ${count}` : 'SÃ©rie livre';
  layout(`
    <div class="workout-header"><button class="back" onclick="confirmExitWorkout()">â€¹ Sair</button><span class="pill">TREINO ${state.training}</span></div>
    <div class="workout-progress"><div style="width:${progress}%"></div></div>
    <div class="workout-meta"><span>ExercÃ­cio ${state.exerciseIndex+1} de ${all.length}</span><b id="workoutTimer">${fmt((Date.now()-state.workoutTimerStart)/1000)}</b></div>
    <section class="focus-card"><span class="eyebrow">${esc(e.section)}</span><h2>${esc(f2DisplayName(e.name))}</h2><div class="prescription">${e.prescribedSets||"SÃ©ries nÃ£o informadas"} ${e.prescribedSets ? '<span>Ã—</span> ' : ''}${e.prescribedReps||""}</div>
      <div class="set-status">${setLabel} â€¢ ${doneSets}${count?' de '+count:''} concluÃ­da(s)</div>
      <div class="big-timer" id="exerciseTimer">${fmt(state.exerciseTimer)}</div>
      <div class="timer-actions"><button class="timer-start" onclick="startExerciseTimer()" ${complete||state.restRunning||state.exerciseRunning?'disabled':''}>${state.restRunning?'â³ Descanso...':state.exerciseRunning?'â± SÃ©rie em ExecuÃ§Ã£o':(state.currentSetIndex>0?'â–¶ Iniciar PrÃ³xima SÃ©rie':'â–¶ Iniciar SÃ©rie')}</button></div>
      
      ${complete?`<div class="exercise-completed">âœ“ ExercÃ­cio concluÃ­do</div>`:''}
    </section>
    <section class="rest-card"><div><span class="eyebrow">DESCANSO</span><b id="restTimer">${fmtShort(state.restRunning?state.restTimer:30)}</b></div></section>
    ${last&&last.sets?.length?`<div class="last-load">Ãšltimo registro: ${last.sets.map(s=>(s.weight?s.weight+" kg":"sem carga")).join(" â€¢ ")}</div>`:""}
    <section class="sets-card"><div class="section-title">SÃ©ries e carga</div>${renderSets(e)}</section>
    <div class="nav-ex"><button class="secondary" ${state.exerciseIndex===0?"disabled":""} onclick="prevExercise()">â† Anterior</button><button class="primary" ${canNext?'':'disabled'} onclick="finishExercise()">${state.exerciseIndex===all.length-1?"Finalizar treino":"PrÃ³ximo â†’"}</button></div>
  `);
  if(state.exerciseRunning) startMainTick();
  updateTimers();
}
function resetExerciseTimer(){ pauseExerciseTimer(); state.exerciseTimer=0; state.exerciseStartedAt=null; updateTimers(); renderWorkout(); }
function renderSets(e){
  const count=parseInt(e.prescribedSets)||0;
  if(!count)return `<div class="empty">A ficha original nÃ£o informa a quantidade de sÃ©ries deste exercÃ­cio. Registre livremente:</div><div class="manual-set"><input type="number" min="0" placeholder="Reps"><input type="number" min="0" step=".5" placeholder="kg"><button onclick="addSet()">+</button></div>`;
  const ex=state.workout.exercises[state.exerciseIndex];
  while(ex.sets.length<count) ex.sets.push({reps:"",weight:"",done:false});
  return ex.sets.map((s,i)=>`<div class="set-row"><span class="setnum">${i+1}</span><input value="${esc(s.reps)}" placeholder="${e.prescribedReps?.split("/")[i]||"reps"}" onchange="setValue(${i},'reps',this.value)"><input value="${esc(s.weight)}" placeholder="kg" inputmode="decimal" onchange="setValue(${i},'weight',this.value)"><span class="check ${s.done?'done':''}">${s.done?'âœ“':'â—‹'}</span></div>`).join("");
}
function setValue(i,k,v){state.workout.exercises[state.exerciseIndex].sets[i][k]=v;}
function toggleSet(i){ return; }
function addSet(){state.workout.exercises[state.exerciseIndex].sets.push({reps:"",weight:"",done:false});renderWorkout();}
function finishExercise(){
  const e=currentExercise();
  if(!allSetsDone(e)) return;
  pauseExerciseTimer(); stopRest();
  e.duration=Math.round(state.exerciseTimer); e.completed=true;
  if(state.exerciseIndex<state.workout.exercises.length-1){state.exerciseIndex++;state.exerciseTimer=0;state.exerciseRunning=false;state.exerciseStartedAt=null;state.currentSetIndex=0;renderWorkout();}
  else finishWorkout();
}
function prevExercise(){pauseExerciseTimer();if(state.restRunning) {if(state.restInterval)clearInterval(state.restInterval);state.restInterval=null;state.restRunning=false;} if(state.exerciseIndex>0)state.exerciseIndex--;state.exerciseTimer=state.workout.exercises[state.exerciseIndex].duration||0;state.exerciseRunning=false;state.exerciseStartedAt=null;state.currentSetIndex=0;renderWorkout();}
function finishWorkout(){
  pauseExerciseTimer();stopRest();
  state.workout.totalTime=Math.round((Date.now()-state.workoutTimerStart)/1000);
  state.workout.endTime=new Date().toISOString();
  state.workout.completedExercises=state.workout.exercises.filter(e=>e.duration>0 || e.sets.some(s=>s.done||s.reps||s.weight)).length;
  db.workouts.push(state.workout); save();
  const done=state.workout; state.workout=null;
  layout(`<section class="complete"><div class="complete-icon">âœ“</div><span class="eyebrow">TREINO FINALIZADO</span><h2>Excelente trabalho!</h2><p>Treino ${done.type} concluÃ­do em ${dateBR(done.date)}.</p>
    <div class="summary-grid"><div><b>${fmt(done.totalTime)}</b><span>tempo total</span></div><div><b>${done.completedExercises}</b><span>exercÃ­cios</span></div><div><b>${done.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0)}</b><span>sÃ©ries marcadas</span></div></div>
    <button class="primary full" onclick="go('home')">Voltar ao inÃ­cio</button><button class="secondary full" onclick="showWorkoutDetails('${done.id}')">Ver detalhes</button></section>`);
}
function confirmExitWorkout(){ if(confirm("Sair do treino? O treino em andamento nÃ£o serÃ¡ salvo.")){stopIntervals();go("home");}}
function showWorkoutDetails(id){
  const w=db.workouts.find(x=>x.id===id); if(!w)return;
  layout(`<button class="back" onclick="go('history')">â€¹ HistÃ³rico</button><span class="pill">TREINO ${w.type}</span><h2>${dateBR(w.date)}</h2><div class="stats"><div><b>${fmt(w.totalTime)}</b><span>tempo</span></div><div><b>${w.completedExercises||0}</b><span>exercÃ­cios</span></div></div>
  <div class="section">${w.exercises.map((e,i)=>`<div class="exercise-row"><div><b>${i+1}. ${esc(f2DisplayName(e.name))}</b><small>${fmt(e.duration||0)} â€¢ ${(e.sets||[]).filter(s=>s.done).length} sÃ©ries concluÃ­das</small></div></div>`).join("")}</div>`,"history");
}

let calDate=new Date();
function renderCalendar(){
  const y=calDate.getFullYear(), m=calDate.getMonth(), first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
  const offset=(first+6)%7, cells=[];
  for(let i=0;i<offset;i++)cells.push(`<div class="cal-day empty"></div>`);
  for(let d=1;d<=days;d++){
    const iso=`${y}-${pad(m+1)}-${pad(d)}`, ws=db.workouts.filter(w=>w.date===iso);
    cells.push(`<button class="cal-day ${ws.length?'has':''}" onclick="calendarDay('${iso}')"><span>${d}</span>${ws.map(w=>`<i>${w.type}</i><em>${fmtShort(w.totalTime||0)}</em>`).join("")}</button>`);
  }
  layout(`<div class="calendar-head"><button class="iconbtn" onclick="changeMonth(-1)">â€¹</button><h2>${monthLabel(y,m)}</h2><button class="iconbtn" onclick="changeMonth(1)">â€º</button></div>
  <div class="week"><b>SEG</b><b>TER</b><b>QUA</b><b>QUI</b><b>SEX</b><b>SÃB</b><b>DOM</b></div><div class="calendar">${cells.join("")}</div>
  <button class="primary full" onclick="calendarDay('${todayISO()}')">+ Registrar treino</button>`,"calendar");
}
function changeMonth(delta){calDate=new Date(calDate.getFullYear(),calDate.getMonth()+delta,1);renderCalendar();}
function calendarDay(iso){
  const ws=db.workouts.filter(w=>w.date===iso);
  layout(`<button class="back" onclick="renderCalendar()">â€¹ CalendÃ¡rio</button><span class="pill">${dateBR(iso)}</span><h2>${ws.length?"Treinos realizados":"Nenhum treino registrado"}</h2>
  ${ws.map(w=>`<button class="list-card" onclick="showWorkoutDetails('${w.id}')"><span class="badge">${w.type}</span><div><b>Treino ${w.type}</b><small>${fmt(w.totalTime)} â€¢ ${w.completedExercises||0} exercÃ­cios</small></div><span>â€º</span></button>`).join("")}
  <div class="register-box"><h3>Registrar manualmente</h3><p>Use esta opÃ§Ã£o para marcar um treino que vocÃª fez fora do aplicativo.</p><div class="seg">${["A","B","C"].map(c=>`<button onclick="manualRegister('${iso}','${c}')">Treino ${c}</button>`).join("")}</div></div>`,"calendar");
}
function manualRegister(date,type){db.workouts.push({id:Date.now().toString(),type,date,startedAt:null,endTime:null,totalTime:0,completedExercises:0,exercises:flatTraining(type).map(e=>({id:e.id,name:e.name,section:e.section,duration:0,sets:[]})),manual:true});save();calendarDay(date);}

function renderHistory(){
  const list=[...db.workouts].reverse();
  layout(`<h2>HistÃ³rico</h2><p class="muted">${list.length} treino(s) registrado(s).</p>${list.length?`<div class="list">${list.map(w=>`<button class="list-card" onclick="showWorkoutDetails('${w.id}')"><span class="badge">${w.type}</span><div><b>${dateBR(w.date)}</b><small>${fmt(w.totalTime)} â€¢ ${w.completedExercises||0} exercÃ­cios</small></div><span>â€º</span></button>`).join("")}</div>`:`<div class="empty big">Ainda nÃ£o hÃ¡ treinos salvos.</div>`}`,"history");
}

function openSettings(){
  layout(`<button class="back" onclick="go('home')">â€¹ Voltar</button><h2>ConfiguraÃ§Ãµes</h2>
    <section class="settings-card"><label>Descanso padrÃ£o <select onchange="db.settings.rest=+this.value;save()">${[30,45,60,90,120].map(x=>`<option value="${x}" ${db.settings.rest===x?'selected':''}>${x} segundos</option>`).join("")}</select></label>
    <label class="switch">VibraÃ§Ã£o <input type="checkbox" ${db.settings.vibration?'checked':''} onchange="db.settings.vibration=this.checked;save()"></label>
    <label class="switch">Som <input type="checkbox" ${db.settings.sound?'checked':''} onchange="db.settings.sound=this.checked;save()"></label>
    </section>
    <section class="settings-card"><h3>Treinos</h3>
    <p class="muted">Personalize os treinos, altere o nome e monte sua prÃ³pria sequÃªncia de exercÃ­cios.</p>
    <div class="seg">${['A','B','C'].map(c=>`<button onclick="editTraining('${c}')">Editar ${c}</button>`).join('')}</div>
    </section>
    <section class="settings-card"><h3>Dados</h3><button class="secondary full" onclick="exportData()">Exportar dados</button><label class="filebtn">Importar dados<input type="file" accept=".json" onchange="importData(this.files[0])"></label><button class="danger full" onclick="clearData()">Apagar histÃ³rico</button></section>`,"home");
}
function exportData(){const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="meu-treino-backup.json";a.click();URL.revokeObjectURL(a.href);}
function importData(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.workouts)throw 0;db=x;save();openSettings();alert("Dados importados com sucesso.");}catch(e){alert("Arquivo invÃ¡lido.");}};r.readAsText(file);}
function clearData(){if(confirm("Apagar todo o histÃ³rico? Esta aÃ§Ã£o nÃ£o pode ser desfeita.")){db=DEFAULTS;save();openSettings();}}

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
renderHome();


/* =========================================================
   INTEGRAÃ‡ÃƒO DA BIBLIOTECA COM "ADICIONAR EXERCÃCIO"
   ========================================================= */
(function(){
  function getValue(id){
    const el=document.getElementById(id);
    return el ? el.value : "";
  }

  function findExerciseNameInput(){
    return document.querySelector(
      '#exercise-name, #exercicio-nome, [name="exercise-name"], [name="exercicio"], [name="nome-exercicio"]'
    );
  }

  async function populateExerciseSuggestions(){
    const input=findExerciseNameInput();
    if(!input || !window.ExerciseLibrary) return;

    let dl=document.getElementById("exercise-library-suggestions");
    if(!dl){
      dl=document.createElement("datalist");
      dl.id="exercise-library-suggestions";
      document.body.appendChild(dl);
      input.setAttribute("list", dl.id);
    }

    const items=await ExerciseLibrary.search(input.value || "");
    dl.innerHTML=items.map(e =>
      '<option value="'+String(e.nome).replace(/"/g,'&quot;')+'"></option>'
    ).join("");
  }

  async function saveExerciseFromForm(){
    const input=findExerciseNameInput();
    if(!input) return;

    const nome=input.value.trim();
    if(!nome) return;

    const seriesEl=document.querySelector('#exercise-series, #exercicio-series, [name="series"], [name="qtd-series"]');
    const loadEl=document.querySelector('#exercise-load, #exercicio-carga, [name="carga"], [name="load"]');
    const repsEl=document.querySelector('#exercise-reps, #exercicio-repeticoes, [name="repeticoes"], [name="reps"]');

    await ExerciseLibrary.create(nome, {
      series: seriesEl ? seriesEl.value : "",
      carga: loadEl ? loadEl.value : "",
      repeticoes: repsEl ? repsEl.value : ""
    });
  }

  function install(){
    const input=findExerciseNameInput();
    if(input){
      input.addEventListener("input", populateExerciseSuggestions);
      input.addEventListener("change", populateExerciseSuggestions);
      populateExerciseSuggestions();
    }

    // Intercepta formulÃ¡rios que contenham o campo de nome de exercÃ­cio.
    document.querySelectorAll("form").forEach(form=>{
      if(form.dataset.exerciseLibraryBound) return;
      if(form.querySelector('#exercise-name, #exercicio-nome, [name="exercise-name"], [name="exercicio"], [name="nome-exercicio"]')){
        form.dataset.exerciseLibraryBound="1";
        form.addEventListener("submit", ()=>{ saveExerciseFromForm().catch(console.warn); });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
})();


/* =========================================================
   CONFIGURAÃ‡ÃƒO DO EXERCÃCIO NO TREINO
   O cadastro da biblioteca nÃ£o Ã© alterado.
   ========================================================= */
async function workoutExerciseSave(config) {
  const db = await openExerciseDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(WORKOUT_STORE,"readwrite");
    const req=tx.objectStore(WORKOUT_STORE).put({
      ...config,
      series:Number(config.series)||0,
      repeticoes:Number(config.repeticoes)||0,
      carga:config.carga ?? "",
      descanso:30,
      atualizadoEm:new Date().toISOString()
    });
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function workoutExerciseList(treinoId=null) {
  const db=await openExerciseDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(WORKOUT_STORE,"readonly");
    const store=tx.objectStore(WORKOUT_STORE);
    const req=treinoId==null ? store.getAll() : store.index("treinoId").getAll(treinoId);
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

async function workoutExerciseUpdate(id, changes) {
  const db=await openExerciseDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(WORKOUT_STORE,"readwrite");
    const store=tx.objectStore(WORKOUT_STORE);
    const get=store.get(id);
    get.onsuccess=()=>{
      if(!get.result){reject(new Error("ConfiguraÃ§Ã£o do treino nÃ£o encontrada."));return;}
      const req=store.put({...get.result,...changes,atualizadoEm:new Date().toISOString()});
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    };
    get.onerror=()=>reject(get.error);
  });
}

window.WorkoutExercise = {
  save: workoutExerciseSave,
  list: workoutExerciseList,
  update: workoutExerciseUpdate
};

/* =========================================================
   FASE 2 - MULTIPLOS TREINOS / GRUPOS / EXERCICIOS / HISTORICO
   Camada incremental sobre a arquitetura v26.
   ========================================================= */
const F2_GROUPS = ["Peito","Costas","BÃ­ceps","TrÃ­ceps","Ombros","TrapÃ©zio","QuadrÃ­ceps","Posterior de coxa","GlÃºteos","Panturrilhas","AbdÃ´men","Lombar","AntebraÃ§os","Adutores","Abdutores"];
function uid(prefix="id"){ return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function parseSetNumber(v){ const m=String(v??"").match(/\d+/); return m?Math.max(1,parseInt(m[0],10)):0; }
function repsForSet(reps,i){ const parts=String(reps||"").split("/").map(x=>x.trim()).filter(Boolean); return parts[i] || parts[parts.length-1] || ""; }
function cloneJSON(x){ return JSON.parse(JSON.stringify(x)); }
function normalizeWorkout(w){
  return {
    id:w.id||uid("treino-"), name:String(w.name||"Treino Personalizado"), description:String(w.description||""), level:w.level||"Personalizado",
    active:w.active!==false, createdAt:w.createdAt||new Date().toISOString(), updatedAt:w.updatedAt||new Date().toISOString(),
    groups:Array.isArray(w.groups)?w.groups.map((g,gi)=>({id:g.id||uid("grupo-"),name:g.name||"Outros",order:g.order??gi,exercises:Array.isArray(g.exercises)?g.exercises.map((e,ei)=>({
      id:e.id||uid("ex-"), name:String(e.name||"ExercÃ­cio"), equipment:e.equipment||"", order:e.order??ei,
      seriesCount:Number(e.seriesCount||e.sets?.length||0), sets:Array.isArray(e.sets)?e.sets.map((s,si)=>({number:si+1,reps:String(s.reps??""),weight:String(s.weight??""),done:!!s.done,completedAt:s.completedAt||null})):[]
    })):[]})):[]
  };
}
function buildMigratedWorkout(code,name){
  const source=flatTraining(code), grouped={};
  source.forEach((e,i)=>{
    const g=e.section||"Outros"; if(!grouped[g]) grouped[g]=[];
    const n=parseSetNumber(e.sets), sets=[];
    for(let s=0;s<n;s++) sets.push({number:s+1,reps:repsForSet(e.reps,s),weight:"",done:false,completedAt:null});
    grouped[g].push({id:e.id,name:e.name,equipment:"",order:i,seriesCount:n,sets});
  });
  return normalizeWorkout({id:`legacy-${code}`,name,description:"Treino migrado da versÃ£o anterior",level:"BÃ¡sico",active:true,groups:Object.entries(grouped).map(([g,ex],i)=>({id:`legacy-${code}-g-${i}`,name:g,order:i,exercises:ex}))});
}
function ensurePhase2Data(){
  if(!Array.isArray(db.myWorkouts)){
    const existing=[];
    ["A","B","C"].forEach((c,i)=>existing.push(buildMigratedWorkout(c,c==="A"?"Treino BÃ¡sico":`Treino ${c}`)));
    db.myWorkouts=existing; save();
  }
  db.myWorkouts=db.myWorkouts.map(normalizeWorkout);
  if(!Array.isArray(db.workoutHistory)) db.workoutHistory=[];
  save();
}
ensurePhase2Data();
function getMyWorkout(id){ return db.myWorkouts.find(w=>w.id===id); }
function workoutExerciseCount(w){ return w.groups.reduce((n,g)=>n+g.exercises.length,0); }
function workoutSetTotal(w){ return w.groups.reduce((n,g)=>n+g.exercises.reduce((m,e)=>m+(e.seriesCount||e.sets.length||0),0),0); }
function saveMyWorkouts(){ db.myWorkouts=db.myWorkouts.map(normalizeWorkout); save(); }
function f2EscapeAttr(s){ return esc(String(s)).replace(/`/g,"&#96;"); }
function f2DisplayName(value){
  const text=String(value??"").trim();
  if(!text)return "";
  return text.toLocaleLowerCase("pt-BR").replace(/(^|[\s\-/])([a-zÃ¡Ã Ã¢Ã£Ã©ÃªÃ­Ã³Ã´ÃµÃºÃ§])/giu,(_,sep,ch)=>sep+ch.toLocaleUpperCase("pt-BR"));
}
function f2WorkoutCard(w){
  const name=f2DisplayName(w.name);
  const count=workoutExerciseCount(w);
  return `
    <article class="training-card f2-card"
      onclick="startWorkoutById('${w.id}')"
      role="button"
      tabindex="0"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();startWorkoutById('${w.id}')}"
      aria-label="Abrir treino ${esc(name)}">

      <button class="training-delete card-delete"
        onclick="event.stopPropagation();deleteMyWorkout('${w.id}')"
        aria-label="Excluir treino"
        title="Excluir treino">Ã—</button>

      <div class="f2-card-main">
        <div class="f2-workout-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" focusable="false">
            <rect x="10" y="25" width="8" height="14" rx="3"></rect>
            <rect x="18" y="20" width="7" height="24" rx="3"></rect>
            <rect x="25" y="28" width="14" height="8" rx="4" transform="rotate(-28 32 32)"></rect>
            <rect x="39" y="20" width="7" height="24" rx="3"></rect>
            <rect x="46" y="25" width="8" height="14" rx="3"></rect>
          </svg>
        </div>

        <div class="f2-card-info">
          <h3>${esc(name)}</h3>
          <div class="exercise-count">${count} ${count===1?'exercÃ­cio':'exercÃ­cios'}</div>

        </div>
      </div>

      <div class="f2-card-watermark" aria-hidden="true">
        <svg viewBox="0 0 180 180" focusable="false">
          <g>
            <rect x="72" y="12" width="36" height="156" rx="18"></rect>
            <rect x="42" y="28" width="28" height="124" rx="14"></rect>
            <rect x="110" y="28" width="28" height="124" rx="14"></rect>
            <rect x="18" y="48" width="18" height="84" rx="9"></rect>
            <rect x="144" y="48" width="18" height="84" rx="9"></rect>
          </g>
        </svg>
      </div>

      <div class="card-actions f2-card-actions">
        <button class="primary f2-start-action"
          onclick="event.stopPropagation();startWorkoutById('${w.id}')"
          aria-label="Iniciar treino"
          title="Iniciar treino">
          <span class="f2-play-icon" aria-hidden="true">â–¶</span>
          <span>Iniciar</span>
        </button>

        <button class="secondary f2-edit-action"
          onclick="event.stopPropagation();editMyWorkout('${w.id}')"
          aria-label="Editar treino"
          title="Editar treino">
          <span class="f2-edit-icon" aria-hidden="true">âœŽ</span>
          <span>Editar</span>
        </button>
      </div>
    </article>`;
}

function deleteMyWorkout(id){
  const w=getMyWorkout(id);
  if(!w)return;
  const name=f2DisplayName(w.name);
  if(!confirm(`Excluir treino?\n\nVocÃª deseja excluir o treino "${name}"?\n\nOs registros desse treino no histÃ³rico serÃ£o mantidos.`))return;
  w.active=false;
  w.updatedAt=new Date().toISOString();
  saveMyWorkouts();
  renderTrainings();
}
function renderTrainings(){
  ensurePhase2Data();
  const cards=db.myWorkouts.filter(w=>w.active!==false).map(f2WorkoutCard).join("");
  const aiAction=aiPlanningIsConfigured()
    ? `<button class="secondary ai-planning-button" onclick="renderAiPlanner()">âœ¨ Planejar com IA</button>`
    : `<div class="ai-planning-unavailable">âœ¨ Planejamento com IA indisponÃ­vel. Configure <code>config.js</code> para ativar.</div>`;
  layout(`${aiAction}<div class="training-grid">${cards||'<div class="empty big">Nenhum treino ativo.</div>'}</div>` ,"trainings");
}
function renderNewWorkout(){
  layout(`
    <button class="back edit-back" onclick="go('home')" aria-label="Voltar" title="Voltar">
      <span aria-hidden="true">â†</span><span>InÃ­cio</span>
    </button>

    <div class="detail-head edit-detail-head">
      <div>
        <h2>Novo Treino</h2>
        <p>Cadastre as informaÃ§Ãµes bÃ¡sicas do seu novo treino.</p>
      </div>
    </div>

    <section class="settings-card new-workout-form">
      <label>Nome
        <input id="newWorkoutName" maxlength="80" placeholder="Ex.: Treino de Peito e TrÃ­ceps" autocomplete="off">
      </label>

      <label>DescriÃ§Ã£o
        <textarea id="newWorkoutDescription" rows="2" maxlength="180" placeholder="Opcional"></textarea>
      </label>

      <label>NÃ­vel
        <select id="newWorkoutLevel">
          ${['BÃ¡sico','IntermediÃ¡rio','AvanÃ§ado','Personalizado'].map(x=>`<option>${x}</option>`).join('')}
        </select>
      </label>
    </section>

    <p class="form-hint">Depois de criar o treino, vocÃª poderÃ¡ adicionar grupos musculares e exercÃ­cios na tela de ediÃ§Ã£o.</p>

    <button class="primary full" onclick="createMyWorkoutFromForm()">ï¼‹ Criar Treino</button>
  `,'training-new');
}

function createMyWorkoutFromForm(){
  const name=document.getElementById('newWorkoutName')?.value.trim();
  if(!name){
    alert("Informe o nome do treino.");
    document.getElementById('newWorkoutName')?.focus();
    return;
  }

  const w=normalizeWorkout({
    id:uid("treino-"),
    name,
    level:document.getElementById('newWorkoutLevel')?.value||"Personalizado",
    description:document.getElementById('newWorkoutDescription')?.value.trim()||"",
    groups:[]
  });

  db.myWorkouts.push(w);
  saveMyWorkouts();
  editMyWorkout(w.id);
}

function createMyWorkout(){ renderNewWorkout(); }
function editMyWorkout(id){
  const w=getMyWorkout(id); if(!w)return;
  const legacyDescription = "Treino migrado da versÃ£o anterior";
  const displayDescription = String(w.description||"").trim() === legacyDescription ? "" : String(w.description||"");
  const groups=w.groups.slice().sort((a,b)=>a.order-b.order).map((g,gi)=>`<section class="settings-card f2-group"><div class="page-title-row"><div><h3>${esc(f2DisplayName(g.name))}</h3><small>${g.exercises.length} exercÃ­cio(s)</small></div><div class="f2-actions" aria-label="AÃ§Ãµes do grupo">
      <button class="iconbtn" onclick="moveMyGroup('${id}',${gi},-1)" aria-label="Mover grupo para cima" title="Mover grupo para cima">â†‘</button>
      <button class="iconbtn" onclick="moveMyGroup('${id}',${gi},1)" aria-label="Mover grupo para baixo" title="Mover grupo para baixo">â†“</button>
      <button class="iconbtn" onclick="renameMyGroup('${id}','${g.id}')" aria-label="Renomear grupo muscular" title="Renomear grupo muscular">âœŽ</button>
      <button class="iconbtn" onclick="removeMyGroup('${id}','${g.id}')" aria-label="Excluir grupo muscular" title="Excluir grupo muscular">Ã—</button>
    </div></div>
    ${g.exercises.slice().sort((a,b)=>a.order-b.order).map((e,ei)=>`<div class="exercise-row f2-exercise"><div><b>${ei+1}. ${esc(f2DisplayName(e.name))}</b><small>${e.seriesCount||e.sets.length||0} sÃ©rie(s)${e.equipment?' â€¢ '+esc(e.equipment):''}</small></div><div class="f2-actions" aria-label="AÃ§Ãµes do exercÃ­cio"><button class="iconbtn" onclick="moveMyExercise('${id}','${g.id}','${e.id}',-1)" aria-label="Mover exercÃ­cio para cima" title="Mover exercÃ­cio para cima">â†‘</button><button class="iconbtn" onclick="moveMyExercise('${id}','${g.id}','${e.id}',1)" aria-label="Mover exercÃ­cio para baixo" title="Mover exercÃ­cio para baixo">â†“</button><button class="iconbtn" onclick="configureMyExercise('${id}','${g.id}','${e.id}')" aria-label="Editar exercÃ­cio" title="Editar exercÃ­cio">âœŽ</button><button class="iconbtn" onclick="removeMyExercise('${id}','${g.id}','${e.id}')" aria-label="Excluir exercÃ­cio" title="Excluir exercÃ­cio">Ã—</button></div></div>`).join("")}
    <button class="secondary full" onclick="addExerciseToMyGroup('${id}','${g.id}')">ï¼‹ Adicionar ExercÃ­cio</button></section>`).join("");
  layout(`<button class="back edit-back" onclick="go('trainings')" aria-label="Voltar" title="Voltar"><span aria-hidden="true">â†</span><span>Meus Treinos</span></button><div class="detail-head edit-detail-head"><div><h2>${esc(f2DisplayName(w.name))}</h2></div></div>
    <section class="settings-card"><label>Nome<input id="f2Name" value="${f2EscapeAttr(w.name)}"></label><label>DescriÃ§Ã£o<textarea id="f2Desc" rows="2">${esc(displayDescription)}</textarea></label><label>NÃ­vel<select id="f2Level">${['BÃ¡sico','IntermediÃ¡rio','AvanÃ§ado','Personalizado'].map(x=>`<option ${x===w.level?'selected':''}>${x}</option>`).join('')}</select></label></section>
    <div class="groups-title-row"><h3>Grupos Musculares</h3><button class="iconbtn group-add-btn" onclick="addMyGroup('${id}')" aria-label="Adicionar grupo muscular" title="Adicionar grupo muscular">ï¼‹</button></div>
    ${groups||'<div class="empty">Adicione o primeiro grupo muscular.</div>'}
    <button class="primary full" onclick="saveMyWorkoutHeader('${id}')">âœ“ Salvar Treino</button>`,"training-edit");
}
function saveMyWorkoutHeader(id){ const w=getMyWorkout(id); if(!w)return; const name=document.getElementById('f2Name')?.value.trim(); if(!name){alert("Informe o nome do treino."); return;} w.name=name; w.description=document.getElementById('f2Desc')?.value.trim()||""; w.level=document.getElementById('f2Level')?.value||w.level; w.updatedAt=new Date().toISOString(); saveMyWorkouts(); go('trainings'); }
function addMyGroup(id){ const w=getMyWorkout(id); if(!w)return; const choice=prompt("Nome do grupo muscular:",F2_GROUPS[0]); if(!choice?.trim())return; w.groups.push({id:uid('grupo-'),name:choice.trim(),order:w.groups.length,exercises:[]}); saveMyWorkouts(); editMyWorkout(id); }
function renameMyGroup(wid,gid){const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;const n=prompt("Nome do grupo muscular:",g.name);if(n?.trim()){g.name=n.trim();w.updatedAt=new Date().toISOString();saveMyWorkouts();editMyWorkout(wid);}}
function removeMyGroup(wid,gid){const w=getMyWorkout(wid);if(!w)return;if(confirm("Remover este grupo e seus exercÃ­cios?")){w.groups=w.groups.filter(g=>g.id!==gid);w.groups.forEach((g,i)=>g.order=i);saveMyWorkouts();editMyWorkout(wid);}}
function moveMyGroup(wid,index,delta){const w=getMyWorkout(wid);if(!w)return;const a=w.groups.sort((x,y)=>x.order-y.order),j=index+delta;if(j<0||j>=a.length)return;[a[index],a[j]]=[a[j],a[index]];a.forEach((g,i)=>g.order=i);saveMyWorkouts();editMyWorkout(wid);}
function addExerciseToMyGroup(wid,gid){
  const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;
  const all=allExerciseLibrary().filter((e,i,a)=>a.findIndex(x=>x.name.toLowerCase()===e.name.toLowerCase())===i);
  const q=prompt("Digite o nome do exercÃ­cio (ou parte dele):",""); if(q===null)return;
  const matches=all.filter(e=>e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const chosen=matches[0]||{name:q.trim(),section:g.name,sets:"",reps:"",custom:true}; if(!chosen.name)return alert("Informe o nome do exercÃ­cio.");
  const n=parseSetNumber(chosen.sets),sets=[];for(let i=0;i<n;i++)sets.push({number:i+1,reps:repsForSet(chosen.reps,i),weight:"",done:false,completedAt:null});
  g.exercises.push({id:uid('ex-'),name:chosen.name,equipment:chosen.equipment||"",order:g.exercises.length,seriesCount:n,sets});w.updatedAt=new Date().toISOString();saveMyWorkouts();editMyWorkout(wid);
}
function removeMyExercise(wid,gid,eid){const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;if(confirm("Remover este exercÃ­cio do treino?")){g.exercises=g.exercises.filter(e=>e.id!==eid);g.exercises.forEach((e,i)=>e.order=i);saveMyWorkouts();editMyWorkout(wid);}}
function moveMyExercise(wid,gid,eid,delta){const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;const a=g.exercises.sort((x,y)=>x.order-y.order),i=a.findIndex(e=>e.id===eid),j=i+delta;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];a.forEach((e,k)=>e.order=k);saveMyWorkouts();editMyWorkout(wid);}
function configureMyExercise(wid,gid,eid){
  const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid),e=g?.exercises.find(x=>x.id===eid);if(!e)return;
  const n=prompt("Quantidade de sÃ©ries:",String(e.seriesCount||e.sets.length||1));if(n===null)return;const count=Math.max(0,parseInt(n,10)||0);e.seriesCount=count;e.sets=Array.from({length:count},(_,i)=>e.sets[i]||{number:i+1,reps:"",weight:"",done:false,completedAt:null});
  for(let i=0;i<count;i++)e.sets[i].number=i+1;
  const reps=prompt("RepetiÃ§Ãµes padrÃ£o (opcional):",e.sets[0]?.reps||"");if(reps!==null&&reps.trim())e.sets.forEach(s=>{if(!s.reps)s.reps=reps.trim();});
  saveMyWorkouts();editMyWorkout(wid);
}
function duplicateMyWorkout(id){const w=getMyWorkout(id);if(!w)return;const copy=cloneJSON(w);copy.id=uid('treino-');copy.name=`${w.name} (cÃ³pia)`;copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;copy.groups=copy.groups.map(g=>{g.id=uid('grupo-');g.exercises=g.exercises.map(e=>{e.id=uid('ex-');e.sets=e.sets.map(s=>({...s,done:false,completedAt:null}));return e;});return g;});db.myWorkouts.push(normalizeWorkout(copy));save();renderTrainings();}
function toggleMyWorkout(id){const w=getMyWorkout(id);if(!w)return;w.active=w.active===false;w.updatedAt=new Date().toISOString();save();renderTrainings();}

function flattenMyWorkout(w){
  const out=[];w.groups.slice().sort((a,b)=>a.order-b.order).forEach(g=>g.exercises.slice().sort((a,b)=>a.order-b.order).forEach(e=>out.push({
    id:e.id,section:g.name,name:e.name,prescribedSets:String(e.seriesCount||e.sets.length||""),prescribedReps:e.sets.map(s=>s.reps).filter(Boolean).join("/")||"",sets:cloneJSON(e.sets||[]),groupId:g.id
  })));return out;
}
function startWorkoutById(id){
  const w=getMyWorkout(id);if(!w)return;const ex=flattenMyWorkout(w);if(!ex.length)return alert("Adicione pelo menos um exercÃ­cio ao treino.");
  stopIntervals();state.training=id;state.workoutDefinitionId=id;state.exerciseIndex=0;state.exerciseTimer=0;state.exerciseRunning=false;state.exerciseStartedAt=null;state.currentSetIndex=0;state.restTimer=0;state.restRunning=false;state.workout={id:uid('exec-'),workoutId:id,type:w.name,date:todayISO(),startedAt:new Date().toISOString(),totalTime:0,exercises:ex.map(e=>({...e,duration:0,sets:e.sets.length?e.sets.map(s=>({...s,done:false,completedAt:null})):[]}))};state.workoutTimerStart=Date.now();renderWorkout();}
function startWorkout(code){
  const migrated=db.myWorkouts?.find(w=>w.id===`legacy-${code}`);if(migrated)return startWorkoutById(migrated.id);
  const w=db.myWorkouts?.find(w=>w.name===trainingName(code));if(w)return startWorkoutById(w.id);
  return startWorkoutById(db.myWorkouts?.[0]?.id);
}
function f2CurrentSet(){const e=currentExercise(),count=exerciseSetCount(e);if(!count)return null;while(e.sets.length<count)e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});return e.sets[Math.min(state.currentSetIndex,count-1)];}
function exerciseReadyForStart(exercise){const count=exerciseSetCount(exercise);if(!count)return {ok:false,message:"Configure a quantidade de sÃ©ries para este exercÃ­cio."};const ex=state.workout?.exercises?.[state.exerciseIndex];if(!ex)return {ok:false,message:"ExercÃ­cio invÃ¡lido."};const idx=Math.min(Math.max(state.currentSetIndex,0),count-1),set=ex.sets?.[idx]||{reps:"",weight:""};if(!String(set.weight??"").trim())return {ok:false,message:`Informe a carga da sÃ©rie ${idx+1} antes de iniciar.`};if(!String(set.reps??"").trim())return {ok:false,message:`Informe as repetiÃ§Ãµes da sÃ©rie ${idx+1} antes de iniciar.`};return {ok:true,index:idx};}
function startExerciseTimer(){if(state.restRunning||state.exerciseRunning)return;const e=currentExercise();if(allSetsDone(e))return;const ready=exerciseReadyForStart(e);if(!ready.ok){alert(ready.message);return;}state.currentSetIndex=ready.index;state.exerciseTimer=0;state.exerciseRunning=true;state.exerciseStartedAt=Date.now();startMainTick();renderWorkout();}
function startMainTick(){if(state.timerInterval)clearInterval(state.timerInterval);state.timerInterval=setInterval(()=>{if(state.exerciseRunning&&state.exerciseStartedAt){state.exerciseTimer=(Date.now()-state.exerciseStartedAt)/1000;if(state.exerciseTimer>=60){state.exerciseTimer=60;state.exerciseRunning=false;state.exerciseStartedAt=null;clearInterval(state.timerInterval);state.timerInterval=null;if(navigator.vibrate&&db.settings.vibration)navigator.vibrate([250,120,250]);beep();startRest();return;}}updateTimers();},100);}
function startRest(){if(state.restRunning)return;const e=currentExercise(),count=exerciseSetCount(e);if(!count)return;const ex=state.workout.exercises[state.exerciseIndex];while(ex.sets.length<count)ex.sets.push({number:ex.sets.length+1,reps:"",weight:"",done:false,completedAt:null});state.restRunning=true;state.restTimer=30;if(state.restInterval)clearInterval(state.restInterval);state.restInterval=setInterval(()=>{state.restTimer-=1;updateTimers();if(state.restTimer<=0)finishRestAndEnableNextSeries();},1000);renderWorkout();}
function stopRest(){return;}
function finishRestAndEnableNextSeries(){if(!state.restRunning)return;if(state.restInterval)clearInterval(state.restInterval);state.restInterval=null;state.restRunning=false;state.restTimer=0;const e=currentExercise(),count=exerciseSetCount(e),ex=state.workout.exercises[state.exerciseIndex],idx=Math.min(state.currentSetIndex,count-1);if(ex.sets[idx]){ex.sets[idx].done=true;ex.sets[idx].completedAt=new Date().toISOString();}if(navigator.vibrate&&db.settings.vibration)navigator.vibrate([250,120,250]);beep();state.exerciseTimer=0;state.exerciseStartedAt=null;e.completed=allSetsDone(e);if(e.completed){e.duration=(e.duration||0);if(state.exerciseIndex<state.workout.exercises.length-1){state.exerciseIndex++;state.currentSetIndex=0;state.exerciseTimer=0;state.exerciseRunning=false;renderWorkout();}else{finishWorkout();}}else{state.currentSetIndex=idx+1;renderWorkout();}}
function finishExercise(){return;}
function pauseExerciseTimer(){return;}
function resetExerciseTimer(){return;}
function prevExercise(){return;}
function renderSets(e){const count=exerciseSetCount(e);if(!count)return `<div class="empty">Configure a quantidade de sÃ©ries antes de iniciar este exercÃ­cio.</div>`;while(e.sets.length<count)e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});return e.sets.slice(0,count).map((s,i)=>`<div class="set-row"><span class="setnum">${i+1}</span><input value="${esc(s.reps)}" placeholder="reps" onchange="setValue(${i},'reps',this.value)"><input value="${esc(s.weight)}" placeholder="kg" inputmode="decimal" onchange="setValue(${i},'weight',this.value)"><span class="check ${s.done?'done':''}">${s.done?'âœ“':'â—‹'}</span></div>`).join("");}
function renderWorkout(){const e=currentExercise(),all=state.workout.exercises,progress=Math.round(((state.exerciseIndex+1)/all.length)*100),count=exerciseSetCount(e),doneSets=count?e.sets.slice(0,count).filter(s=>s.done).length:0,complete=allSetsDone(e),setLabel=count?`SÃ©rie ${Math.min(state.currentSetIndex+1,count)} de ${count}`:"SÃ©rie nÃ£o configurada";layout(`<div class="workout-header"><button class="back" onclick="confirmExitWorkout()">â€¹ Sair</button><span class="pill">${esc(state.workout.type)}</span></div><div class="workout-progress"><div style="width:${progress}%"></div></div><div class="workout-meta"><span>ExercÃ­cio ${state.exerciseIndex+1} de ${all.length}</span><b id="workoutTimer">${fmt((Date.now()-state.workoutTimerStart)/1000)}</b></div><section class="focus-card"><span class="eyebrow">${esc(e.section)}</span><h2>${esc(f2DisplayName(e.name))}</h2><div class="prescription">${e.prescribedSets||"Configure as sÃ©ries"}${e.prescribedReps?` <span>Ã—</span> ${esc(e.prescribedReps)}`:""}</div><div class="set-status">${setLabel} â€¢ ${doneSets}${count?' de '+count:''} concluÃ­da(s)</div><div class="big-timer" id="exerciseTimer">${fmt(state.exerciseTimer)}</div><div class="timer-actions"><button class="timer-start" onclick="startExerciseTimer()" ${complete||state.restRunning||state.exerciseRunning?'disabled':''}>${state.restRunning?'â³ Descanso...':state.exerciseRunning?'â± SÃ©rie em ExecuÃ§Ã£o':state.currentSetIndex>0?'â–¶ Iniciar PrÃ³xima SÃ©rie':'â–¶ Iniciar SÃ©rie'}</button></div>${complete?'<div class="exercise-completed">âœ“ ExercÃ­cio concluÃ­do</div>':''}</section><section class="rest-card"><div><span class="eyebrow">DESCANSO AUTOMÃTICO</span><b id="restTimer">${fmtShort(state.restRunning?state.restTimer:30)}</b></div></section><section class="sets-card"><div class="section-title">SÃ©ries e carga</div>${renderSets(e)}</section>`,"home");if(state.exerciseRunning)startMainTick();updateTimers();}
function setValue(i,k,v){const e=currentExercise();if(e?.sets?.[i]){e.sets[i][k]=v;}}
function toggleSet(){return;}
function allSetsDone(e){const count=exerciseSetCount(e);if(!count)return false;while(e.sets.length<count)e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});return e.sets.slice(0,count).every(s=>s.done);}
function finishWorkout(){if(!state.workout)return;const done=state.workout;stopIntervals();done.totalTime=Math.round((Date.now()-state.workoutTimerStart)/1000);done.endTime=new Date().toISOString();done.completedExercises=done.exercises.filter(e=>e.completed).length;done.totalSets=done.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);const duplicate=db.workoutHistory.some(h=>h.workoutId===done.workoutId&&h.executionDate===done.date&&Math.abs(new Date(h.completedAt)-new Date(done.endTime))<60000);if(!duplicate){db.workoutHistory.push({id:uid('hist-'),workoutId:done.workoutId,name:done.type,date:done.date,executionDate:done.date,startedAt:done.startedAt,completedAt:done.endTime,totalTime:done.totalTime,completedExercises:done.completedExercises,totalSets:done.totalSets,workoutSnapshot:cloneJSON(done)});db.workouts.push(done);save();}state.workout=null;renderCompletion(done);}
function renderCompletion(done){layout(`<section class="complete"><div class="complete-icon">âœ“</div><span class="eyebrow">TREINO FINALIZADO</span><h2>Excelente trabalho!</h2><p><b>${esc(done.type)}</b> concluÃ­do automaticamente em ${dateBR(done.date)}.</p><div class="summary-grid"><div><b>${fmt(done.totalTime)}</b><span>tempo total</span></div><div><b>${done.completedExercises}</b><span>exercÃ­cios</span></div><div><b>${done.totalSets}</b><span>sÃ©ries</span></div></div><button class="primary full" onclick="go('calendar')">Ver no calendÃ¡rio</button><button class="secondary full" onclick="go('home')">Voltar ao inÃ­cio</button></section>`);}
function renderCalendar(){const y=calDate.getFullYear(),m=calDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),offset=(first+6)%7,cells=[];for(let i=0;i<offset;i++)cells.push('<div class="cal-day empty"></div>');for(let d=1;d<=days;d++){const iso=`${y}-${pad(m+1)}-${pad(d)}`,ws=(db.workoutHistory||[]).filter(w=>w.date===iso);cells.push(`<button class="cal-day ${ws.length?'has':''}" onclick="calendarDay('${iso}')"><span>${d}</span>${ws.map(w=>`<i>âœ“ ${esc(f2DisplayName(w.name))}</i><em>${fmtShort(w.totalTime||0)}</em>`).join("")}</button>`);}layout(`<div class="calendar-head"><button class="iconbtn" onclick="changeMonth(-1)">â€¹</button><h2>${monthLabel(y,m)}</h2><button class="iconbtn" onclick="changeMonth(1)">â€º</button></div><div class="week"><b>SEG</b><b>TER</b><b>QUA</b><b>QUI</b><b>SEX</b><b>SÃB</b><b>DOM</b></div><div class="calendar">${cells.join("")}</div>`,"calendar");}
function calendarDay(iso){const ws=(db.workoutHistory||[]).filter(w=>w.date===iso);layout(`<button class="back" onclick="renderCalendar()">â€¹ CalendÃ¡rio</button><span class="pill">${dateBR(iso)}</span><h2>${ws.length?'Treinos realizados':'Nenhum treino registrado'}</h2>${ws.map(w=>`<button class="list-card" onclick="showWorkoutDetails('${w.id}')"><span class="badge">âœ“</span><div><b>${esc(f2DisplayName(w.name))}</b><small>${fmt(w.totalTime)} â€¢ ${w.completedExercises||0} exercÃ­cios â€¢ ${w.totalSets||0} sÃ©ries</small></div><span>â€º</span></button>`).join("")} ${!ws.length?'<div class="empty big">Este dia ainda nÃ£o possui treino concluÃ­do.</div>':''}`,'calendar');}
function showWorkoutDetails(id){const h=(db.workoutHistory||[]).find(x=>x.id===id)|| (db.workouts||[]).find(x=>x.id===id);if(!h)return;const w=h.workoutSnapshot||h;layout(`<button class="back" onclick="calendarDay('${h.date}')">â€¹ Voltar</button><span class="pill">âœ“ TREINO CONCLUÃDO</span><h2>${esc(f2DisplayName(h.name||w.type))}</h2><div class="stats"><div><b>${dateBR(h.date)}</b><span>data</span></div><div><b>${fmt(h.totalTime||0)}</b><span>tempo</span></div><div><b>${h.totalSets||0}</b><span>sÃ©ries</span></div></div><div class="section">${(w.exercises||[]).map((e,i)=>`<div class="exercise-row"><div><b>${i+1}. ${esc(f2DisplayName(e.name))}</b><small>${(e.sets||[]).filter(s=>s.done).length} sÃ©ries concluÃ­das</small></div></div>`).join('')}</div>`,'calendar');}
function renderHistory(){const list=[...(db.workoutHistory||[])].reverse();layout(`<h2>HistÃ³rico</h2><p class="muted">${list.length} treino(s) concluÃ­do(s).</p>${list.length?`<div class="list">${list.map(w=>`<button class="list-card" onclick="showWorkoutDetails('${w.id}')"><span class="badge">âœ“</span><div><b>${esc(f2DisplayName(w.name))}</b><small>${dateBR(w.date)} â€¢ ${fmt(w.totalTime)} â€¢ ${w.completedExercises||0} exercÃ­cios</small></div><span>â€º</span></button>`).join('')}</div>`:'<div class="empty big">Ainda nÃ£o hÃ¡ treinos concluÃ­dos.</div>'}`,'history');}
function manualRegister(date,type){const w=db.myWorkouts?.find(x=>x.id===`legacy-${type}`);if(!w)return;const id=uid('hist-');db.workoutHistory.push({id,workoutId:w.id,name:w.name,date,executionDate:date,startedAt:null,completedAt:null,totalTime:0,completedExercises:workoutExerciseCount(w),totalSets:workoutSetTotal(w),manual:true,workoutSnapshot:{type:w.name,date,exercises:flattenMyWorkout(w)}});save();calendarDay(date);}
// Home: interface compacta, sem banner, com acesso direto ao cadastro de novo treino.
function renderHome(){
  ensurePhase2Data();
  const recent=[...(db.workoutHistory||[])].slice(-1)[0],
        month=todayISO().slice(0,7),
        count=(db.workoutHistory||[]).filter(w=>w.date.startsWith(month)).length,
        total=(db.workoutHistory||[]).reduce((a,w)=>a+(w.totalTime||0),0);

  const cards=db.myWorkouts
    .filter(w=>w.active!==false)
    .slice(0,3)
    .map(f2WorkoutCard)
    .join("");

  layout(`
    <div class="stats">
      <div><b>${count}</b><span>treinos no mÃªs</span></div>
      <div><b>${fmtShort(total)}</b><span>tempo total</span></div>
      <div><b>${recent?esc(f2DisplayName(recent.name)):'â€”'}</b><span>Ãºltimo treino</span></div>
    </div>

    <div class="home-training-head">
      <span>Treinos disponÃ­veis</span>
      <button class="secondary compact home-add-btn" onclick="renderNewWorkout()" aria-label="Cadastrar novo treino" title="Novo treino">+</button>
    </div>

    <div class="training-grid">
      ${cards||'<div class="empty big">Nenhum treino ativo.</div>'}
    </div>

    ${recent?`
      <section class="recent">
        <div>
          <span class="eyebrow">ÃšLTIMO TREINO</span>
          <h3>${esc(f2DisplayName(recent.name))} â€¢ ${dateBR(recent.date)}</h3>
          <p>${fmt(recent.totalTime||0)} â€¢ ${recent.completedExercises||0} exercÃ­cios</p>
        </div>
        <button class="secondary" onclick="showWorkoutDetails('${recent.id}')">Detalhes</button>
      </section>
    `:''}
  `,'home');
}

