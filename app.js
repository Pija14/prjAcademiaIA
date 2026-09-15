/* =========================================================
   BIBLIOTECA DE EXERCÍCIOS - IndexedDB
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

  // Tenta localizar arrays de exercícios já utilizados pelo aplicativo.
  const candidates = [
    window.exercises, window.exercicios, window.exerciseList,
    window.workoutExercises, window.treinoExercicios
  ];
  let source = candidates.find(Array.isArray) || [];

  const normalized = source.map((e, i) => {
    if (typeof e === "string") return { nome: e, ativo: true };
    return {
      ...e,
      nome: e.nome || e.name || e.titulo || `Exercício ${i + 1}`,
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
  if (!nomeLimpo) throw new Error("Informe o nome do exercício.");

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

// === Regras de execução do treino ===
const DEFAULT_EXERCISE_SECONDS = 60;
const DEFAULT_REST_SECONDS = 30;
let restAlertTriggered = false;

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
    muscles: ["Costas", "Bíceps", "Abdominais"],
    sections: [
      {name:"Costas", exercises:[
        ["Puxador frente","4","12/12/8/8"],
        ["Crucifixo inverso","",""],
        ["Extensão lombar","",""],
        ["Máquina remo ART","4","8"],
        ["Pull down","",""],
        ["Pull-over","",""],
        ["Puxador triangular ART","4","12/12/8/8"],
        ["Máquina remo ART aberta","4","8"]
      ]},
      {name:"Bíceps", exercises:[
        ["Banco Scott","4","8 (P.C.)"],
        ["Rosca Cross Over","4","8"],
        ["Rosca","",""],
        ["Rosca","",""]
      ]},
      {name:"Abdominais", exercises:[
        ["Crunch","",""],
        ["Crunch + remador","4","15 + 10"],
        ["Flexão lateral","",""],
        ["Inferior","",""],
        ["Oblíquo","",""],
        ["Tesoura","",""],
        ["Prancha 30m.","4","45 segundos"]
      ]}
    ]
  },
  B: {
    name: "Treino B",
    muscles: ["Peitorais", "Tríceps", "Ombros"],
    sections: [
      {name:"Peitorais", exercises:[
        ["Cross Over","",""],
        ["Crucifixo aberto inclinado","4","8"],
        ["Fly máquina","4","8"],
        ["Paralelas aberta","",""],
        ["Supino ART","4","12/12/8/8"],
        ["Voador / Peck Deck","",""],
        ["Supino reto (H)","4","12/12/8/8"]
      ]},
      {name:"Tríceps", exercises:[
        ["Tríceps puxador W","4","8 (P.C.)"],
        ["Tríceps francês polia","4","8"],
        ["Tríceps graviton","",""],
        ["Supino tríceps","",""],
        ["Tríceps coice","",""]
      ]},
      {name:"Ombros", exercises:[
        ["Crucifixo inverso polia","",""],
        ["Desenvolvimento F/C","",""],
        ["Elevação frontal","4","16"],
        ["Remada alta","",""],
        ["Elevação lateral","4","8"]
      ]}
    ]
  },
  C: {
    name: "Treino C",
    muscles: ["Membros inferiores"],
    sections: [
      {name:"Membros inferiores", exercises:[
        ["Agachamento barra","",""],
        ["Agachamento Hack","3–4","12/12/8/8"],
        ["Cadeira extensora","4","8"],
        ["Cadeira flexora","4","8"],
        ["Leg Press A/B","",""],
        ["Leg Press 45°","3–4","12/12/8/8"],
        ["Stiff","",""],
        ["Cadeira abdutora","",""],
        ["Cadeira adutora","",""],
        ["Banco sóleo","4","12"],
        ["Gêmeos máquina","4","12"],
        ["Glúteos","",""],
        ["Agachamento sumô (H)","3–4","8"],
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
  users: [],
  currentUserId: null,
  ownerId: null,
  settings: {rest:30, exerciseDuration:60, restDuration:30, sound:true, vibration:true, theme:"light"},
  excludedExercises: {A:[],B:[],C:[]},
  customExercises: {A:[],B:[],C:[]},
  workoutPlans: {A:null,B:null,C:null},
  workoutNames: {A:"Treino A",B:"Treino B",C:"Treino C"},
  myWorkouts: null,
  workoutHistory: []
};
let db;
try {
  db = JSON.parse(localStorage.getItem(KEY) || "null") || JSON.parse(JSON.stringify(DEFAULTS));
} catch(e) {
  db = JSON.parse(JSON.stringify(DEFAULTS));
}
if(!Array.isArray(db.users)) db.users = [];
if(!db.excludedExercises) db.excludedExercises = {A:[],B:[],C:[]};
if(!db.customExercises) db.customExercises = {A:[],B:[],C:[]};
if(!db.workoutPlans) db.workoutPlans = {A:null,B:null,C:null};
if(!db.workoutNames) db.workoutNames = {A:"Treino A",B:"Treino B",C:"Treino C"};
if(!Array.isArray(db.workoutHistory)) db.workoutHistory = [];
if(!Array.isArray(db.workouts)) db.workouts = [];
if(!db.settings || typeof db.settings!=="object") db.settings=JSON.parse(JSON.stringify(DEFAULTS.settings));
if(!Number.isFinite(Number(db.settings.exerciseDuration)) || Number(db.settings.exerciseDuration)<=0) db.settings.exerciseDuration=60;
if(!Number.isFinite(Number(db.settings.restDuration)) || Number(db.settings.restDuration)<=0) db.settings.restDuration=30;
if(!Number.isFinite(Number(db.settings.rest)) || Number(db.settings.rest)<=0) db.settings.rest=db.settings.restDuration;
["A","B","C"].forEach(k=>{
  if(!Array.isArray(db.excludedExercises[k])) db.excludedExercises[k]=[];
  if(!Array.isArray(db.customExercises[k])) db.customExercises[k]=[];
});
let state = { page:"home", training:null, exerciseIndex:0, workout:null, exerciseTimer:0, exerciseOneMinuteAlerted:false, exerciseRunning:false, exerciseStartedAt:null, currentSetIndex:0, restTimer:0, restRunning:false, timerInterval:null, restInterval:null };
let authMode = "login";

function uid(prefix="id"){ return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`; }
function normalizeEmail(value){ return String(value || "").trim().toLowerCase(); }
function seedOwnerUser(){
  if (db.users.length) return;
  const owner = {
    id: uid("user"),
    name: "Rafael Louzada",
    email: "rafaellouzadaa@gmail.com",
    password: "",
    createdAt: new Date().toISOString()
  };
  db.users.push(owner);
  db.ownerId = owner.id;
  db.currentUserId = null;
  save();
}
function ensureAuthState(){
  if(!Array.isArray(db.users)) db.users = [];
  seedOwnerUser();
  if(!db.ownerId || !db.users.some(u => u.id === db.ownerId)) db.ownerId = db.users[0].id;
  if(db.currentUserId && !db.users.some(u => u.id === db.currentUserId)) db.currentUserId = null;
  if(!db.users.some(u => u.email && normalizeEmail(u.email) === "rafaellouzadaa@gmail.com")) {
    db.users.unshift({
      id: uid("user"),
      name: "Rafael Louzada",
      email: "rafaellouzadaa@gmail.com",
      password: "",
      createdAt: new Date().toISOString()
    });
    db.ownerId = db.users[0].id;
  }
}
function getCurrentUser(){
  ensureAuthState();
  return db.users.find(u => u.id === db.currentUserId) || null;
}
function getOwnerUser(){
  ensureAuthState();
  return db.users.find(u => u.id === db.ownerId) || db.users[0] || null;
}
function registerUserAccount(name, email, password=""){
  ensureAuthState();
  const safeName = String(name || "").trim();
  const normalized = normalizeEmail(email);
  if(!safeName){ alert("Informe o nome do usuário."); return false; }
  if(!normalized){ alert("Informe o e-mail do usuário."); return false; }
  if(db.users.some(u => normalizeEmail(u.email) === normalized)){ alert("Este e-mail já está cadastrado."); return false; }
  const user = { id: uid("user"), name: safeName, email: normalized, password: String(password || "").trim(), createdAt: new Date().toISOString() };
  db.users.push(user);
  db.currentUserId = user.id;
  save();
  authMode = "login";
  return true;
}
function loginWithEmail(email, password=""){
  ensureAuthState();
  const normalized = normalizeEmail(email);
  if(!normalized){ alert("Informe seu e-mail."); return false; }
  const user = db.users.find(u => normalizeEmail(u.email) === normalized);
  if(!user){ alert("Usuário não encontrado."); return false; }
  const isOwnerAccount = normalizeEmail(user.email) === "rafaellouzadaa@gmail.com";
  const hasStoredPassword = typeof user.password === "string" && user.password.trim().length > 0;
  const submittedPassword = String(password || "").trim();
  if(!hasStoredPassword && isOwnerAccount){
    db.currentUserId = user.id; save(); return true;
  }
  if(!hasStoredPassword && !submittedPassword){
    db.currentUserId = user.id; save(); return true;
  }
  if(user.password === submittedPassword || (!hasStoredPassword && !submittedPassword)){
    db.currentUserId = user.id; save(); return true;
  }
  alert("E-mail ou senha inválidos.");
  return false;
}
function logoutUser(){
  authMode = "login";
  db.currentUserId = null;
  save();
  renderAuthScreen();
}
function handleLoginSubmit(event){
  event.preventDefault();
  const email = document.getElementById("auth-email")?.value || "";
  const password = document.getElementById("auth-password")?.value || "";
  if(loginWithEmail(email, password)){
    renderHome();
  }
  return false;
}
function handleRegisterSubmit(event){
  event.preventDefault();
  const name = document.getElementById("register-name")?.value || "";
  const email = document.getElementById("register-email")?.value || "";
  const password = document.getElementById("register-password")?.value || "";
  if(registerUserAccount(name, email, password)){
    renderHome();
  }
  return false;
}
function toggleAuthMode(mode){
  authMode = mode;
  renderAuthScreen();
}
function renderAuthScreen(){
  const ownerUser = getOwnerUser();
  const ownerEmail = ownerUser?.email || "rafaellouzadaa@gmail.com";
  const app = document.getElementById("app");
  if(!app) return;
  const isLogin = authMode !== "register";
  app.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="eyebrow">ACESSO</div>
        <h2>${isLogin ? "Entrar" : "Criar conta"}</h2>
        <p class="muted">${isLogin ? "Seja bem-vindo(a) de volta." : "Cadastre um novo usuário para continuar."}</p>

        <div class="auth-toggle">
          <button type="button" class="auth-tab ${isLogin ? "active" : ""}" onclick="toggleAuthMode('login')">Entrar</button>
          <button type="button" class="auth-tab ${!isLogin ? "active" : ""}" onclick="toggleAuthMode('register')">Criar conta</button>
        </div>

        ${isLogin ? `
          <form onsubmit="return handleLoginSubmit(event)">
            <label class="auth-field">
              <span>E-mail</span>
              <input id="auth-email" type="email" value="${esc(ownerEmail)}" autocomplete="email" required>
            </label>
            <label class="auth-field">
              <span>Senha</span>
              <input id="auth-password" type="password" placeholder="Opcional para a conta principal" autocomplete="current-password">
            </label>
            <button class="primary full" type="submit">Entrar</button>
          </form>
        ` : `
          <form onsubmit="return handleRegisterSubmit(event)">
            <label class="auth-field">
              <span>Nome</span>
              <input id="register-name" type="text" placeholder="Seu nome" autocomplete="name" required>
            </label>
            <label class="auth-field">
              <span>E-mail</span>
              <input id="register-email" type="email" placeholder="seu@email.com" autocomplete="email" required>
            </label>
            <label class="auth-field">
              <span>Senha</span>
              <input id="register-password" type="password" placeholder="Opcional" autocomplete="new-password">
            </label>
            <button class="primary full" type="submit">Criar usuário</button>
          </form>
        `}

        <div class="auth-note">Conta principal: <b>${esc(ownerEmail)}</b></div>
      </div>
    </div>
  `;
}
function bootApp(){
  ensureAuthState();
  if(!getCurrentUser()){
    renderAuthScreen();
    return;
  }
  renderHome();
}

function save(){ localStorage.setItem(KEY, JSON.stringify(db)); }
function pad(n){ return String(n).padStart(2,"0"); }
function fmt(sec){ sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}:${pad(sec%60)}`; }
function fmtShort(sec){ sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/60))}:${pad(sec%60)}`; }
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;", ">":"&gt;", '"':"&quot;","'":"&#039;"}[m])); }
function flatTraining(code){
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
    id:e.id, name:e.name, section:e.section||"Outros", sets:e.sets||"", reps:e.reps||"", source:`Meus exercícios • ${code}` , custom:true
  })));
  return base;
}
function ensureWorkoutPlan(code){
  if(Array.isArray(db.workoutPlans?.[code])) return db.workoutPlans[code];
  const excluded=new Set(db.excludedExercises?.[code]||[]);
  const plan=allExerciseLibrary().filter(e=>e.source===`Treino ${code}` || e.source===`Meus exercícios • ${code}`).map(e=>({...e,enabled:!excluded.has(e.id)}));
  db.workoutPlans[code]=plan; save(); return plan;
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function dateBR(iso){ if(!iso)return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function totalExercises(code){ return flatTraining(code).length; }
function monthLabel(y,m){ return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m,1)); }

function layout(content, active="home"){
  const navActive = (active === "training-edit" || active === "training-new") ? "trainings" : active;
  const app=document.getElementById("app");
  if(!app) throw new Error("Elemento #app não encontrado.");
  app.innerHTML = `
  <div class="shell">
    <header class="topbar"><div><div class="eyebrow">CONTROLE DE TREINO</div><h1>Meu Treino</h1></div>
      <div class="topbar-actions">${active==='trainings'?'<button class="iconbtn top-add" onclick="renderNewWorkout()" aria-label="Novo treino" title="Novo treino"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>':''}<button class="iconbtn" onclick="openSettings()" aria-label="Configurações" title="Configurações"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.1A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1H15v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V14h-.1a1.7 1.7 0 0 0-1.6 1Z"></path></svg></button></div>
    </header>
    <main>${content}</main>
    <nav class="bottomnav">
      <button class="${navActive==='home'?'active':''}" onclick="go('home')"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z"></path></svg></span>Início</button>
      <button class="${navActive==='calendar'?'active':''}" onclick="go('calendar')"><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2"></path></svg></span>Calendário</button>
      <button class="${navActive==='trainings'?'active':''}" onclick="go('trainings')"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 8v8M4.5 10v4M2.5 11v2M17 8v8M19.5 10v4M21.5 11v2M7 12h10"></path></svg></span>Treinos</button>
      <button class="${navActive==='history'?'active':''}" onclick="go('history')"><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path></svg></span>Histórico</button>
    </nav>
  </div>`;
}

function go(page){
  if(!getCurrentUser()){
    renderAuthScreen();
    return;
  }
  stopIntervals();
  state.page=page; state.training=null; state.workout=null;
  if(page==="home")renderHome();
  if(page==="calendar")renderCalendar();
  if(page==="trainings")renderTrainings();
  if(page==="history")renderHistory();
}
function renderHome(){
  ensurePhase2Data();
  const user = getCurrentUser();
  const recent=db.workouts[db.workouts.length-1];
  const month=todayISO().slice(0,7);
  const count=db.workouts.filter(w=>w.date.startsWith(month)).length;
  const total=db.workouts.reduce((a,w)=>a+(w.totalTime||0),0);
  const weeklyTarget = 4;
  const weeklyProgress = Math.min(100, Math.round((count / weeklyTarget) * 100));
  const workoutsByType = db.myWorkouts.map(w => ({
    code: f2DisplayName(w.name),
    name: `${workoutExerciseCount(w)} exercícios`,
    total: db.workouts.filter(x => x.workoutId === w.id).length
  }));
  const nextSession = workoutsByType.sort((a,b)=>b.total-a.total).find(x=>x.total>0) || null;

  layout(`
    <div class="dashboard-header">
      <div>
        <div class="eyebrow">PAINEL</div>
        <h2>Olá, ${esc(user?.name || "Rafael")}</h2>
      </div>
    </div>

    <div class="dashboard-card dashboard-main">
      <div class="dashboard-main-top">
        <div>
          <span class="eyebrow">RESUMO</span>
          <h3>${count} treinos este mês</h3>
        </div>
        <span class="dashboard-chip">${weeklyProgress}%</span>
      </div>
      <p>Você está ${weeklyProgress}% do objetivo semanal.</p>
      <div class="dashboard-goal"><span>Meta</span><strong>${weeklyTarget} treinos / semana</strong></div>
      <div class="progress-bar"><span style="width:${weeklyProgress}%"></span></div>
    </div>

    <div class="dashboard-grid">
      <article class="dashboard-card">
        <span class="eyebrow">TEMPO TOTAL</span>
        <b>${fmtShort(total)}</b>
        <small>tempo registrado</small>
      </article>

      <article class="dashboard-card">
        <span class="eyebrow">FAVORITO</span>
        <b>${nextSession ? nextSession.code : "—"}</b>
        <small>${nextSession ? nextSession.name : "Sem registro"}</small>
      </article>
    </div>

    ${recent ? `
      <div class="recent-workout">
        <div class="recent-workout-content">
          <span class="eyebrow">ÚLTIMO TREINO</span>
          <h3>${esc(f2DisplayName(recent.type))}</h3>
          <p><strong>${fmt(recent.totalTime || 0)}</strong> • ${recent.completedExercises || 0} exercícios • ${dateBR(recent.date)}</p>
        </div>
        <button class="secondary" onclick="showWorkoutDetails('${recent.id}')">Ver detalhes</button>
      </div>
    ` : `
      <div class="empty-state">
        <p>Ainda não há treinos registrados este mês.</p>
        <button class="primary" onclick="go('trainings')">Começar um treino</button>
      </div>
    `}

    <div class="monthly-summary">
      <h3>Histórico Mensal</h3>
      <div class="summary-chart" id="monthlyChart"></div>
    </div>
  `, "home");

  const ctx = document.getElementById('monthlyChart');
  if (ctx) {
    const labels = Array.from(new Set(db.workouts.filter(w => w.date.startsWith(month)).map(w => w.date.slice(8, 10))));
    const data = labels.map(d => db.workouts.filter(w => w.date.slice(8, 10) === d).reduce((sum, w) => sum + (w.completedExercises || 0), 0));
    ctx.innerHTML = labels.map((d, i) => `<div class="chart-bar"><span style="height:${Math.max(8, data[i] * 18)}px"></span><small>${d}</small></div>`).join("");
  }
}

let aiPlanDraft=null;
function aiPlanningApiUrl(){
  const raw=window.MEU_TREINO_CONFIG?.AI_API_URL;
  return typeof raw==="string" ? raw.trim().replace(/\/$/,"") : "";
}
function aiPlanningIsConfigured(){ return /^https:\/\//i.test(aiPlanningApiUrl()) || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(aiPlanningApiUrl()); }
function renderAiPlanner(){
  if(!aiPlanningIsConfigured()) return renderTrainings();
  layout(`
    <button class="back edit-back" onclick="renderTrainings()" aria-label="Voltar para treinos"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Meus Treinos</span></button>
    <div class="detail-head edit-detail-head"><div><h2>Planejar com IA</h2><p>Receba uma sugestão de ficha e revise tudo antes de salvar.</p></div></div>
    <section class="settings-card ai-planner-form">
      <label>Objetivo <select id="aiObjective"><option value="hipertrofia">Hipertrofia</option><option value="força">Força</option><option value="condicionamento">Condicionamento</option><option value="saúde geral">Saúde geral</option></select></label>
      <label>Nível <select id="aiLevel"><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></select></label>
      <label>Dias por semana <select id="aiDays"><option value="2">2 dias</option><option value="3" selected>3 dias</option><option value="4">4 dias</option><option value="5">5 dias</option><option value="6">6 dias</option></select></label>
      <label>Duração por treino (minutos)<input id="aiDuration" type="number" min="20" max="180" value="60" inputmode="numeric"></label>
      <label>Equipamentos disponíveis<textarea id="aiEquipment" rows="2" maxlength="400" placeholder="Ex.: halteres, banco, barra, academia completa"></textarea></label>
      <label>Limitações ou observações<textarea id="aiLimitations" rows="3" maxlength="600" placeholder="Opcional. Ex.: desconforto no joelho; evitar impacto."></textarea></label>
      <label>Preferência de divisão<textarea id="aiSplit" rows="2" maxlength="300" placeholder="Opcional. Ex.: superior/inferior ou corpo inteiro."></textarea></label>
      <p class="ai-planner-notice">A sugestão tem finalidade educacional. Revise exercícios, cargas e limitações com um profissional qualificado.</p>
      <div id="aiPlannerMessage" aria-live="polite"></div>
      <div class="ai-planner-actions"><button class="secondary" onclick="renderTrainings()">Cancelar</button><button id="aiGenerateButton" class="primary" onclick="generateAiPlan()">✨ Gerar sugestão</button></div>
    </section>
  `,"trainings");
}
function aiField(id,maxLength=600){ return String(document.getElementById(id)?.value||"").trim().slice(0,maxLength); }
function showAiPlannerMessage(message,isError=false){ const el=document.getElementById("aiPlannerMessage"); if(el)el.innerHTML=`<div class="${isError?"ai-planner-error":"ai-planner-notice"}">${esc(message)}</div>`; }
function normalizeAiPlan(raw){
  const plan=raw?.plan||raw;
  if(!plan||typeof plan!=="object") throw new Error("A IA retornou um plano inválido.");
  const allowedLevels=["Iniciante","Intermediário","Avançado","Personalizado"];
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
  if(!groups.length) throw new Error("A sugestão não contém grupos e exercícios utilizáveis.");
  return normalizeWorkout({id:uid("treino-"),name:String(plan.name||"Treino sugerido pela IA").trim().slice(0,80),description:String(plan.description||"Plano sugerido pela IA. Revise antes de executar.").trim().slice(0,300),level:allowedLevels.includes(plan.level)?plan.level:"Personalizado",groups,aiGenerated:true,aiNotes:Array.isArray(plan.notes)?plan.notes.map(n=>String(n).slice(0,220)).slice(0,5):[]});
}
async function generateAiPlan(){
  if(!aiPlanningIsConfigured()){ showAiPlannerMessage("Configure a URL segura do backend para usar a IA.",true); return; }
  const button=document.getElementById("aiGenerateButton");
  const input={objective:aiField("aiObjective",80),level:aiField("aiLevel",40),daysPerWeek:Number.parseInt(aiField("aiDays",2),10),durationMinutes:Number.parseInt(aiField("aiDuration",3),10),equipment:aiField("aiEquipment",400),limitations:aiField("aiLimitations",600),splitPreference:aiField("aiSplit",300)};
  if(!Number.isInteger(input.daysPerWeek)||input.daysPerWeek<1||input.daysPerWeek>7||!Number.isInteger(input.durationMinutes)||input.durationMinutes<20||input.durationMinutes>180){showAiPlannerMessage("Confira os dias e a duração informados.",true);return;}
  button.disabled=true; button.textContent="Gerando…"; showAiPlannerMessage("Gerando sugestão. Isso pode levar alguns segundos.");
  const controller=new AbortController(), timeout=window.setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(`${aiPlanningApiUrl()}/ai/plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(data?.detail||"Não foi possível gerar o planejamento agora.");
    aiPlanDraft=normalizeAiPlan(data);
    renderAiPlanPreview();
  }catch(error){showAiPlannerMessage(error?.name==="AbortError"?"A solicitação demorou demais. Tente novamente.":(error?.message||"Erro ao gerar a sugestão."),true);}
  finally{window.clearTimeout(timeout);if(button){button.disabled=false;button.textContent="✨ Gerar sugestão";}}
}
function renderAiPlanPreview(){
  const plan=aiPlanDraft;if(!plan)return renderAiPlanner();
  const groups=plan.groups.map(g=>`<section class="ai-plan-group"><h3>${esc(f2DisplayName(g.name))}</h3><ul>${g.exercises.map(e=>`<li><b>${esc(f2DisplayName(e.name))}</b> — ${e.seriesCount} × ${esc(e.sets.map(s=>s.reps).join("/"))}</li>`).join("")}</ul></section>`).join("");
  layout(`<button class="back edit-back" onclick="renderAiPlanner()"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Alterar dados</span></button><div class="detail-head edit-detail-head"><div><h2>${esc(f2DisplayName(plan.name))}</h2><p>${esc(plan.description)}</p></div></div><section class="ai-plan-preview">${groups}</section><p class="ai-plan-notes">${(plan.aiNotes||[]).map(esc).join("<br>")||"Revise a sugestão antes de salvar."}</p><p class="ai-planner-notice">As cargas ficam em branco para serem preenchidas antes de iniciar cada série.</p><div class="ai-planner-actions"><button class="secondary" onclick="renderAiPlanner()">Descartar</button><button class="primary" onclick="saveAiPlanDraft()">✓ Salvar em Meus Treinos</button></div>`,"trainings");
}
function saveAiPlanDraft(){
  if(!aiPlanDraft)return; db.myWorkouts.push(normalizeWorkout(aiPlanDraft));saveMyWorkouts();aiPlanDraft=null;renderTrainings();
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
        <small>${e.sets?esc(e.sets)+' séries':''}${e.reps?' • '+esc(e.reps):''}${en?'':' • desativado'}</small></div>
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

  layout(`<button class="back" onclick="viewTraining('${code}')"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Voltar</span></button>
    <div class="detail-head"><span class="badge">${code}</span><div><h2>Editar ${esc(trainingName(code))}</h2><p>Ative ou desative os exercícios do treino.</p></div></div>
    <section class="settings-card"><label>Nome<input id="workoutNameEdit" maxlength="80" value="${esc(trainingName(code))}"></label></section>
    ${sectionsHtml}
    <button class="add-exercise" onclick="openAddExercise('${code}',true)">＋ Adicionar exercício</button>
    <button class="primary full" onclick="saveTrainingCustomization('${code}')">✓ Salvar treino</button>
  `,"trainings");
}

function setPlanEnabled(code,id,enabled){
  const plan=ensureWorkoutPlan(code);
  const item=plan.find(e=>e.id===id);
  if(!item) return;
  item.enabled=!!enabled;
  save();
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
  layout(`<button class="back" onclick="${intoPlan?`editTraining('${code}')`:`viewTraining('${code}')`}"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Voltar</span></button>
    <div class="detail-head"><span class="badge">${code}</span><div><h2>Adicionar exercício</h2><p>${intoPlan?'Crie um exercício diretamente neste treino.':`Personalize seu ${esc(trainingName(code))}`}</p></div></div>
    <form class="exercise-form" onsubmit="event.preventDefault(); saveCustomExercise('${code}',${intoPlan})">
      <label>Nome do exercício
        <input id="newExerciseName" required maxlength="80" placeholder="Ex.: Rosca direta">
      </label>
      <label>Grupo muscular
        <select id="newExerciseSection">
          ${groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          <option value="Outros">Outros</option>
        </select>
      </label>
      <div class="form-grid">
        <label>Séries
          <input id="newExerciseSets" inputmode="numeric" maxlength="10" placeholder="Ex.: 4">
        </label>
        <label>Repetições / tempo
          <input id="newExerciseReps" maxlength="30" placeholder="Ex.: 10 ou 45s">
        </label>
      </div>
      <p class="form-hint">Você pode deixar séries e repetições em branco e preencher durante o treino.</p>
      <button class="primary full" type="submit">✓ Salvar exercício</button>
      <button class="secondary full" type="button" onclick="viewTraining('${code}')">Cancelar</button>
    </form>`);
  setTimeout(()=>document.getElementById("newExerciseName")?.focus(),50);
}

function saveCustomExercise(code, intoPlan=false){
  const name=document.getElementById("newExerciseName")?.value.trim();
  const section=document.getElementById("newExerciseSection")?.value.trim() || "Outros";
  const sets=document.getElementById("newExerciseSets")?.value.trim() || "";
  const reps=document.getElementById("newExerciseReps")?.value.trim() || "";
  if(!name){ alert("Informe o nome do exercício."); return; }
  const id=`custom-${code}-${Date.now()}`;
  db.customExercises[code].push({id,name,section,sets,reps});
  if(intoPlan){ ensureWorkoutPlan(code).push({id,name,section,sets,reps,custom:true,source:'Criado neste treino',enabled:true}); }
  save();
  intoPlan ? editTraining(code) : viewTraining(code);
}

function viewTraining(code){
  const t=TRAININGS[code];
  const ex=flatTraining(code);
  const groups=[...new Set(ex.map(e=>e.section||"Outros"))];

  const sectionsHtml=groups.map(sec=>{
    const rows=ex.filter(e=>(e.section||"Outros")===sec).map((e,i)=>
      `<div class="exercise-row">
        <div><b>${i+1}. ${esc(f2DisplayName(e.name))}</b>
        <small>${e.sets?esc(e.sets)+' séries':'Séries não informadas'}${e.reps?' • '+esc(e.reps):''}</small></div>
      </div>`).join("");
    return `<section class="section"><div class="section-title">${esc(sec)}</div>${rows}</section>`;
  }).join("");

  layout(`<button class="back" onclick="go('trainings')"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Voltar</span></button>
    <div class="detail-head"><span class="badge">${code}</span><div><h2>${esc(trainingName(code))}</h2><p>Apresentação do treino • ${t.muscles.join(" • ")}</p></div></div>
    ${sectionsHtml || '<div class="empty big">Nenhum exercício ativo neste treino.</div>'}
    ${ex.length?`<button class="primary full" onclick="startWorkout('${code}')"><span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"></path></svg></span>Iniciar treino</button>`:''}
    <button class="secondary full" onclick="editTraining('${code}')"><span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 16-.8 4 4-.8L19 8.4a2.1 2.1 0 0 0-3-3Z"></path><path d="m14.5 6.5 3 3"></path></svg></span>Editar treino</button>
  `,"trainings");
}

function startWorkout(code){
  const migrated=db.myWorkouts?.find(w=>w.id===`legacy-${code}`);if(migrated)return startWorkoutById(migrated.id);
  const w=db.myWorkouts?.find(w=>w.name===trainingName(code));if(w)return startWorkoutById(w.id);
  return startWorkoutById(db.myWorkouts?.[0]?.id);
}

/* =========================================================
   RUNTIME DE EXECUÇÃO — helpers compartilhados
   ========================================================= */
function currentExercise(){ return state.workout?.exercises?.[state.exerciseIndex]; }
function exerciseSetCount(e){ const n=parseInt(e?.prescribedSets,10); return Number.isFinite(n) && n>0 ? n : 0; }
function nextPendingSetIndex(e){
  const ex=state.workout?.exercises?.[state.exerciseIndex];
  const count=exerciseSetCount(e);
  if(!ex || !count) return -1;
  while(ex.sets.length<count) ex.sets.push({number:ex.sets.length+1,reps:"",weight:"",done:false,completedAt:null});
  for(let i=Math.max(0,state.currentSetIndex);i<count;i++) if(!ex.sets[i].done) return i;
  for(let i=0;i<count;i++) if(!ex.sets[i].done) return i;
  return -1;
}
function stopIntervals(){
  if(state.timerInterval) clearInterval(state.timerInterval);
  if(state.restInterval) clearInterval(state.restInterval);
  state.timerInterval=null; state.restInterval=null;
  state.exerciseRunning=false; state.restRunning=false;
}
function beep(){
  if(!db.settings.sound) return;
  try{
    const c=new(window.AudioContext||window.webkitAudioContext)();
    const o=c.createOscillator(), g=c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.value=880; g.gain.value=.05;
    o.start(); o.stop(c.currentTime+.18);
  }catch(e){}
}
function getExerciseDuration(){const n=Number(db.settings?.exerciseDuration);return Number.isFinite(n)&&n>0?n:DEFAULT_EXERCISE_SECONDS;}
function getRestDuration(){const n=Number(db.settings?.restDuration ?? db.settings?.rest);return Number.isFinite(n)&&n>0?n:DEFAULT_REST_SECONDS;}
function updateTimers(){
  const a=document.getElementById("exerciseTimer"); if(a)a.textContent=fmt(state.exerciseTimer);
  const b=document.getElementById("restTimer"); if(b)b.textContent=fmtShort(state.restRunning?state.restTimer:getRestDuration());
  const c=document.getElementById("workoutTimer"); if(c&&state.workoutTimerStart)c.textContent=fmt((Date.now()-state.workoutTimerStart)/1000);
}
function confirmExitWorkout(){
  if(confirm("Sair do treino? O treino em andamento não será salvo.")){ stopIntervals(); state.workout=null; go("home"); }
}

/* =========================================================
   CONFIGURAÇÕES E BACKUP
   ========================================================= */
function saveTrainingSettings(){
  const exerciseInput=document.getElementById("settingExerciseDuration");
  const restInput=document.getElementById("settingRestDuration");
  const exercise=Number.parseInt(exerciseInput?.value,10);
  const rest=Number.parseInt(restInput?.value,10);
  if(!Number.isFinite(exercise)||exercise<5||exercise>600){alert("Informe uma duração de exercício entre 5 e 600 segundos.");exerciseInput?.focus();return;}
  if(!Number.isFinite(rest)||rest<5||rest>600){alert("Informe um descanso entre 5 e 600 segundos.");restInput?.focus();return;}
  db.settings.exerciseDuration=exercise;
  db.settings.restDuration=rest;
  db.settings.rest=rest;
  save();
  openSettings();
}
function openSettings(){
  const user=getCurrentUser();
  const exerciseDuration=getExerciseDuration();
  const restDuration=getRestDuration();
  layout(`<button class="back" onclick="go('home')"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Voltar</span></button><h2>Configurações</h2>
    <section class="settings-card">
      <h3>Preferências</h3>
      <label class="switch">Vibração <input type="checkbox" ${db.settings.vibration?'checked':''} onchange="db.settings.vibration=this.checked;save()"></label>
      <label class="switch">Som <input type="checkbox" ${db.settings.sound?'checked':''} onchange="db.settings.sound=this.checked;save()"></label>
    </section>
    <section class="settings-card">
      <h3>Tempos do treino</h3>
      <p class="muted">Defina quanto tempo dura cada série e o intervalo automático entre séries.</p>
      <div class="settings-time-grid">
        <label>Duração do exercício<input id="settingExerciseDuration" type="number" min="5" max="600" step="1" value="${exerciseDuration}" inputmode="numeric" autocomplete="off"><span class="field-unit">segundos</span></label>
        <label>Duração do descanso<input id="settingRestDuration" type="number" min="5" max="600" step="1" value="${restDuration}" inputmode="numeric" autocomplete="off"><span class="field-unit">segundos</span></label>
      </div>
      <button class="primary full" onclick="saveTrainingSettings()">Salvar configurações</button>
    </section>
    <section class="settings-card"><h3>Conta</h3>
      <p class="muted">Conectado como <b>${esc(user?.name||"—")}</b>${user?.email?` • ${esc(user.email)}`:""}</p>
      <button class="secondary full" onclick="logoutUser()">Sair da conta</button>
    </section>`);
}
function exportData(){
  const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="meu-treino-backup.json"; a.click();
  URL.revokeObjectURL(a.href);
}
function importData(file){
  if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const x=JSON.parse(r.result);
      if(!x || typeof x!=="object" || !Array.isArray(x.workouts)) throw new Error("formato");
      db=x;
      if(!Array.isArray(db.users)) db.users=[];
      if(!Array.isArray(db.workoutHistory)) db.workoutHistory=[];
      if(!db.settings) db.settings=JSON.parse(JSON.stringify(DEFAULTS.settings));
      ensureAuthState(); ensurePhase2Data(); save();
      openSettings(); alert("Dados importados com sucesso.");
    }catch(e){ alert("Arquivo inválido."); }
  };
  r.readAsText(file);
}
function clearData(){
  if(!confirm("Apagar todo o histórico? Esta ação não pode ser desfeita.")) return;
  db.workouts=[]; db.workoutHistory=[];
  save(); openSettings();
}

/* =========================================================
   FASE 2 — MÚLTIPLOS TREINOS / GRUPOS / EXERCÍCIOS / HISTÓRICO
   ========================================================= */
const F2_GROUPS = ["Peito","Costas","Bíceps","Tríceps","Ombros","Trapézio","Quadríceps","Posterior de coxa","Glúteos","Panturrilhas","Abdômen","Lombar","Antebraços","Adutores","Abdutores"];
function parseSetNumber(v){ const m=String(v??"").match(/\d+/); return m?Math.max(1,parseInt(m[0],10)):0; }
function repsForSet(reps,i){ const parts=String(reps||"").split("/").map(x=>x.trim()).filter(Boolean); return parts[i] || parts[parts.length-1] || ""; }
function cloneJSON(x){ return JSON.parse(JSON.stringify(x)); }
function normalizeWorkout(w){
  return {
    id:w.id||uid("treino-"), name:String(w.name||"Treino Personalizado"), description:String(w.description||""), level:w.level||"Personalizado",
    active:w.active!==false, createdAt:w.createdAt||new Date().toISOString(), updatedAt:w.updatedAt||new Date().toISOString(),
    aiGenerated:!!w.aiGenerated, aiNotes:Array.isArray(w.aiNotes)?w.aiNotes:[],
    groups:Array.isArray(w.groups)?w.groups.map((g,gi)=>({
      id:g.id||uid("grupo-"), name:g.name||"Outros", order:g.order??gi,
      exercises:Array.isArray(g.exercises)?g.exercises.map((e,ei)=>({
        id:e.id||uid("ex-"), name:String(e.name||"Exercício"), equipment:e.equipment||"", order:e.order??ei,
        seriesCount:Number(e.seriesCount||e.sets?.length||0),
        sets:Array.isArray(e.sets)?e.sets.map((s,si)=>({number:si+1,reps:String(s.reps??""),weight:String(s.weight??""),done:!!s.done,completedAt:s.completedAt||null})):[]
      })):[]
    })):[]
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
  return normalizeWorkout({
    id:`legacy-${code}`, name, description:"Treino migrado da versão anterior", level:"Básico", active:true,
    groups:Object.entries(grouped).map(([g,ex],i)=>({id:`legacy-${code}-g-${i}`,name:g,order:i,exercises:ex}))
  });
}
function ensurePhase2Data(){
  if(!Array.isArray(db.myWorkouts)){
    db.myWorkouts=["A","B","C"].map(c=>buildMigratedWorkout(c, c==="A"?"Treino Básico":`Treino ${c}`));
  }
  db.myWorkouts=db.myWorkouts.map(normalizeWorkout);
  if(!Array.isArray(db.workoutHistory)) db.workoutHistory=[];
  save();
}
function getMyWorkout(id){ ensurePhase2Data(); return db.myWorkouts.find(w=>w.id===id); }
function workoutExerciseCount(w){ return w.groups.reduce((n,g)=>n+g.exercises.length,0); }
function workoutSetTotal(w){ return w.groups.reduce((n,g)=>n+g.exercises.reduce((m,e)=>m+(e.seriesCount||e.sets.length||0),0),0); }
function saveMyWorkouts(){ db.myWorkouts=db.myWorkouts.map(normalizeWorkout); save(); }
function f2EscapeAttr(s){ return esc(String(s)).replace(/`/g,"&#96;"); }
function f2DisplayName(value){
  const text=String(value??"").trim();
  if(!text) return "";
  return text.toLocaleLowerCase("pt-BR").replace(/(^|[\s\-/])([a-záàâãéêíóôõúç])/giu,(_,sep,ch)=>sep+ch.toLocaleUpperCase("pt-BR"));
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
        title="Excluir treino"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>

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
          <div class="exercise-count">${count} ${count===1?'exercício':'exercícios'}</div>
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
          <span class="f2-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"></path></svg></span>
          <span>Iniciar</span>
        </button>

        <button class="secondary f2-edit-action"
          onclick="event.stopPropagation();editMyWorkout('${w.id}')"
          aria-label="Editar treino"
          title="Editar treino">
          <span class="f2-edit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 16-.8 4 4-.8L19 8.4a2.1 2.1 0 0 0-3-3Z"></path><path d="m14.5 6.5 3 3"></path></svg></span>
          <span>Editar</span>
        </button>
      </div>
    </article>`;
}
function deleteMyWorkout(id){
  const w=getMyWorkout(id);
  if(!w) return;
  const name=f2DisplayName(w.name);
  if(!confirm(`Excluir treino?\n\nVocê deseja excluir o treino "${name}"?\n\nOs registros desse treino no histórico serão mantidos.`)) return;
  w.active=false;
  w.updatedAt=new Date().toISOString();
  saveMyWorkouts();
  renderTrainings();
}
function renderTrainings(){
  ensurePhase2Data();
  const cards=db.myWorkouts.filter(w=>w.active!==false).map(f2WorkoutCard).join("");
  const aiAction=aiPlanningIsConfigured()
    ? `<button class="secondary ai-planning-button" onclick="renderAiPlanner()">✨ Planejar com IA</button>`
    : `<div class="ai-planning-unavailable">✨ Planejamento com IA indisponível. Configure <code>config.js</code> para ativar.</div>`;
  layout(`${aiAction}<div class="training-grid">${cards||'<div class="empty big">Nenhum treino ativo.</div>'}</div>`,"trainings");
}
function renderNewWorkout(){
  layout(`
    <button class="back edit-back" onclick="go('trainings')" aria-label="Voltar" title="Voltar">
      <span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Meus Treinos</span>
    </button>

    <div class="detail-head edit-detail-head">
      <div>
        <h2>Novo Treino</h2>
        <p>Cadastre as informações básicas do seu novo treino.</p>
      </div>
    </div>

    <section class="settings-card new-workout-form">
      <label>Nome
        <input id="newWorkoutName" maxlength="80" placeholder="Ex.: Treino de Peito e Tríceps" autocomplete="off">
      </label>
      <label>Descrição
        <textarea id="newWorkoutDescription" rows="2" maxlength="180" placeholder="Opcional"></textarea>
      </label>
      <label>Nível
        <select id="newWorkoutLevel">
          ${['Básico','Intermediário','Avançado','Personalizado'].map(x=>`<option>${x}</option>`).join('')}
        </select>
      </label>
    </section>

    <p class="form-hint">Depois de criar o treino, você poderá adicionar grupos musculares e exercícios na tela de edição.</p>

    <button class="primary full" onclick="createMyWorkoutFromForm()">＋ Criar Treino</button>
  `,'training-new');
  setTimeout(()=>document.getElementById("newWorkoutName")?.focus(),50);
}
function createMyWorkoutFromForm(){
  const name=document.getElementById("newWorkoutName")?.value.trim();
  if(!name){ alert("Informe o nome do treino."); document.getElementById("newWorkoutName")?.focus(); return; }
  const w=normalizeWorkout({
    id:uid("treino-"), name,
    level:document.getElementById("newWorkoutLevel")?.value||"Personalizado",
    description:document.getElementById("newWorkoutDescription")?.value.trim()||"",
    groups:[]
  });
  ensurePhase2Data();
  db.myWorkouts.push(w);
  saveMyWorkouts();
  editMyWorkout(w.id);
}
function createMyWorkout(){ renderNewWorkout(); }
function editMyWorkout(id){
  const w=getMyWorkout(id); if(!w) return;
  const legacyDescription="Treino migrado da versão anterior";
  const displayDescription=String(w.description||"").trim()===legacyDescription ? "" : String(w.description||"");
  const groups=w.groups.slice().sort((a,b)=>a.order-b.order).map((g,gi)=>`<section class="settings-card f2-group"><div class="page-title-row"><div><h3>${esc(f2DisplayName(g.name))}</h3><small>${g.exercises.length} exercício(s)</small></div><div class="f2-actions" aria-label="Ações do grupo">
      <button class="iconbtn" onclick="moveMyGroup('${id}',${gi},-1)" aria-label="Mover grupo para cima" title="Mover grupo para cima"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 11 6-6 6 6M12 5v14"></path></svg></button>
      <button class="iconbtn" onclick="moveMyGroup('${id}',${gi},1)" aria-label="Mover grupo para baixo" title="Mover grupo para baixo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 13 6 6 6-6M12 19V5"></path></svg></button>
      <button class="iconbtn" onclick="renameMyGroup('${id}','${g.id}')" aria-label="Renomear grupo muscular" title="Renomear grupo muscular"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16-.8 4 4-.8L19 8.4a2.1 2.1 0 0 0-3-3Z"></path><path d="m14.5 6.5 3 3"></path></svg></button>
      <button class="iconbtn" onclick="removeMyGroup('${id}','${g.id}')" aria-label="Excluir grupo muscular" title="Excluir grupo muscular"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
    </div></div>
    ${g.exercises.slice().sort((a,b)=>a.order-b.order).map((e,ei)=>`<div class="exercise-row f2-exercise"><div><b>${ei+1}. ${esc(f2DisplayName(e.name))}</b><small>${e.seriesCount||e.sets.length||0} série(s)${e.equipment?' • '+esc(e.equipment):''}</small></div><div class="f2-actions" aria-label="Ações do exercício"><button class="iconbtn" onclick="moveMyExercise('${id}','${g.id}','${e.id}',-1)" aria-label="Mover exercício para cima" title="Mover exercício para cima"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 11 6-6 6 6M12 5v14"></path></svg></button><button class="iconbtn" onclick="moveMyExercise('${id}','${g.id}','${e.id}',1)" aria-label="Mover exercício para baixo" title="Mover exercício para baixo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 13 6 6 6-6M12 19V5"></path></svg></button><button class="iconbtn" onclick="configureMyExercise('${id}','${g.id}','${e.id}')" aria-label="Editar exercício" title="Editar exercício"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16-.8 4 4-.8L19 8.4a2.1 2.1 0 0 0-3-3Z"></path><path d="m14.5 6.5 3 3"></path></svg></button><button class="iconbtn" onclick="removeMyExercise('${id}','${g.id}','${e.id}')" aria-label="Excluir exercício" title="Excluir exercício"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button></div></div>`).join("")}
    <button class="secondary full" onclick="addExerciseToMyGroup('${id}','${g.id}')">＋ Adicionar Exercício</button></section>`).join("");
  layout(`<button class="back edit-back" onclick="go('trainings')" aria-label="Voltar" title="Voltar"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Meus Treinos</span></button><div class="detail-head edit-detail-head"><div><h2>${esc(f2DisplayName(w.name))}</h2></div></div>
    <section class="settings-card"><label>Nome<input id="f2Name" value="${f2EscapeAttr(w.name)}"></label><label>Descrição<textarea id="f2Desc" rows="2">${esc(displayDescription)}</textarea></label><label>Nível<select id="f2Level">${['Básico','Intermediário','Avançado','Personalizado'].map(x=>`<option ${x===w.level?'selected':''}>${x}</option>`).join('')}</select></label></section>
    <div class="groups-title-row"><h3>Grupos Musculares</h3><button class="iconbtn group-add-btn" onclick="addMyGroup('${id}')" aria-label="Adicionar grupo muscular" title="Adicionar grupo muscular"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button></div>
    ${groups||'<div class="empty">Adicione o primeiro grupo muscular.</div>'}
    <button class="primary full" onclick="saveMyWorkoutHeader('${id}')">✓ Salvar Treino</button>`,"training-edit");
}
function saveMyWorkoutHeader(id){
  const w=getMyWorkout(id); if(!w) return;
  const name=document.getElementById("f2Name")?.value.trim();
  if(!name){ alert("Informe o nome do treino."); return; }
  w.name=name;
  w.description=document.getElementById("f2Desc")?.value.trim()||"";
  w.level=document.getElementById("f2Level")?.value||w.level;
  w.updatedAt=new Date().toISOString();
  saveMyWorkouts();
  go("trainings");
}
function addMyGroup(id){
  const w=getMyWorkout(id); if(!w) return;
  const choice=prompt("Nome do grupo muscular:",F2_GROUPS[0]);
  if(!choice?.trim()) return;
  w.groups.push({id:uid("grupo-"),name:choice.trim(),order:w.groups.length,exercises:[]});
  saveMyWorkouts(); editMyWorkout(id);
}
function renameMyGroup(wid,gid){const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;const n=prompt("Nome do grupo muscular:",g.name);if(n?.trim()){g.name=n.trim();w.updatedAt=new Date().toISOString();saveMyWorkouts();editMyWorkout(wid);}}
function removeMyGroup(wid,gid){const w=getMyWorkout(wid);if(!w)return;if(confirm("Remover este grupo e seus exercícios?")){w.groups=w.groups.filter(g=>g.id!==gid);w.groups.forEach((g,i)=>g.order=i);saveMyWorkouts();editMyWorkout(wid);}}
function moveMyGroup(wid,index,delta){const w=getMyWorkout(wid);if(!w)return;const a=w.groups.sort((x,y)=>x.order-y.order),j=index+delta;if(j<0||j>=a.length)return;[a[index],a[j]]=[a[j],a[index]];a.forEach((g,i)=>g.order=i);saveMyWorkouts();editMyWorkout(wid);}
function addExerciseToMyGroup(wid,gid){
  const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid); if(!g) return;
  const all=allExerciseLibrary().filter((e,i,a)=>a.findIndex(x=>x.name.toLowerCase()===e.name.toLowerCase())===i);
  const q=prompt("Digite o nome do exercício (ou parte dele):",""); if(q===null) return;
  const matches=all.filter(e=>e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const chosen=matches[0]||{name:q.trim(),section:g.name,sets:"",reps:"",custom:true};
  if(!chosen.name) return alert("Informe o nome do exercício.");
  const n=parseSetNumber(chosen.sets),sets=[];
  for(let i=0;i<n;i++) sets.push({number:i+1,reps:repsForSet(chosen.reps,i),weight:"",done:false,completedAt:null});
  g.exercises.push({id:uid("ex-"),name:chosen.name,equipment:chosen.equipment||"",order:g.exercises.length,seriesCount:n,sets});
  w.updatedAt=new Date().toISOString(); saveMyWorkouts(); editMyWorkout(wid);
}
function removeMyExercise(wid,gid,eid){const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;if(confirm("Remover este exercício do treino?")){g.exercises=g.exercises.filter(e=>e.id!==eid);g.exercises.forEach((e,i)=>e.order=i);saveMyWorkouts();editMyWorkout(wid);}}
function moveMyExercise(wid,gid,eid,delta){const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid);if(!g)return;const a=g.exercises.sort((x,y)=>x.order-y.order),i=a.findIndex(e=>e.id===eid),j=i+delta;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];a.forEach((e,k)=>e.order=k);saveMyWorkouts();editMyWorkout(wid);}
function configureMyExercise(wid,gid,eid){
  const w=getMyWorkout(wid),g=w?.groups.find(x=>x.id===gid),e=g?.exercises.find(x=>x.id===eid); if(!e) return;
  const n=prompt("Quantidade de séries:",String(e.seriesCount||e.sets.length||1)); if(n===null) return;
  const count=Math.max(0,parseInt(n,10)||0);
  e.seriesCount=count;
  e.sets=Array.from({length:count},(_,i)=>e.sets[i]||{number:i+1,reps:"",weight:"",done:false,completedAt:null});
  for(let i=0;i<count;i++) e.sets[i].number=i+1;
  const reps=prompt("Repetições padrão (opcional):",e.sets[0]?.reps||"");
  if(reps!==null&&reps.trim()) e.sets.forEach(s=>{ if(!s.reps) s.reps=reps.trim(); });
  saveMyWorkouts(); editMyWorkout(wid);
}
function duplicateMyWorkout(id){
  const w=getMyWorkout(id); if(!w) return;
  const copy=cloneJSON(w);
  copy.id=uid("treino-"); copy.name=`${w.name} (cópia)`;
  copy.createdAt=new Date().toISOString(); copy.updatedAt=copy.createdAt;
  copy.groups=copy.groups.map(g=>{g.id=uid("grupo-");g.exercises=g.exercises.map(e=>{e.id=uid("ex-");e.sets=e.sets.map(s=>({...s,done:false,completedAt:null}));return e;});return g;});
  db.myWorkouts.push(normalizeWorkout(copy)); save(); renderTrainings();
}
function toggleMyWorkout(id){const w=getMyWorkout(id);if(!w)return;w.active=w.active===false;w.updatedAt=new Date().toISOString();save();renderTrainings();}
function flattenMyWorkout(w){
  const out=[];
  w.groups.slice().sort((a,b)=>a.order-b.order).forEach(g=>g.exercises.slice().sort((a,b)=>a.order-b.order).forEach(e=>out.push({
    id:e.id, section:g.name, name:e.name,
    prescribedSets:String(e.seriesCount||e.sets.length||""),
    prescribedReps:e.sets.map(s=>s.reps).filter(Boolean).join("/")||"",
    sets:cloneJSON(e.sets||[]), groupId:g.id
  })));
  return out;
}
function startWorkoutById(id){
  const w=getMyWorkout(id); if(!w) return;
  const ex=flattenMyWorkout(w);
  if(!ex.length) return alert("Adicione pelo menos um exercício ao treino.");
  stopIntervals();
  state.page="workout"; state.training=id; state.workoutDefinitionId=id;
  state.exerciseIndex=0; state.exerciseTimer=0; state.exerciseRunning=false; state.exerciseStartedAt=null;
  state.currentSetIndex=0; state.restTimer=0; state.restRunning=false;
  state.workout={
    id:uid("exec-"), workoutId:id, type:w.name, date:todayISO(),
    startedAt:new Date().toISOString(), totalTime:0,
    exercises:ex.map(e=>({...e,duration:0,sets:e.sets.length?e.sets.map(s=>({...s,done:false,completedAt:null})):[]}))
  };
  state.workoutTimerStart=Date.now();
  renderWorkout();
}

/* Calendário: mês visível. */
let calDate=new Date();
function changeMonth(delta){ calDate=new Date(calDate.getFullYear(),calDate.getMonth()+delta,1); renderCalendar(); }

function f2CurrentSet(){const e=currentExercise(),count=exerciseSetCount(e);if(!count)return null;while(e.sets.length<count)e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});return e.sets[Math.min(state.currentSetIndex,count-1)];}
function exerciseReadyForStart(exercise){const count=exerciseSetCount(exercise);if(!count)return {ok:false,message:"Configure a quantidade de séries para este exercício."};const ex=state.workout?.exercises?.[state.exerciseIndex];if(!ex)return {ok:false,message:"Exercício inválido."};const idx=Math.min(Math.max(state.currentSetIndex,0),count-1),set=ex.sets?.[idx]||{reps:"",weight:""};if(!String(set.weight??"").trim())return {ok:false,message:`Informe a carga da série ${idx+1} antes de iniciar.`};if(!String(set.reps??"").trim())return {ok:false,message:`Informe as repetições da série ${idx+1} antes de iniciar.`};return {ok:true,index:idx};}
function startExerciseTimer(){if(state.restRunning||state.exerciseRunning)return;const e=currentExercise();if(allSetsDone(e))return;const ready=exerciseReadyForStart(e);if(!ready.ok){alert(ready.message);return;}state.currentSetIndex=ready.index;state.exerciseTimer=0;state.exerciseRunning=true;state.exerciseStartedAt=Date.now();startMainTick();renderWorkout();}
function startMainTick(){if(state.timerInterval)clearInterval(state.timerInterval);state.timerInterval=setInterval(()=>{if(state.exerciseRunning&&state.exerciseStartedAt){state.exerciseTimer=(Date.now()-state.exerciseStartedAt)/1000;if(state.exerciseTimer>=getExerciseDuration()){state.exerciseTimer=getExerciseDuration();state.exerciseRunning=false;state.exerciseStartedAt=null;clearInterval(state.timerInterval);state.timerInterval=null;if(navigator.vibrate&&db.settings.vibration)navigator.vibrate([250,120,250]);beep();startRest();return;}}updateTimers();},100);}
function startRest(){if(state.restRunning)return;const e=currentExercise(),count=exerciseSetCount(e);if(!count)return;const ex=state.workout.exercises[state.exerciseIndex];while(ex.sets.length<count)ex.sets.push({number:ex.sets.length+1,reps:"",weight:"",done:false,completedAt:null});state.restRunning=true;state.restTimer=getRestDuration();if(state.restInterval)clearInterval(state.restInterval);state.restInterval=setInterval(()=>{state.restTimer-=1;updateTimers();if(state.restTimer<=0)finishRestAndEnableNextSeries();},1000);renderWorkout();}
function stopRest(){return;}
function finishRestAndEnableNextSeries(){if(!state.restRunning)return;if(state.restInterval)clearInterval(state.restInterval);state.restInterval=null;state.restRunning=false;state.restTimer=0;const e=currentExercise(),count=exerciseSetCount(e),ex=state.workout.exercises[state.exerciseIndex],idx=Math.min(state.currentSetIndex,count-1);if(ex.sets[idx]){ex.sets[idx].done=true;ex.sets[idx].completedAt=new Date().toISOString();}if(navigator.vibrate&&db.settings.vibration)navigator.vibrate([250,120,250]);beep();state.exerciseTimer=0;state.exerciseStartedAt=null;state.exerciseOneMinuteAlerted=false;e.completed=allSetsDone(e);if(e.completed){e.duration=(e.duration||0);if(state.exerciseIndex<state.workout.exercises.length-1){state.exerciseIndex++;state.currentSetIndex=0;state.exerciseTimer=0;state.exerciseRunning=false;renderWorkout();}else{finishWorkout();}}else{state.currentSetIndex=idx+1;renderWorkout();}}
function finishExercise(){return;}
function pauseExerciseTimer(){return;}
function resetExerciseTimer(){return;}
function prevExercise(){return;}
function renderSets(e){const count=exerciseSetCount(e);if(!count)return `<div class="empty">Configure a quantidade de séries antes de iniciar este exercício.</div>`;while(e.sets.length<count)e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});return e.sets.slice(0,count).map((s,i)=>`<div class="set-row"><span class="setnum">${i+1}</span><input value="${esc(s.reps)}" placeholder="reps" onchange="setValue(${i},'reps',this.value)"><input value="${esc(s.weight)}" placeholder="kg" inputmode="decimal" onchange="setValue(${i},'weight',this.value)"><span class="check ${s.done?'done':''}">${s.done?'✓':'○'}</span></div>`).join("");}
function renderWorkout(){const e=currentExercise(),all=state.workout.exercises,last=(db.workouts||[]).flatMap(w=>w.exercises||[]).slice().reverse().find(x=>x.name===e.name)||null,progress=Math.round(((state.exerciseIndex+1)/all.length)*100),count=exerciseSetCount(e),doneSets=count?e.sets.slice(0,count).filter(s=>s.done).length:0,complete=allSetsDone(e),setLabel=count?`Série ${Math.min(state.currentSetIndex+1,count)} de ${count}`:"Série não configurada";layout(`<div class="workout-header"><button class="back" onclick="confirmExitWorkout()"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Sair</span></button><span class="pill">${esc(state.workout.type)}</span></div><div class="workout-progress"><div style="width:${progress}%"></div></div><div class="workout-meta"><span>Exercício ${state.exerciseIndex+1} de ${all.length}</span><b id="workoutTimer">${fmt((Date.now()-state.workoutTimerStart)/1000)}</b></div><section class="focus-card" data-state="${state.restRunning?"resting":state.exerciseRunning?"running":"idle"}"><span class="eyebrow">${esc(e.section)}</span><h2>${esc(f2DisplayName(e.name))}</h2><div class="prescription">${e.prescribedSets||"Configure as séries"}${e.prescribedReps?` <span>×</span> ${esc(e.prescribedReps)}`:""}</div><div class="set-status">${setLabel} • ${doneSets}${count?' de '+count:''} concluída(s)</div><div class="big-timer" id="exerciseTimer">${fmt(state.exerciseTimer)}</div>
      <div class="timer-actions"><button class="timer-start" onclick="startExerciseTimer()" ${complete||state.restRunning||state.exerciseRunning?'disabled':''}>${state.restRunning?'⏳ Descanso...':state.exerciseRunning?'⏱ Série em Execução':state.currentSetIndex>0?'▶ Iniciar Próxima Série':'▶ Iniciar Série'}</button></div>
      
      ${complete?'<div class="exercise-completed">✓ Exercício concluído</div>':''}
    </section>
    <section class="rest-card"><div><span class="eyebrow">DESCANSO AUTOMÁTICO</span><b id="restTimer">${fmtShort(state.restRunning?state.restTimer:getRestDuration())}</b></div></section>
    ${last&&last.sets?.length?`<div class="last-load">Último registro: ${last.sets.map(s=>(s.weight?s.weight+" kg":"sem carga")).join(" • ")}</div>`:""}
    <section class="sets-card"><div class="section-title">Séries e carga</div>${renderSets(e)}</section>`,"home");if(state.exerciseRunning)startMainTick();updateTimers();}
function setValue(i,k,v){const e=currentExercise();if(e?.sets?.[i]){e.sets[i][k]=v;}}
function toggleSet(){return;}
function allSetsDone(e){const count=exerciseSetCount(e);if(!count)return false;while(e.sets.length<count)e.sets.push({number:e.sets.length+1,reps:"",weight:"",done:false,completedAt:null});return e.sets.slice(0,count).every(s=>s.done);}
function finishWorkout(){if(!state.workout)return;const done=state.workout;stopIntervals();done.totalTime=Math.round((Date.now()-state.workoutTimerStart)/1000);done.endTime=new Date().toISOString();done.completedExercises=done.exercises.filter(e=>e.completed).length;done.totalSets=done.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);const duplicate=db.workoutHistory.some(h=>h.workoutId===done.workoutId&&h.executionDate===done.date&&Math.abs(new Date(h.completedAt)-new Date(done.endTime))<60000);if(!duplicate){db.workoutHistory.push({id:uid('hist-'),workoutId:done.workoutId,name:done.type,date:done.date,executionDate:done.date,startedAt:done.startedAt,completedAt:done.endTime,totalTime:done.totalTime,completedExercises:done.completedExercises,totalSets:done.totalSets,workoutSnapshot:cloneJSON(done)});db.workouts.push(done);save();}state.workout=null;renderCompletion(done);}
function renderCompletion(done){layout(`<section class="complete"><div class="complete-icon">✓</div><span class="eyebrow">TREINO FINALIZADO</span><h2>Excelente trabalho!</h2><p><b>${esc(done.type)}</b> concluído automaticamente em ${dateBR(done.date)}.</p><div class="summary-grid"><div><b>${fmt(done.totalTime)}</b><span>tempo total</span></div><div><b>${done.completedExercises}</b><span>exercícios</span></div><div><b>${done.totalSets}</b><span>séries</span></div></div><button class="primary full" onclick="go('calendar')">Ver no calendário</button><button class="secondary full" onclick="go('home')">Voltar ao início</button></section>`);}
function renderCalendar(){const y=calDate.getFullYear(),m=calDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),offset=(first+6)%7,cells=[];for(let i=0;i<offset;i++)cells.push('<div class="cal-day empty"></div>');for(let d=1;d<=days;d++){const iso=`${y}-${pad(m+1)}-${pad(d)}`,ws=(db.workoutHistory||[]).filter(w=>w.date===iso);cells.push(`<button class="cal-day ${ws.length?'has':''}" onclick="calendarDay('${iso}')"><span>${d}</span>${ws.map(w=>`<i>✓ ${esc(f2DisplayName(w.name))}</i><em>${fmtShort(w.totalTime||0)}</em>`).join("")}</button>`);}layout(`<div class="calendar-head"><button class="iconbtn" onclick="changeMonth(-1)" aria-label="Mês anterior" title="Mês anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"></path></svg></button><h2>${monthLabel(y,m)}</h2><button class="iconbtn" onclick="changeMonth(1)" aria-label="Próximo mês" title="Próximo mês"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg></button></div><div class="week"><b>SEG</b><b>TER</b><b>QUA</b><b>QUI</b><b>SEX</b><b>SÁB</b><b>DOM</b></div><div class="calendar">${cells.join("")}</div>`,"calendar");}
function calendarDay(iso){const ws=(db.workoutHistory||[]).filter(w=>w.date===iso);layout(`<button class="back" onclick="renderCalendar()"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Calendário</span></button><span class="pill">${dateBR(iso)}</span><h2>${ws.length?'Treinos realizados':'Nenhum treino registrado'}</h2>${ws.map(w=>`<button class="list-card" onclick="showWorkoutDetails('${w.id}')"><span class="badge">✓</span><div><b>${esc(f2DisplayName(w.name))}</b><small>${fmt(w.totalTime)} • ${w.completedExercises||0} exercícios • ${w.totalSets||0} séries</small></div><span>›</span></button>`).join("")} ${!ws.length?'<div class="empty big">Este dia ainda não possui treino concluído.</div>':''}`,'calendar');}
function showWorkoutDetails(id){const h=(db.workoutHistory||[]).find(x=>x.id===id)|| (db.workouts||[]).find(x=>x.id===id);if(!h)return;const w=h.workoutSnapshot||h;layout(`<button class="back" onclick="calendarDay('${h.date}')"><span class="back-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"></path></svg></span><span>Voltar</span></button><span class="pill">✓ TREINO CONCLUÍDO</span><h2>${esc(f2DisplayName(h.name||w.type))}</h2><div class="stats"><div><b>${dateBR(h.date)}</b><span>data</span></div><div><b>${fmt(h.totalTime||0)}</b><span>tempo</span></div><div><b>${h.totalSets||0}</b><span>séries</span></div></div><div class="section">${(w.exercises||[]).map((e,i)=>`<div class="exercise-row"><div><b>${i+1}. ${esc(f2DisplayName(e.name))}</b><small>${(e.sets||[]).filter(s=>s.done).length} séries concluídas</small></div></div>`).join('')}</div>`,'calendar');}
function renderHistory(){const list=[...(db.workoutHistory||[])].reverse();layout(`<h2>Histórico</h2><p class="muted">${list.length} treino(s) concluído(s).</p>${list.length?`<div class="list">${list.map(w=>`<button class="list-card" onclick="showWorkoutDetails('${w.id}')"><span class="badge">✓</span><div><b>${esc(f2DisplayName(w.name))}</b><small>${dateBR(w.date)} • ${fmt(w.totalTime)} • ${w.completedExercises||0} exercícios</small></div><span>›</span></button>`).join('')}</div>`:'<div class="empty big">Ainda não há treinos concluídos.</div>'}`,'history');}
function manualRegister(date,type){const w=db.myWorkouts?.find(x=>x.id===`legacy-${type}`);if(!w)return;const id=uid('hist-');db.workoutHistory.push({id,workoutId:w.id,name:w.name,date,executionDate:date,startedAt:null,completedAt:null,totalTime:0,completedExercises:workoutExerciseCount(w),totalSets:workoutSetTotal(w),manual:true,workoutSnapshot:{type:w.name,date,exercises:flattenMyWorkout(w)}});save();calendarDay(date);}
function renderDashboard(){
  const recent=db.workouts[db.workouts.length-1];
  const month=todayISO().slice(0,7);
  const monthWorkouts = db.workouts.filter(w => w.date.startsWith(month));
  const count = monthWorkouts.length;
  const total = monthWorkouts.reduce((sum, w) => sum + (w.totalTime || 0), 0);
  const exercisesDone = monthWorkouts.reduce((sum, w) => sum + (w.completedExercises || 0), 0);
  const avgDuration = count ? Math.round(total / count) : 0;
  const lastWorkout = monthWorkouts[monthWorkouts.length - 1];

  layout(`
    <div class="dashboard-header">
      <h2>Resumo do Treino</h2>
      <p class="muted">Acompanhe seu progresso e estatísticas.</p>
    </div>
    <div class="dashboard-stats">
      <div class="stat-item"><b>${count}</b><span>Treinos este mês</span></div>
      <div class="stat-item"><b>${fmtShort(total)}</b><span>Tempo total</span></div>
      <div class="stat-item"><b>${exercisesDone}</b><span>Exercícios concluídos</span></div>
      <div class="stat-item"><b>${fmt(avgDuration * 60)}</b><span>Duração média</span></div>
    </div>
    ${lastWorkout ? `
      <div class="recent-workout">
        <h3>Último Treino: ${lastWorkout.type}</h3>
        <p><strong>${fmt(lastWorkout.totalTime || 0)}</strong> • ${lastWorkout.completedExercises || 0} exercícios</p>
        <button class="secondary" onclick="showWorkoutDetails('${lastWorkout.id}')">Ver detalhes</button>
      </div>
    ` : `
      <div class="empty-state"><p>Ainda não há treinos registrados este mês.</p><button class="primary" onclick="go('trainings')">Começar um treino</button></div>
    `}
    <div class="monthly-summary">
      <h3>Histórico Mensal</h3>
      <div class="summary-chart" id="monthlyChart"></div>
    </div>
  `, "home");

  const ctx = document.getElementById('monthlyChart');
  if (ctx) {
    const labels = Array.from(new Set(monthWorkouts.map(w => w.date.slice(8, 10))));
    const data = labels.map(d => monthWorkouts.filter(w => w.date.slice(8, 10) === d).reduce((sum, w) => sum + (w.completedExercises || 0), 0));
    ctx.innerHTML = labels.map((d, i) => `<div class="chart-bar"><span style="height:${Math.max(8, data[i] * 18)}px"></span><small>${d}</small></div>`).join("");
  }
}

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));

window.addEventListener("DOMContentLoaded", () => {
  exerciseDBSeedFromCurrentData().catch(err => console.warn("Biblioteca de exercícios:", err));
  bootApp();
});

