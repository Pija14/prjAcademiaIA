import { DEFAULTS, KEY } from "../config/constants.js";
import { emit } from "../utils/events.js";
import { cloneJSON, normalizeEmail, uid } from "../utils/format.js";

export let db;

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

if(!Array.isArray(db.myWorkouts)) db.myWorkouts = [];

if(!db.settings || typeof db.settings!=="object") db.settings=JSON.parse(JSON.stringify(DEFAULTS.settings));

if(!Number.isFinite(Number(db.settings.exerciseDuration)) || Number(db.settings.exerciseDuration)<=0) db.settings.exerciseDuration=60;

if(!Number.isFinite(Number(db.settings.restDuration)) || Number(db.settings.restDuration)<=0) db.settings.restDuration=30;

if(!Number.isFinite(Number(db.settings.rest)) || Number(db.settings.rest)<=0) db.settings.rest=db.settings.restDuration;

if(!Number.isInteger(Number(db.settings.weeklyGoal)) || Number(db.settings.weeklyGoal)<1 || Number(db.settings.weeklyGoal)>7) db.settings.weeklyGoal=4;

["A","B","C"].forEach(k=>{
  if(!Array.isArray(db.excludedExercises[k])) db.excludedExercises[k]=[];
  if(!Array.isArray(db.customExercises[k])) db.customExercises[k]=[];
});

export function ensureAuthState(){
  if(!Array.isArray(db.users)) db.users=[];
  if(!Array.isArray(db.workoutHistory)) db.workoutHistory=[];
  if(!Array.isArray(db.workouts)) db.workouts=[];
  if(!Array.isArray(db.myWorkouts)) db.myWorkouts=[];
}

export function getCurrentUser(){
  ensureAuthState();
  return db.users.find(u => u.id === db.currentUserId) || null;
}

export function userStatePayload(){
  const userId=db.currentUserId||null;
  return {
    workouts: Array.isArray(db.workouts)?db.workouts.map(w=>({...w,userId})):[],
    settings: db.settings || JSON.parse(JSON.stringify(DEFAULTS.settings)),
    excludedExercises: db.excludedExercises || {A:[],B:[],C:[]},
    customExercises: db.customExercises || {A:[],B:[],C:[]},
    workoutPlans: db.workoutPlans || {A:null,B:null,C:null},
    workoutNames: db.workoutNames || {A:"Treino A",B:"Treino B",C:"Treino C"},
    myWorkouts: Array.isArray(db.myWorkouts)?db.myWorkouts:[],
    workoutHistory: Array.isArray(db.workoutHistory)?db.workoutHistory.map(h=>({...h,userId})):[]
  };
}

export function hasUserData(payload){
  return !!(payload && ((payload.myWorkouts||[]).length || (payload.workouts||[]).length || (payload.workoutHistory||[]).length || (payload.customExercises && Object.values(payload.customExercises).some(x=>Array.isArray(x)&&x.length))));
}

export function legacyStateForEmail(email){
  const normalized=normalizeEmail(email);
  const legacyUser=db.users.find(u=>normalizeEmail(u.email)===normalized);
  if(!legacyUser) return null;
  return {
    workouts:Array.isArray(db.workouts)?cloneJSON(db.workouts):[],
    settings:cloneJSON(db.settings||DEFAULTS.settings),
    excludedExercises:cloneJSON(db.excludedExercises||DEFAULTS.excludedExercises),
    customExercises:cloneJSON(db.customExercises||DEFAULTS.customExercises),
    workoutPlans:cloneJSON(db.workoutPlans||DEFAULTS.workoutPlans),
    workoutNames:cloneJSON(db.workoutNames||DEFAULTS.workoutNames),
    myWorkouts:Array.isArray(db.myWorkouts)?cloneJSON(db.myWorkouts):[],
    workoutHistory:Array.isArray(db.workoutHistory)?cloneJSON(db.workoutHistory):[]
  };
}

export function applyUserState(serverState,user){
  const incoming=serverState&&typeof serverState==="object"?serverState:{};
  const authenticatedId=user.id;
  db.workouts=Array.isArray(incoming.workouts)?incoming.workouts.map(w=>({...w,userId:authenticatedId})):[];
  db.settings=(incoming.settings&&typeof incoming.settings==="object")?incoming.settings:cloneJSON(DEFAULTS.settings);
  db.excludedExercises=incoming.excludedExercises||cloneJSON(DEFAULTS.excludedExercises);
  db.customExercises=incoming.customExercises||cloneJSON(DEFAULTS.customExercises);
  db.workoutPlans=incoming.workoutPlans||cloneJSON(DEFAULTS.workoutPlans);
  db.workoutNames=incoming.workoutNames||cloneJSON(DEFAULTS.workoutNames);
  db.myWorkouts=Array.isArray(incoming.myWorkouts)?incoming.myWorkouts:[];
  db.workoutHistory=Array.isArray(incoming.workoutHistory)?incoming.workoutHistory.map(h=>({...h,userId:authenticatedId})):[];
  db.users=[user];
  db.currentUserId=user.id;
  db.ownerId=user.id;
  localStorage.setItem(KEY,JSON.stringify(db));
}

// Persiste o estado local. A sincronização com a API escuta "store:changed" (ver models/sync.js).
export function save(){ persistLocal(); emit("store:changed"); }
export function persistLocal(){ localStorage.setItem(KEY, JSON.stringify(db)); }

export function normalizeWorkout(w){
  return {
    id:w.id||uid("treino-"), userId:w.userId||db.currentUserId||null, name:String(w.name||"Treino Personalizado"), description:String(w.description||""), level:w.level||"Personalizado",
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

export function ensurePhase2Data(){
  // Do not seed A/B/C for a new account. Legacy A/B/C data is migrated only
  // when the authenticated e-mail matches an existing local account.
  if(!Array.isArray(db.myWorkouts)) db.myWorkouts=[];
  db.myWorkouts=db.myWorkouts.map(normalizeWorkout);
  if(!Array.isArray(db.workoutHistory)) db.workoutHistory=[];
}
