import { apiConfigured, apiRequest } from "./api.js";
import { getAccessToken, setAccessToken } from "./session.js";
import { db, userStatePayload } from "./store.js";
import { emit, on } from "../utils/events.js";

let apiSyncTimer = null;

let apiSyncInFlight = false;

let apiSyncPending = false;

export async function syncStateNow(){
  if(!getAccessToken() || !apiConfigured()) return;
  if(apiSyncInFlight){ apiSyncPending=true; return; }
  apiSyncInFlight=true;
  try{
    await apiRequest("/state",{method:"PUT",body:JSON.stringify(userStatePayload())});
  }catch(err){
    if(err.status===401){ setAccessToken(""); db.currentUserId=null; db.users=[]; emit("session:expired"); }
    else console.warn("Sincronização da conta:",err);
  }finally{
    apiSyncInFlight=false;
    if(apiSyncPending){ apiSyncPending=false; syncStateNow(); }
  }
}

function queueApiSave(){
  if(!getAccessToken()) return;
  clearTimeout(apiSyncTimer);
  apiSyncTimer=setTimeout(()=>syncStateNow(),350);
}

// Liga a sincronização às alterações do store. Chamado uma única vez pelo main.js.
export function startSync(){ on("store:changed", queueApiSave); }
