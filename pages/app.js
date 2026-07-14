import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authStatus = document.getElementById("authStatus");
const editorFrame = document.getElementById("editorFrame");
const cloudStatus = document.getElementById("cloudStatus");
const cloudDot = document.getElementById("cloudDot");
const userEmail = document.getElementById("userEmail");
const authTabs = document.querySelector(".auth-tabs");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const recoveryForm = document.getElementById("recoveryForm");
const PUBLIC_BASE_URL = WORKER_BASE_URL;

let supabase = null;
let session = null;
let currentUser = null;
let currentBusiness = null;
let adminImpersonation = null; // attività di un cliente aperta da un admin via ?business=<id>
let saveTimer = null;
let pendingState = null;
let recoveryMode = false;
let currentNfc = null;
let applicationLoading = false;
let workspaceWarnings = [];
const messageOrigin = location.protocol === "file:" ? "*" : location.origin;

function setAuthStatus(message="",type=""){
  authStatus.textContent = message;
  authStatus.className = `auth-status ${type}`.trim();
}

function setCloudStatus(message,type=""){
  cloudStatus.textContent = message;
  cloudDot.className = type;
}

function recordWorkspaceWarning(context,error){
  console.warn(context,error);
  workspaceWarnings.push(`${context}: ${error?.message || error || "errore non specificato"}`);
}

function slugify(value){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,48) || `pagina-${Date.now()}`;
}

function accountDataFromUser(user){
  const name = user?.user_metadata?.full_name?.trim()
    || user?.email?.split("@")[0]
    || "Utente KhamaKey";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(part=>part[0])
    .join("")
    .toUpperCase() || "KK";
  return {
    id:user?.id || "",
    name,
    email:user?.email || "",
    phone:user?.phone || user?.user_metadata?.phone || "",
    initials
  };
}

function publicStateFromEditor(state={}){
  const fields = state.fields || {};
  const allowedFields = [
    "nome","desc","c1","c2","pubPageBg","pubBlockBg","pubTextColor","pubMutedColor","tel","wa","email","indirizzo","maps","recensioni",
    "sito","aWhatsApp","aChiama","aIndicazioni","aRecensioni","aPrenota","aMenu",
    "aboutTitle","aboutText","showLogo","showCover","showHeroName","showHeroText",
    "pubLogoSize","pubLogoFit","pubLogoScale",
    "pubCoverFit","pubCoverPosition","pubCoverPositionX","pubCoverPositionY",
    "pubCoverZoom","pubHeroHeight","pubHeroStyle",
    "pubCardStyle","pubButtonStyle",
    "bookingTitle","bookingType","bookingDesc","bookingUseDate","bookingUseSlot",
    "bookingUsePeople","bookingChannel","bookingRequired","bookingAutomation",
    "bookingCalendarId"
  ];
  const snapshot = state.publicSnapshot && typeof state.publicSnapshot === "object"
    ? compactPublicSnapshot(state.publicSnapshot,state)
    : null;
  const hasSnapshot = Boolean(snapshot?.html);
  const publicState = {
    fields:Object.fromEntries(allowedFields.map(key=>[key,fields[key]]).filter(([,value])=>value !== undefined))
  };
  if(hasSnapshot){
    publicState.publicSnapshot = snapshot;
  }else{
    publicState.logoSrc = fields.showLogo !== false ? (state.logoSrc || "") : "";
    publicState.coverSrc = fields.showCover !== false ? (state.coverSrc || "") : "";
    publicState.aboutSrc = state.aboutSrc || "";
  }
  if(state.i18n?.enabled && state.i18n?.snapshots && typeof state.i18n.snapshots === "object"){
    const compactSnapshots = {};
    Object.entries(state.i18n.snapshots).forEach(([locale, snap]) => {
      if(!snap || typeof snap !== "object" || !snap.html) return;
      compactSnapshots[locale] = compactPublicSnapshot(snap,state);
    });
    if(Object.keys(compactSnapshots).length){
      publicState.i18n = {
        enabled:true,
        fallback:state.i18n.fallback || "en",
        snapshots:compactSnapshots
      };
    }
  }
  return publicState;
}

function compactPublicSnapshot(snapshot,state){
  const template = document.createElement("template");
  template.innerHTML = String(snapshot.html || "");
  template.content.querySelectorAll("script,object,embed").forEach(node=>node.remove());
  template.content.querySelectorAll("*").forEach(node=>{
    [...node.attributes].forEach(attribute=>{
      const name = attribute.name.toLowerCase();
      const content = attribute.value.trim().toLowerCase();
      if(name.startsWith("on") || ((name === "href" || name === "src") && content.startsWith("javascript:"))){
        node.removeAttribute(attribute.name);
      }
    });
  });
  return {
    version:String(snapshot.version || ""),
    className:String(snapshot.className || "").replace(/[^a-zA-Z0-9 _-]/g,"").slice(0,500),
    style:String(snapshot.style || "").replace(/[^a-zA-Z0-9:#;().,% _-]/g,"").slice(0,500),
    html:template.innerHTML
  };
}

function configureClient(){
  if(!SUPABASE_PUBLISHABLE_KEY){
    setAuthStatus("Configurazione cloud non disponibile.","error");
    return false;
  }
  supabase = createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return true;
}

function switchAuthTab(tab){
  recoveryMode = false;
  authTabs.hidden = false;
  document.querySelectorAll("[data-auth-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.authTab===tab);
  });
  loginForm.hidden = tab !== "login";
  signupForm.hidden = tab !== "signup";
  recoveryForm.hidden = true;
  setAuthStatus();
}

function showRecoveryForm(){
  recoveryMode = true;
  authView.hidden = false;
  appView.hidden = true;
  authTabs.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  recoveryForm.hidden = false;
  setAuthStatus();
}

async function ensureWorkspace(user){
  workspaceWarnings = [];
  adminImpersonation = null;

  // Modalità admin: ?business=<id> apre l'attività di un cliente.
  // La sicurezza è garantita dalla RLS: se l'utente NON è admin (né proprietario),
  // la SELECT non restituisce l'attività di un altro e si prosegue normalmente.
  const requestedBusinessId = new URLSearchParams(location.search).get("business");
  if(requestedBusinessId){
    const { data:target,error:targetError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id",requestedBusinessId)
      .maybeSingle();
    if(!targetError && target && target.profile_id !== user.id){
      // RLS ci ha fatto leggere l'attività di un ALTRO utente → siamo admin.
      const { data:editorState } = await supabase
        .from("business_editor_states")
        .select("state")
        .eq("business_id",target.id)
        .maybeSingle();
      const { data:targetNfc } = await supabase
        .from("nfc_tags")
        .select("*")
        .eq("business_id",target.id)
        .limit(1)
        .maybeSingle();
      currentNfc = targetNfc || null;
      adminImpersonation = { id:target.id, nome:target.nome, profile_id:target.profile_id };
      return {...target, editor_state:editorState?.state || {}};
    }
    // target è la propria attività, o RLS l'ha nascosta: nessuna impersonazione, flusso normale.
  }

  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Cliente KhamaKey";
  const businessName = user.user_metadata?.business_name || "La mia attività";
  const { error:profileError } = await supabase
    .from("profiles")
    .upsert({
      id:user.id,
      email:user.email,
      tipo:"b2b",
      nome:fullName
    },{onConflict:"id"});
  if(profileError) recordWorkspaceWarning("Profilo non aggiornato",profileError);

  const { data:business,error:businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("profile_id",user.id)
    .order("created_at",{ascending:true})
    .limit(1)
    .maybeSingle();
  if(businessError) throw businessError;
  let workspaceBusiness = business;
  if(business){
    const { data:editorState,error:editorStateError } = await supabase
      .from("business_editor_states")
      .select("state")
      .eq("business_id",business.id)
      .maybeSingle();
    if(editorStateError) recordWorkspaceWarning("Stato editor non letto",editorStateError);
    workspaceBusiness = {...business,editor_state:editorState?.state || {}};
  }else{
    const { data:newBusiness,error:newBusinessError } = await supabase
      .from("businesses")
      .insert({
        profile_id:user.id,
        nome:businessName,
        slug:`${slugify(businessName)}-${user.id.slice(0,6)}`,
        categoria:"Azienda",
        pubblicato:true
      })
      .select()
      .single();
    if(newBusinessError) throw newBusinessError;
    workspaceBusiness = {...newBusiness,editor_state:{}};
  }

  const publicSlug = workspaceBusiness.slug || `${slugify(workspaceBusiness.nome || businessName)}-${user.id.slice(0,6)}`;
  const { data:existingPublicPage,error:publicPageReadError } = await supabase
    .from("business_public_pages")
    .select("business_id")
    .eq("business_id",workspaceBusiness.id)
    .maybeSingle();
  if(publicPageReadError){
    recordWorkspaceWarning("Pagina pubblica non verificata",publicPageReadError);
  }else if(!existingPublicPage){
    const { error:publicPageError } = await supabase.from("business_public_pages").insert({
      business_id:workspaceBusiness.id,
      profile_id:user.id,
      slug:publicSlug,
      state:publicStateFromEditor(workspaceBusiness.editor_state),
      published:true,
      updated_at:new Date().toISOString()
    });
    if(publicPageError) recordWorkspaceWarning("Pagina pubblica non creata",publicPageError);
  }

  const { data:nfc,error:nfcError } = await supabase
    .from("nfc_tags")
    .select("*")
    .eq("business_id",workspaceBusiness.id)
    .limit(1)
    .maybeSingle();
  if(nfcError){
    recordWorkspaceWarning("Link NFC non letto",nfcError);
    currentNfc = null;
  }else if(nfc){
    currentNfc = nfc;
  }else{
    const code = crypto.randomUUID().replaceAll("-","").slice(0,12).toUpperCase();
    const url = `${PUBLIC_BASE_URL}/k/${code}`;
    const { data:newNfc,error:newNfcError } = await supabase
      .from("nfc_tags")
      .insert({
        business_id:workspaceBusiness.id,
        profile_id:user.id,
        stato:"attivo",
        code,
        url
      })
      .select()
      .single();
    if(newNfcError){
      recordWorkspaceWarning("Link NFC non creato",newNfcError);
      currentNfc = null;
    }else{
      currentNfc = newNfc;
    }
  }
  return workspaceBusiness;
}

const ANALYTICS_INTERACTION_TYPES = [
  "click_whatsapp","click_phone","click_maps","click_reviews",
  "click_booking","click_catalog","add_to_cart","order_sent"
];

function normalizeAnalyticsPayload(payload={}){
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  const devices = data.devices && typeof data.devices === "object" && !Array.isArray(data.devices)
    ? data.devices
    : {};
  const sources = data.sources && typeof data.sources === "object" && !Array.isArray(data.sources)
    ? data.sources
    : {};
  const lastEvents = Array.isArray(data.lastEvents)
    ? data.lastEvents
    : Array.isArray(data.last_events)
      ? data.last_events
      : [];
  return {
    ...data,
    devices,
    sources,
    lastEvents:lastEvents.map(row=>({
      type:row.type || row.tipo || "",
      device:row.device || row.dispositivo || "",
      source:row.source || "",
      created_at:row.created_at || ""
    })),
    updatedAt:data.updatedAt || data.updated_at || new Date().toISOString()
  };
}

function buildAnalyticsFromRows(rows=[]){
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  const recentRows = rows.filter(row => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return Number.isFinite(ts) && now - ts <= days30;
  });
  const count = (type,list=rows) => list.filter(row=>row.tipo===type).length;
  const uniqueVisitors = list => new Set(list.filter(row=>row.tipo==="page_view").map(row=>row.visitor_id).filter(Boolean)).size;
  const deviceCounts = rows.reduce((acc,row)=>{
    if(row.tipo !== "page_view") return acc;
    const key = row.dispositivo || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  },{});
  const sourceCounts = rows.reduce((acc,row)=>{
    if(!["page_view","nfc_tap"].includes(row.tipo)) return acc;
    const key = row.source || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  },{});
  const interactions = ANALYTICS_INTERACTION_TYPES.reduce((sum,type)=>sum + count(type),0);
  const visits = uniqueVisitors(rows);
  return normalizeAnalyticsPayload({
    nfc:count("nfc_tap"),
    pageViews:count("page_view"),
    visits,
    whatsapp:count("click_whatsapp"),
    phone:count("click_phone"),
    maps:count("click_maps"),
    reviews:count("click_reviews"),
    booking:count("click_booking"),
    catalog:count("click_catalog"),
    addToCart:count("add_to_cart"),
    orders:count("order_sent"),
    interactions,
    interactionsPer100Visitors:visits ? Math.round((interactions / visits) * 1000) / 10 : 0,
    last30:{
      nfc:count("nfc_tap",recentRows),
      pageViews:count("page_view",recentRows),
      visits:uniqueVisitors(recentRows),
      whatsapp:count("click_whatsapp",recentRows),
      phone:count("click_phone",recentRows),
      maps:count("click_maps",recentRows),
      reviews:count("click_reviews",recentRows),
      booking:count("click_booking",recentRows),
      catalog:count("click_catalog",recentRows),
      addToCart:count("add_to_cart",recentRows),
      orders:count("order_sent",recentRows),
      interactions:ANALYTICS_INTERACTION_TYPES.reduce((sum,type)=>sum + count(type,recentRows),0)
    },
    devices:deviceCounts,
    sources:sourceCounts,
    lastEvents:rows.slice(0,12).map(row=>({
      type:row.tipo,
      device:row.dispositivo || "",
      source:row.source || "",
      created_at:row.created_at || ""
    }))
  });
}

async function getAnalyticsTimeseries(){
  if(!currentBusiness) return null;
  try{
    const { data,error } = await supabase.rpc("get_business_analytics_timeseries",{
      p_business_id:currentBusiness.id,
      p_days:30
    });
    return error ? null : data;
  }catch(e){ return null; }
}

async function getAnalytics(){
  if(!currentBusiness) return {};
  const [{ data:rpcData,error:rpcError }, timeseries] = await Promise.all([
    supabase.rpc("get_business_analytics",{ p_business_id:currentBusiness.id }),
    getAnalyticsTimeseries()
  ]);
  if(!rpcError && rpcData){
    return {...normalizeAnalyticsPayload(rpcData), timeseries};
  }
  if(rpcError) console.warn("get_business_analytics RPC non disponibile, uso fallback client",rpcError);
  const { data,error } = await supabase
    .from("analytics_events")
    .select("tipo,visitor_id,dispositivo,source,created_at")
    .eq("business_id",currentBusiness.id)
    .order("created_at",{ascending:false})
    .limit(1000);
  if(error) throw error;
  return buildAnalyticsFromRows(data || []);
}

async function sendStateToEditor(){
  if(!currentBusiness?.editor_state || !editorFrame.contentWindow) return;
  editorFrame.contentWindow.postMessage({
    type:"khamakey:load-state",
    state:currentBusiness.editor_state,
    businessId:currentBusiness.id,
    publicUrl:currentNfc?.url || "",
    publicPageUrl:`${PUBLIC_BASE_URL}/p/${currentBusiness.slug}`,
    workerUrl:PUBLIC_BASE_URL,
    account:accountDataFromUser(currentUser),
    analytics:{}
  },messageOrigin);
  refreshAnalytics();
}

async function refreshAnalytics(){
  if(!currentBusiness || !editorFrame.contentWindow) return;
  try{
    const analytics = await getAnalytics();
    editorFrame.contentWindow.postMessage({type:"khamakey:analytics",analytics,ok:true},messageOrigin);
  }catch(error){
    console.error(error);
    editorFrame.contentWindow.postMessage({
      type:"khamakey:analytics",
      analytics:{},
      ok:false,
      error:error?.message || "Analytics non disponibili"
    },messageOrigin);
  }
}

async function createSupportTicketFromEditor(message){
  if(!supabase || !session?.user || !currentBusiness) return;
  const subject = String(message.subject || "").trim();
  const description = String(message.description || "").trim();
  const priority = String(message.priority || "normal").trim() || "normal";
  if(!subject || !description){
    postToEditor({type:"khamakey:support-ticket-result",ok:false,message:"Compila oggetto e dettagli."});
    return;
  }
  const { error } = await supabase.from("platform_support_tickets").insert({
    business_id:currentBusiness.id,
    profile_id:session.user.id,
    subject,
    priority,
    description,
    status:"open",
    source:message.source || "business_editor"
  });
  postToEditor({
    type:"khamakey:support-ticket-result",
    ok:!error,
    message:error ? (error.message || "Ticket non inviato.") : "Ticket inviato. Lo troviamo nella console supporto."
  });
}

async function loadApplication(){
  if(applicationLoading) return;
  applicationLoading = true;
  setCloudStatus("Caricamento dati...");
  try{
    const { data:userData,error:userError } = await supabase.auth.getUser();
    if(userError || !userData.user) throw userError || new Error("Utente non disponibile");
    currentUser = userData.user;
    currentBusiness = await ensureWorkspace(currentUser);
    userEmail.textContent = currentUser.email || "";
    const editorUrl = `editor.html?business=${encodeURIComponent(currentBusiness.id)}&v=133`;
    if(editorFrame.getAttribute("src") !== editorUrl){
      editorFrame.src = editorUrl;
    }
    authView.hidden = true;
    appView.hidden = false;
    renderAdminImpersonationBanner();
    setCloudStatus(workspaceWarnings.length ? "Editor aperto, cloud parziale" : "Cloud collegato",workspaceWarnings.length ? "warn" : "ok");
    if(workspaceWarnings.length) setAuthStatus(`Accesso riuscito. Alcuni dati cloud non sono disponibili: ${workspaceWarnings.join(" | ")}`,"error");
    await sendStateToEditor();
  }finally{
    applicationLoading = false;
  }
}

function renderAdminImpersonationBanner(){
  const existing = document.getElementById("adminImpersonationBanner");
  if(!adminImpersonation){
    if(existing) existing.remove();
    return;
  }
  let banner = existing;
  if(!banner){
    banner = document.createElement("div");
    banner.id = "adminImpersonationBanner";
    banner.setAttribute("role","status");
    banner.style.cssText = "position:sticky;top:0;z-index:50;background:#B54708;color:#fff;padding:8px 16px;font:600 13px/1.4 system-ui,sans-serif;text-align:center;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap";
    document.body.prepend(banner);
  }
  const nome = adminImpersonation.nome || "cliente";
  banner.innerHTML = `<span>👁️ Modalità amministratore — stai modificando l'attività di <strong>${String(nome).replace(/[<>&]/g,"")}</strong>. Le modifiche salvate valgono per il cliente.</span>`;
}

async function saveDraft(state){
  if(!currentBusiness || !state) return;
  setCloudStatus("Salvataggio...");
  const editorState = {...state};
  delete editorState.publicSnapshot;
  const publicPageSave = state.publicSnapshot
    ? supabase.from("business_public_pages").upsert({
        business_id:currentBusiness.id,
        profile_id:currentBusiness.profile_id || session.user.id,
        slug:currentBusiness.slug,
        state:publicStateFromEditor(state),
        published:true,
        updated_at:new Date().toISOString()
      },{onConflict:"business_id"})
    : Promise.resolve({error:null});
  const [{ error:businessError },{ error:stateError },{ error:publicPageError }] = await Promise.all([
    supabase.from("businesses").update({
      nome:state.fields?.nome || currentBusiness.nome,
      categoria:state.fields?.categoria || currentBusiness.categoria,
      updated_at:new Date().toISOString()
    }).eq("id",currentBusiness.id),
    supabase.from("business_editor_states").upsert({
      business_id:currentBusiness.id,
      profile_id:currentBusiness.profile_id || session.user.id,
      state:editorState,
      updated_at:new Date().toISOString()
    },{onConflict:"business_id"}),
    publicPageSave
  ]);
  if(businessError || stateError || publicPageError){
    setCloudStatus("Errore salvataggio","error");
    throw businessError || stateError || publicPageError;
  }
  currentBusiness = {...currentBusiness,editor_state:editorState};
  setCloudStatus("Salvato nel cloud","ok");
}

function queueSave(state,immediate=false){
  pendingState = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async()=>{
    try{
      await saveDraft(pendingState);
      if(editorFrame.contentWindow){
        editorFrame.contentWindow.postMessage({type:"khamakey:save-ok"},messageOrigin);
      }
    }catch(error){
      console.error(error);
    }
  },immediate ? 0 : 1200);
}

document.querySelectorAll("[data-auth-tab]").forEach(button=>{
  button.addEventListener("click",()=>switchAuthTab(button.dataset.authTab));
});

document.querySelectorAll("[data-password-target]").forEach(button=>{
  button.addEventListener("click",()=>{
    const input = document.getElementById(button.dataset.passwordTarget);
    if(!input) return;
    const showPassword = input.type === "password";
    input.type = showPassword ? "text" : "password";
    button.classList.toggle("visible",showPassword);
    button.setAttribute("aria-label",showPassword ? "Nascondi password" : "Mostra password");
    button.title = showPassword ? "Nascondi password" : "Mostra password";
    input.focus({preventScroll:true});
  });
});

loginForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!supabase) return;
  setAuthStatus("Accesso in corso...");
  const { error } = await supabase.auth.signInWithPassword({
    email:document.getElementById("loginEmail").value.trim(),
    password:document.getElementById("loginPassword").value
  });
  if(error){
    setAuthStatus(error.message,"error");
  }
});

signupForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!supabase) return;
  setAuthStatus("Creazione account...");
  const email = document.getElementById("signupEmail").value.trim();
  const { data,error } = await supabase.auth.signUp({
    email,
    password:document.getElementById("signupPassword").value,
    options:{
      emailRedirectTo:location.protocol === "file:" ? undefined : location.origin,
      data:{
        full_name:document.getElementById("signupName").value.trim(),
        business_name:document.getElementById("signupBusiness").value.trim()
      }
    }
  });
  if(error){
    setAuthStatus(error.message,"error");
    return;
  }
  if(!data.session){
    setAuthStatus("Account creato. Controlla l’email per confermare la registrazione.","ok");
  }
});

recoveryForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!supabase) return;
  setAuthStatus("Aggiornamento password...");
  const { error } = await supabase.auth.updateUser({
    password:document.getElementById("recoveryPassword").value
  });
  if(error){
    setAuthStatus(error.message,"error");
    return;
  }
  recoveryMode = false;
  recoveryForm.hidden = true;
  setAuthStatus("Password aggiornata. Accesso effettuato.","ok");
  if(session) await loadApplication();
});

document.getElementById("forgotPassword").addEventListener("click",async()=>{
  if(!supabase) return;
  const email = document.getElementById("loginEmail").value.trim();
  if(!email){
    setAuthStatus("Inserisci prima la tua email.","error");
    return;
  }
  const redirectTo = location.protocol === "file:" ? undefined : location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email,{redirectTo});
  setAuthStatus(error ? error.message : "Email di recupero inviata.",error ? "error" : "ok");
});

document.getElementById("logoutButton").addEventListener("click",async()=>{
  if(supabase) await supabase.auth.signOut();
});

function postToEditor(message){
  if(!editorFrame.contentWindow) return;
  editorFrame.contentWindow.postMessage(message,messageOrigin);
}

document.getElementById("shellPreviewBtn")?.addEventListener("click",()=>{
  postToEditor({type:"khamakey:open-preview"});
});

document.getElementById("shellAccountBtn")?.addEventListener("click",()=>{
  postToEditor({type:"khamakey:open-account",tab:"profile"});
});

editorFrame.addEventListener("load",()=>sendStateToEditor());
window.addEventListener("message",event=>{
  const validOrigin = location.protocol === "file:" ? event.origin === "null" : event.origin === location.origin;
  if(!validOrigin || event.source !== editorFrame.contentWindow) return;
  if(event.data?.type === "khamakey:dirty") queueSave(event.data.state);
  if(event.data?.type === "khamakey:save") queueSave(event.data.state,true);
  if(event.data?.type === "khamakey:public-snapshot") queueSave(event.data.state,true);
  if(event.data?.type === "khamakey:logout") supabase.auth.signOut();
  if(event.data?.type === "khamakey:refresh-analytics") refreshAnalytics();
  if(event.data?.type === "khamakey:create-support-ticket") createSupportTicketFromEditor(event.data);
});
setInterval(refreshAnalytics,15000);

if(configureClient()){
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if(session){
    try{
      await loadApplication();
    }catch(error){
      setAuthStatus(error.message,"error");
      authView.hidden = false;
    }
  }else{
    authView.hidden = false;
  }
  supabase.auth.onAuthStateChange(async(event,newSession)=>{
    session = newSession;
    if(event === "PASSWORD_RECOVERY"){
      showRecoveryForm();
      return;
    }
    if(event === "INITIAL_SESSION"){
      if(!session) {
        authView.hidden = false;
      }
      return;
    }
    if(!session){
      currentUser = null;
      currentBusiness = null;
      editorFrame.src = "about:blank";
      appView.hidden = true;
      authView.hidden = false;
      switchAuthTab("login");
      setCloudStatus("Disconnesso");
      return;
    }
    if(recoveryMode) return;
    try{
      await loadApplication();
    }catch(error){
      setAuthStatus(error.message,"error");
      authView.hidden = false;
    }
  });
}else{
  authView.hidden = false;
}
