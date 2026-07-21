import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL, authRedirectTo } from "./config.js";

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
const activationForm = document.getElementById("activationForm");
const PUBLIC_BASE_URL = WORKER_BASE_URL;

let supabase = null;
let session = null;
let currentUser = null;
let currentBusiness = null;
let adminImpersonation = null; // attività di un cliente aperta da un admin via ?business=<id>
let saveTimer = null;
let pendingState = null;
let recoveryMode = false;
let pendingRecovery = false;
let authCallbackPending = false;
let currentNfc = null;
let applicationLoading = false;
let workspaceWarnings = [];
let editorHydrated = false;
let editorReady = false;
let pendingShellCommands = [];
let hydrationRetryTimer = null;
let hydrationAttempt = 0;
const messageOrigin = location.protocol === "file:" ? "*" : location.origin;
const EDITOR_POST_TARGET = "*";
const APP_VERSION = "168";
const EDITOR_BOOTSTRAP_KEY = "khamakey:editor-bootstrap";
const WORKSPACE_META_KEY = "khamakey:workspace-meta";

/** Account creati da Moments non devono entrare nel flusso Business (codice NFC attività). */
function isMomentsOnlyAccount(user){
  const meta = user?.user_metadata || {};
  if(String(meta.product_area || "").toLowerCase() === "moments") return true;
  if(meta.pending_moment_code) return true;
  return false;
}

function redirectMomentsAccountAwayFromBusiness(user){
  if(!user || !isMomentsOnlyAccount(user)) return false;
  const params = new URLSearchParams(location.search || "");
  if(params.get("product") === "business") return false; // bypass esplicito
  if(/moments\.html$/i.test(location.pathname || "")) return false;
  const target = authRedirectTo("/moments.html") || "./moments.html";
  location.replace(target);
  return true;
}
let shellPublicUrl = "";
let forcePublishTimer = null;
let forcePublishAttempts = 0;
let publishSnapshotConfirmed = false;
const FORCE_PUBLISH_DELAYS_MS = [300, 900, 1800, 3000, 5000, 8000, 12000];

const EDITOR_MESSAGE_TYPES = new Set([
  "khamakey:editor-ready",
  "khamakey:editor-hydrated",
  "khamakey:request-state",
  "khamakey:dirty",
  "khamakey:save",
  "khamakey:public-snapshot",
  "khamakey:logout",
  "khamakey:refresh-analytics",
  "khamakey:create-support-ticket",
  "khamakey:request-links"
]);

function isEditorFrameMessage(event){
  const validOrigin = location.protocol === "file:" ? event.origin === "null" : event.origin === location.origin;
  if(!validOrigin || !event.data?.type?.startsWith("khamakey:")) return false;
  try{
    if(event.source === editorFrame.contentWindow) return true;
  }catch(error){
    console.warn("editor message source",error);
  }
  return EDITOR_MESSAGE_TYPES.has(event.data.type);
}

function markEditorReadyIfPresent(){
  try{
    const doc = editorFrame.contentDocument;
    if(!doc?.getElementById("s-info")) return false;
    if(!editorReady){
      editorReady = true;
      clearEditorLoadTimer();
      sendStateToEditor();
      flushPendingShellCommands();
      setCloudStatus(workspaceWarnings.length ? "Cloud collegato, dati parziali" : "Cloud collegato",workspaceWarnings.length ? "warn" : "ok");
    }
    return true;
  }catch(error){
    return false;
  }
}

let editorHandshakeTimer = null;

function scheduleEditorHandshakePoll(){
  if(editorHandshakeTimer) clearInterval(editorHandshakeTimer);
  let attempts = 0;
  editorHandshakeTimer = setInterval(()=>{
    attempts += 1;
    if(editorReady || editorHydrated || attempts > 48){
      clearInterval(editorHandshakeTimer);
      editorHandshakeTimer = null;
      return;
    }
    markEditorReadyIfPresent();
  },250);
}

function normalizeEditorState(raw){
  if(!raw) return {};
  if(typeof raw === "string"){
    try{
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }catch{
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function editorUrlForBusiness(businessId,links={}){
  const params = new URLSearchParams();
  params.set("business",businessId);
  params.set("v",APP_VERSION);
  const publicUrl = String(links.publicUrl || "").trim();
  const publicPageUrl = String(links.publicPageUrl || "").trim();
  const slug = String(currentBusiness?.slug || "").trim();
  const nfcCode = String(currentNfc?.code || "").trim().toUpperCase();
  if(publicUrl) params.set("pu",publicUrl);
  if(publicPageUrl) params.set("pp",publicPageUrl);
  if(slug) params.set("slug",slug);
  if(nfcCode) params.set("nfc",nfcCode);
  return `/editor?${params.toString()}`;
}

function editorSrcHasBusiness(src,businessId){
  if(!src || !businessId) return false;
  try{
    const url = new URL(src,location.origin);
    return url.searchParams.get("business") === businessId;
  }catch{
    return src.includes(`business=${encodeURIComponent(businessId)}`);
  }
}

function editorSrcNeedsReload(src,businessId,links={}){
  if(!editorSrcHasBusiness(src,businessId)) return true;
  try{
    const url = new URL(src,location.origin);
    const version = url.searchParams.get("v") || "";
    const hasLinkParam = Boolean(url.searchParams.get("pu") || url.searchParams.get("pp") || url.searchParams.get("slug") || url.searchParams.get("nfc"));
    const hasLinks = Boolean(String(links.publicUrl || links.publicPageUrl || "").trim());
    return version !== APP_VERSION || (hasLinks && !hasLinkParam);
  }catch{
    return true;
  }
}

function resetHydrationRetry(){
  hydrationAttempt = 0;
  clearTimeout(hydrationRetryTimer);
  hydrationRetryTimer = null;
  publishSnapshotConfirmed = false;
  clearForcePublishRetries();
}

function clearForcePublishRetries(){
  forcePublishAttempts = 0;
  clearTimeout(forcePublishTimer);
  forcePublishTimer = null;
}

function scheduleForcePublishRetries(){
  clearTimeout(forcePublishTimer);
  if(publishSnapshotConfirmed || forcePublishAttempts >= FORCE_PUBLISH_DELAYS_MS.length) return;
  const delay = FORCE_PUBLISH_DELAYS_MS[forcePublishAttempts];
  forcePublishAttempts += 1;
  forcePublishTimer = setTimeout(()=>{
    if(publishSnapshotConfirmed) return;
    postToEditor({type:"khamakey:force-publish"});
    scheduleForcePublishRetries();
  }, delay);
}

function scheduleHydrationRetry(){
  clearTimeout(hydrationRetryTimer);
  if(editorHydrated || hydrationAttempt >= 6) return;
  hydrationRetryTimer = setTimeout(()=>{
    if(editorHydrated) return;
    hydrationAttempt += 1;
    sendStateToEditor();
  }, 700 + hydrationAttempt * 300);
}

function workspaceLinks(){
  const slug = String(currentBusiness?.slug || "").trim();
  const publicPageUrl = slug ? `${PUBLIC_BASE_URL}/p/${encodeURIComponent(slug)}` : "";
  const nfcCode = String(currentNfc?.code || "").trim().toUpperCase();
  const nfcUrl = String(currentNfc?.url || "").trim() || (nfcCode ? `${PUBLIC_BASE_URL}/k/${nfcCode}` : "");
  const publicUrl = nfcUrl || publicPageUrl;
  return { publicPageUrl, publicUrl, businessSlug:slug, nfcCode };
}

function postWorkspaceLinks(links={}){
  if(!editorFrame.contentWindow) return;
  const resolved = workspaceLinks();
  const publicUrl = String(links.publicUrl || resolved.publicUrl || "").trim();
  const publicPageUrl = String(links.publicPageUrl || resolved.publicPageUrl || "").trim();
  editorFrame.contentWindow.postMessage({
    type:"khamakey:workspace-links",
    publicUrl,
    publicPageUrl,
    businessSlug:currentBusiness?.slug || resolved.businessSlug || "",
    businessName:currentBusiness?.nome || "",
    workerUrl:PUBLIC_BASE_URL,
    nfcCode:String(currentNfc?.code || resolved.nfcCode || "").trim().toUpperCase()
  },EDITOR_POST_TARGET);
}

function seedEditorStateFromBusiness(state={}){
  const next = {...state};
  const businessName = String(currentBusiness?.nome || "").trim();
  if(businessName){
    if(!next.fields || typeof next.fields !== "object") next.fields = {};
    if(!String(next.fields.nome || "").trim()) next.fields.nome = businessName;
    if(!String(next.fields.categoria || "").trim() && currentBusiness?.categoria){
      next.fields.categoria = currentBusiness.categoria;
    }
  }
  return next;
}

function buildEditorLoadPayload(state,links={}){
  return {
    type:"khamakey:load-state",
    state:seedEditorStateFromBusiness(state),
    businessId:currentBusiness?.id || "",
    businessName:currentBusiness?.nome || "",
    businessSlug:currentBusiness?.slug || "",
    publicUrl:links.publicUrl || "",
    publicPageUrl:links.publicPageUrl || "",
    workerUrl:PUBLIC_BASE_URL,
    nfcCode:String(currentNfc?.code || links.nfcCode || "").trim().toUpperCase(),
    account:accountDataFromUser(currentUser),
    analytics:{}
  };
}

function cacheEditorBootstrap(payload){
  if(!payload?.businessId) return;
  try{
    sessionStorage.setItem(EDITOR_BOOTSTRAP_KEY, JSON.stringify({
      ...payload,
      cachedAt:Date.now()
    }));
  }catch(error){
    console.warn("cacheEditorBootstrap",error);
  }
}

function cacheWorkspaceMeta(links={}){
  if(!currentBusiness?.id) return;
  const resolved = workspaceLinks();
  const publicUrl = String(links.publicUrl || resolved.publicUrl || "").trim();
  const publicPageUrl = String(links.publicPageUrl || resolved.publicPageUrl || "").trim();
  const slug = String(currentBusiness.slug || resolved.businessSlug || "").trim();
  const nfcCode = String(currentNfc?.code || resolved.nfcCode || "").trim().toUpperCase();
  try{
    sessionStorage.setItem(WORKSPACE_META_KEY, JSON.stringify({
      businessId:currentBusiness.id,
      businessName:currentBusiness.nome || "",
      businessSlug:slug,
      nfcCode,
      publicUrl,
      publicPageUrl,
      workerUrl:PUBLIC_BASE_URL,
      cachedAt:Date.now()
    }));
  }catch(error){
    console.warn("cacheWorkspaceMeta",error);
  }
}

let sendStateBurstTimers = [];
function clearSendStateBurst(){
  sendStateBurstTimers.forEach(clearTimeout);
  sendStateBurstTimers = [];
}
function scheduleSendStateBurst(){
  clearSendStateBurst();
  [0,150,450,1000,2200,4500].forEach(delay=>{
    sendStateBurstTimers.push(setTimeout(()=>{
      if(currentBusiness && editorFrame.contentWindow) sendStateToEditor();
    }, delay));
  });
}

async function refreshWorkspaceLinks(){
  if(!currentBusiness?.id) return workspaceLinks();
  if(supabase){
    const [{ data:business,error:businessError },{ data:nfc,error:nfcError },{ data:publicPage,error:publicPageError }] = await Promise.all([
      supabase.from("businesses").select("id,nome,slug").eq("id",currentBusiness.id).maybeSingle(),
      supabase.from("nfc_tags").select("id,code,url,stato").eq("business_id",currentBusiness.id).order("created_at",{ascending:true}).limit(1).maybeSingle(),
      supabase.from("business_public_pages").select("slug,published").eq("business_id",currentBusiness.id).maybeSingle()
    ]);
    if(!businessError && business){
      currentBusiness = {...currentBusiness,nome:business.nome || currentBusiness.nome,slug:business.slug || currentBusiness.slug};
    }else if(businessError){
      recordWorkspaceWarning("Attività non aggiornata",businessError);
    }
    if(!nfcError && nfc) currentNfc = nfc;
    else if(nfcError) recordWorkspaceWarning("Link NFC non letto",nfcError);
    if(!publicPageError && publicPage?.slug && !currentBusiness.slug){
      currentBusiness = {...currentBusiness,slug:publicPage.slug};
    }else if(publicPageError){
      recordWorkspaceWarning("Pagina pubblica non letta",publicPageError);
    }
  }
  return workspaceLinks();
}

function syncShellHeader(links={}){
  const url = String(links.publicUrl || links.publicPageUrl || "").trim();
  shellPublicUrl = url;
  const businessName = document.getElementById("shellBusinessName");
  const openBtn = document.getElementById("shellOpenPageBtn");
  const copyBtn = document.getElementById("shellCopyLinkBtn");
  if(businessName){
    const name = String(currentBusiness?.nome || "La tua attività").trim();
    businessName.textContent = name;
    businessName.title = name;
  }
  if(openBtn){
    openBtn.href = url || "#";
    openBtn.setAttribute("aria-disabled",url ? "false" : "true");
  }
  if(copyBtn) copyBtn.disabled = !url;
  const mobileOpen = document.getElementById("shellMobileOpen");
  if(mobileOpen){
    mobileOpen.href = url || "#";
    mobileOpen.setAttribute("aria-disabled",url ? "false" : "true");
  }
}

function humanAuthError(error){
  const message = String(error?.message || "Accesso non riuscito.");
  if(/rate limit|too many requests|429/i.test(message)){
    return "Limite email Supabase raggiunto (max 2/ora). Attendi ~1 ora oppure usa l’ultimo link già ricevuto. Non richiedere altre email per ora.";
  }
  if(/invalid login credentials/i.test(message)){
    return "Email o password non corretti. Se ti eri già registrato, usa quella password o «Password dimenticata».";
  }
  if(/email not confirmed/i.test(message)){
    return "Email non ancora confermata. Controlla posta e spam, poi accedi.";
  }
  return message;
}

function isRepeatedSignup(data){
  return Boolean(data?.user && (!data.user.identities || data.user.identities.length === 0));
}

function promptExistingAccountLogin(email){
  setAuthStatus("Questa email è già registrata. Vai su «Accedi» con la tua password, oppure usa «Password dimenticata».","error");
  switchAuthTab("login");
  const loginEmail = document.getElementById("loginEmail");
  if(loginEmail) loginEmail.value = email;
}

function setAuthStatus(message="",type=""){
  authStatus.textContent = message;
  authStatus.className = `auth-status ${type}`.trim();
}

let editorLoadTimer = null;

function setCloudStatus(message,type=""){
  cloudStatus.textContent = message;
  cloudDot.className = type || "";
  if(!editorFrame.contentWindow || !editorFrame.src || editorFrame.src === "about:blank") return;
  try{
    editorFrame.contentWindow.postMessage({type:"khamakey:cloud-status",message,statusType:type || ""},EDITOR_POST_TARGET);
  }catch(error){
    console.warn("cloud-status postMessage",error);
  }
}

function clearEditorLoadTimer(){
  if(editorLoadTimer){
    clearTimeout(editorLoadTimer);
    editorLoadTimer = null;
  }
}

function scheduleEditorLoadWatch(){
  clearEditorLoadTimer();
  scheduleEditorHandshakePoll();
  editorLoadTimer = setTimeout(()=>{
    if(editorReady) return;
    if(markEditorReadyIfPresent()) return;
    let failed = true;
    try{
      const doc = editorFrame.contentDocument;
      failed = !doc?.getElementById("s-info");
    }catch(error){
      failed = true;
    }
    if(failed){
      setCloudStatus("Editor non disponibile. Ricarica la pagina (Cmd+Shift+R).","error");
      setAuthStatus("Il file editor non è stato caricato dal server. Se il problema resta, segnala al team KhamaKey.","error");
    }else{
      setCloudStatus("Sincronizzazione dati…","warn");
      sendStateToEditor();
    }
  },12000);
}

function refreshLoginCodeLabel(){
  const label = document.getElementById("loginProductCodeLabel");
  const input = document.getElementById("loginProductCode");
  if(!label || !input) return;
  const pending = normalizeBusinessCode(sessionStorage.getItem("khamakey_pending_business_code") || "");
  const needsCode = !!pending;
  if(needsCode){
    label.childNodes[0].textContent = "Codice prodotto (richiesto al primo accesso) ";
    input.placeholder = "Codice sulla card NFC";
    input.required = true;
  }else{
    label.childNodes[0].textContent = "Codice prodotto (opzionale) ";
    input.placeholder = "Solo se attivi un nuovo NFC";
    input.required = false;
  }
}

function recordWorkspaceWarning(context,error){
  console.warn(context,error);
  workspaceWarnings.push(`${context}: ${error?.message || error || "errore non specificato"}`);
}

function normalizeBusinessCode(value){
  return String(value || "").replace(/[^A-Za-z0-9]/g,"").toUpperCase();
}

function setSignupStep(step){
  document.querySelectorAll(".signup-step").forEach(node=>{
    node.classList.toggle("active",Number(node.dataset.signupStep) === step);
  });
  document.querySelectorAll("[data-signup-panel]").forEach(panel=>{
    panel.hidden = Number(panel.dataset.signupPanel) !== step;
  });
}

function showActivationForm(prefillCode="",message=""){
  authView.hidden = false;
  appView.hidden = true;
  authTabs.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  recoveryForm.hidden = true;
  activationForm.hidden = false;
  editorFrame.src = "about:blank";
  editorHydrated = false;
  editorReady = false;
  pendingShellCommands = [];
  const codeInput = document.getElementById("activationCode");
  if(codeInput && prefillCode) codeInput.value = prefillCode;
  setAuthStatus(message);
}

async function activateBusinessCode(code,businessName){
  const cleanCode = normalizeBusinessCode(code);
  if(!/^[A-Z0-9]{8,32}$/.test(cleanCode)){
    throw new Error("Codice prodotto non valido (8-32 caratteri).");
  }
  const name = String(businessName || "").trim();
  const { data,error } = await supabase.rpc("activate_business_code",{
    p_code:cleanCode,
    p_business_name:name || null
  });
  if(error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if(!row?.business_id) throw new Error("Attivazione non completata. Riprova.");
  return row;
}

async function reloadWorkspaceBusiness(businessId){
  const { data:business,error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id",businessId)
    .maybeSingle();
  if(error || !business) throw error || new Error("Attività non trovata dopo attivazione.");
  const { data:editorState } = await supabase
    .from("business_editor_states")
    .select("state")
    .eq("business_id",business.id)
    .maybeSingle();
  const { data:nfc } = await supabase
    .from("nfc_tags")
    .select("*")
    .eq("business_id",business.id)
    .order("created_at",{ascending:true})
    .limit(1)
    .maybeSingle();
  currentNfc = nfc || null;
  return {...business,editor_state:normalizeEditorState(editorState?.state)};
}

async function tryPendingBusinessActivation(user){
  const pendingCode = normalizeBusinessCode(
    sessionStorage.getItem("khamakey_pending_business_code")
      || user?.user_metadata?.pending_business_code
      || ""
  );
  if(!pendingCode) return false;
  const businessName = String(
    user?.user_metadata?.business_name
      || document.getElementById("activationBusiness")?.value
      || document.getElementById("signupBusiness")?.value
      || ""
  ).trim();
  try{
    const row = await activateBusinessCode(pendingCode,businessName || "La mia attività");
    sessionStorage.removeItem("khamakey_pending_business_code");
    currentBusiness = await reloadWorkspaceBusiness(row.business_id);
    return true;
  }catch(error){
    console.error(error);
    showActivationForm(pendingCode,error?.message || "Codice non attivabile.");
    return false;
  }
}

function applyUrlParams(){
  const params = new URLSearchParams(location.search);
  const code = normalizeBusinessCode(params.get("code") || "");
  if(code){
    switchAuthTab("signup");
    const signupCode = document.getElementById("signupProductCode");
    if(signupCode) signupCode.value = code;
    setSignupStep(1);
    const loginCode = document.getElementById("loginProductCode");
    if(loginCode) loginCode.value = code;
  }
  if(params.get("tab") === "signup") switchAuthTab("signup");
  refreshLoginCodeLabel();
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

function syncShellUser(user){
  const account = accountDataFromUser(user);
  if(userEmail) userEmail.textContent = account.email || "account";
  const avatar = document.getElementById("shellUserAvatar");
  const dropdownEmail = document.getElementById("shellUserDropdownEmail");
  if(avatar) avatar.textContent = account.initials;
  if(dropdownEmail) dropdownEmail.textContent = account.email || "";
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

function authCallbackFlags(){
  const hash = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
  const query = new URLSearchParams(location.search || "");
  const type = hash.get("type") || query.get("type") || "";
  const hashRecovery = type === "recovery" || /type=recovery/i.test(location.hash || "");
  return {
    isRecovery:hashRecovery,
    hasCallback:Boolean(type || hash.get("access_token") || query.get("code") || hashRecovery)
  };
}

async function prepareAuthCallback(){
  const flags = authCallbackFlags();
  if(!flags.hasCallback || !supabase) return flags;
  authCallbackPending = true;
  pendingRecovery = flags.isRecovery;
  try{
    await supabase.auth.signOut({ scope:"local" });
  }catch(error){
    console.warn("prepareAuthCallback signOut",error);
  }
  return flags;
}

function scrubAuthUrl(){
  const query = new URLSearchParams(location.search || "");
  if(query.get("code") || query.get("type")){
    history.replaceState(null, "", location.pathname);
    return;
  }
  if(location.hash && /access_token|refresh_token|type=recovery|type=signup/i.test(location.hash)){
    history.replaceState(null, "", location.pathname + location.search);
  }
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
  activationForm.hidden = true;
  if(tab === "signup") setSignupStep(1);
  setAuthStatus();
}

function showRecoveryForm(email=""){
  recoveryMode = true;
  pendingRecovery = false;
  authView.hidden = false;
  appView.hidden = true;
  authTabs.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  recoveryForm.hidden = false;
  activationForm.hidden = true;
  editorFrame.src = "about:blank";
  editorHydrated = false;
  editorReady = false;
  pendingShellCommands = [];
  const hint = email ? `Reimposta la password per ${email}.` : "Scegli una nuova password per il tuo account.";
  setAuthStatus(hint);
  scrubAuthUrl();
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
      return {...target, editor_state:normalizeEditorState(editorState?.state)};
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
  if(!business) return null;
  let workspaceBusiness = business;
  if(business){
    const { data:editorState,error:editorStateError } = await supabase
      .from("business_editor_states")
      .select("state")
      .eq("business_id",business.id)
      .maybeSingle();
    if(editorStateError) recordWorkspaceWarning("Stato editor non letto",editorStateError);
    workspaceBusiness = {...business,editor_state:normalizeEditorState(editorState?.state)};
    if(!editorState){
      const { error:seedStateError } = await supabase.from("business_editor_states").upsert({
        business_id:business.id,
        profile_id:user.id,
        state:{},
        updated_at:new Date().toISOString()
      },{onConflict:"business_id"});
      if(seedStateError) recordWorkspaceWarning("Stato editor non inizializzato",seedStateError);
    }
  }

  if(!workspaceBusiness.pubblicato){
    const { error:publishError } = await supabase
      .from("businesses")
      .update({ pubblicato:true, updated_at:new Date().toISOString() })
      .eq("id",workspaceBusiness.id);
    if(publishError) recordWorkspaceWarning("Attività non pubblicata",publishError);
    else workspaceBusiness = {...workspaceBusiness,pubblicato:true};
  }

  const publicSlug = workspaceBusiness.slug || `${slugify(workspaceBusiness.nome || businessName)}-${user.id.slice(0,6)}`;
  if(!workspaceBusiness.slug){
    const { error:slugError } = await supabase
      .from("businesses")
      .update({ slug:publicSlug, updated_at:new Date().toISOString() })
      .eq("id",workspaceBusiness.id);
    if(slugError) recordWorkspaceWarning("Slug pagina non aggiornato",slugError);
    else workspaceBusiness = { ...workspaceBusiness, slug:publicSlug };
  }
  const { data:existingPublicPage,error:existingPageError } = await supabase
    .from("business_public_pages")
    .select("business_id")
    .eq("business_id",workspaceBusiness.id)
    .maybeSingle();
  if(existingPageError) recordWorkspaceWarning("Pagina pubblica non verificata",existingPageError);
  if(!existingPublicPage){
    const { error:publicPageError } = await supabase
      .from("business_public_pages")
      .insert({
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
  }else{
    currentNfc = nfc || null;
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
  if(!currentBusiness || !editorFrame.contentWindow) return;
  const links = await refreshWorkspaceLinks();
  if(supabase){
    const { data:editorRow,error } = await supabase
      .from("business_editor_states")
      .select("state")
      .eq("business_id",currentBusiness.id)
      .maybeSingle();
    if(!error && editorRow?.state){
      currentBusiness = {...currentBusiness,editor_state:normalizeEditorState(editorRow.state)};
    }else if(error){
      recordWorkspaceWarning("Stato editor non aggiornato",error);
    }
  }
  const state = normalizeEditorState(currentBusiness.editor_state);
  syncShellHeader(links);
  const payload = buildEditorLoadPayload(state,links);
  cacheEditorBootstrap(payload);
  cacheWorkspaceMeta(links);
  editorFrame.contentWindow.postMessage(payload,EDITOR_POST_TARGET);
  postWorkspaceLinks(links);
  scheduleHydrationRetry();
  refreshAnalytics();
}

async function refreshAnalytics(){
  if(!currentBusiness || !editorFrame.contentWindow) return;
  try{
    const analytics = await getAnalytics();
    editorFrame.contentWindow.postMessage({type:"khamakey:analytics",analytics,ok:true},EDITOR_POST_TARGET);
  }catch(error){
    console.error(error);
    editorFrame.contentWindow.postMessage({
      type:"khamakey:analytics",
      analytics:{},
      ok:false,
      error:error?.message || "Analytics non disponibili"
    },EDITOR_POST_TARGET);
  }
}

async function createSupportTicketFromEditor(message){
  if(!supabase || !session?.user){
    postToEditor({type:"khamakey:support-ticket-result",ok:false,message:"Sessione non disponibile. Ricarica e riprova."});
    return;
  }
  if(!currentBusiness){
    postToEditor({type:"khamakey:support-ticket-result",ok:false,message:"Attiva prima la pagina Business, poi riprova il ticket."});
    return;
  }
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
    message:error
      ? (error.message || "Ticket non inviato.")
      : "Ticket inviato. Ti risponderemo al più presto via email."
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
    if(redirectMomentsAccountAwayFromBusiness(currentUser)) return;
    syncShellUser(currentUser);

    currentBusiness = await ensureWorkspace(currentUser);
    if(!currentBusiness){
      const activated = await tryPendingBusinessActivation(currentUser);
      if(activated) currentBusiness = await ensureWorkspace(currentUser);
    }
    if(!currentBusiness){
      const prefill = normalizeBusinessCode(
        sessionStorage.getItem("khamakey_pending_business_code")
          || document.getElementById("loginProductCode")?.value
          || ""
      );
      showActivationForm(prefill,"Inserisci il codice NFC per attivare la tua pagina Business.");
      setCloudStatus("Attivazione richiesta");
      return;
    }

    const initialLinks = await refreshWorkspaceLinks();
    syncShellHeader(initialLinks);
    cacheWorkspaceMeta(initialLinks);

    const editorUrl = editorUrlForBusiness(currentBusiness.id,initialLinks);
    cacheEditorBootstrap(buildEditorLoadPayload(
      normalizeEditorState(currentBusiness.editor_state),
      initialLinks
    ));
    editorHydrated = false;
    resetHydrationRetry();
    if(editorSrcNeedsReload(editorFrame.getAttribute("src"),currentBusiness.id,initialLinks)){
      editorReady = false;
      pendingShellCommands = [];
      setCloudStatus("Editor in caricamento…","warn");
      editorFrame.src = editorUrl;
      scheduleEditorLoadWatch();
      scheduleSendStateBurst();
    }
    authView.hidden = true;
    appView.hidden = false;
    activationForm.hidden = true;
    renderAdminImpersonationBanner();
    if(editorSrcHasBusiness(editorFrame.getAttribute("src"),currentBusiness.id)){
      setCloudStatus(workspaceWarnings.length ? "Cloud collegato, dati parziali" : "Cloud collegato",workspaceWarnings.length ? "warn" : "ok");
      if(workspaceWarnings.length) setAuthStatus(`Accesso riuscito. Alcuni dati cloud non sono disponibili: ${workspaceWarnings.join(" | ")}`,"error");
      markEditorReadyIfPresent();
      await sendStateToEditor();
      scheduleSendStateBurst();
    }else if(workspaceWarnings.length){
      setAuthStatus(`Accesso riuscito. Alcuni dati cloud non sono disponibili: ${workspaceWarnings.join(" | ")}`,"error");
    }
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

function hasPublishableSnapshot(state){
  if(!state || typeof state !== "object") return false;
  const html = String(
    state.publicSnapshot?.html
    || publicStateFromEditor(state).publicSnapshot?.html
    || ""
  ).trim();
  return html.length >= 120;
}

async function saveDraft(state){
  if(!currentBusiness || !state) return;
  setCloudStatus("Salvataggio...");
  const editorState = {...state};
  delete editorState.publicSnapshot;
  const publicState = publicStateFromEditor(state);
  const hasSnapshot = hasPublishableSnapshot(state);
  const businessName = String(state.fields?.nome || "").trim();
  const writes = [
    supabase.from("businesses").update({
      nome:businessName || currentBusiness.nome,
      categoria:state.fields?.categoria || currentBusiness.categoria,
      updated_at:new Date().toISOString()
    }).eq("id",currentBusiness.id),
    supabase.from("business_editor_states").upsert({
      business_id:currentBusiness.id,
      profile_id:currentBusiness.profile_id || session.user.id,
      state:editorState,
      updated_at:new Date().toISOString()
    },{onConflict:"business_id"})
  ];
  if(hasSnapshot){
    writes.push(supabase.from("business_public_pages").upsert({
      business_id:currentBusiness.id,
      profile_id:currentBusiness.profile_id || session.user.id,
      slug:currentBusiness.slug,
      state:publicState,
      published:true,
      updated_at:new Date().toISOString()
    },{onConflict:"business_id"}));
  }
  const results = await Promise.all(writes);
  const businessError = results[0]?.error;
  const stateError = results[1]?.error;
  const publicPageError = hasSnapshot ? results[2]?.error : null;
  if(businessError || stateError || publicPageError){
    setCloudStatus("Errore salvataggio","error");
    throw businessError || stateError || publicPageError;
  }
  currentBusiness = {
    ...currentBusiness,
    editor_state:editorState,
    nome:businessName || currentBusiness.nome,
    categoria:state.fields?.categoria || currentBusiness.categoria
  };
  const links = await refreshWorkspaceLinks();
  syncShellHeader(links);
  postWorkspaceLinks(links);
  setCloudStatus(hasSnapshot ? "Pagina aggiornata" : "Bozza salvata","ok");
}

function queueSave(state,immediate=false){
  pendingState = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async()=>{
    try{
      await saveDraft(pendingState);
      if(hasPublishableSnapshot(pendingState)){
        publishSnapshotConfirmed = true;
        clearForcePublishRetries();
      }else{
        scheduleForcePublishRetries();
      }
      const links = workspaceLinks();
      syncShellHeader(links);
      postWorkspaceLinks(links);
      if(editorFrame.contentWindow){
        editorFrame.contentWindow.postMessage({
          type:"khamakey:save-ok",
          publicUrl:links.publicUrl,
          publicPageUrl:links.publicPageUrl,
          businessSlug:currentBusiness?.slug || links.businessSlug || "",
          nfcCode:links.nfcCode || "",
          workerUrl:PUBLIC_BASE_URL,
          publishedSnapshot:hasPublishableSnapshot(pendingState)
        },EDITOR_POST_TARGET);
      }
    }catch(error){
      console.error(error);
      if(editorFrame.contentWindow){
        editorFrame.contentWindow.postMessage({
          type:"khamakey:save-error",
          message:error?.message || "Salvataggio non riuscito."
        },EDITOR_POST_TARGET);
      }
      setCloudStatus("Errore salvataggio","error");
    }
  },immediate ? 0 : 1200);
}

function flushPendingShellCommands(){
  if(!editorReady || !pendingShellCommands.length || !editorFrame.contentWindow) return;
  const queue = pendingShellCommands.splice(0);
  queue.forEach(message=>{
    editorFrame.contentWindow.postMessage(message,EDITOR_POST_TARGET);
  });
}

function notifyEditorSaveBlocked(reason){
  if(!editorFrame.contentWindow) return;
  editorFrame.contentWindow.postMessage({
    type:"khamakey:save-error",
    message:reason
  },EDITOR_POST_TARGET);
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
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const loginCode = normalizeBusinessCode(document.getElementById("loginProductCode")?.value || "");
  if(loginCode) sessionStorage.setItem("khamakey_pending_business_code",loginCode);
  else sessionStorage.removeItem("khamakey_pending_business_code");
  refreshLoginCodeLabel();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password:document.getElementById("loginPassword").value
  });
  if(error){
    setAuthStatus(humanAuthError(error),"error");
  }
});

document.getElementById("signupNextStep")?.addEventListener("click",()=>{
  const code = normalizeBusinessCode(document.getElementById("signupProductCode")?.value || "");
  if(!/^[A-Z0-9]{8,32}$/.test(code)){
    setAuthStatus("Inserisci un codice prodotto valido (8-32 caratteri).","error");
    return;
  }
  setAuthStatus("");
  setSignupStep(2);
});

document.getElementById("signupPrevStep")?.addEventListener("click",()=>setSignupStep(1));

signupForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!supabase) return;
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const code = normalizeBusinessCode(document.getElementById("signupProductCode")?.value || "");
  const businessName = document.getElementById("signupBusiness").value.trim();
  if(!/^[A-Z0-9]{8,32}$/.test(code)){
    setAuthStatus("Codice prodotto non valido.","error");
    setSignupStep(1);
    return;
  }
  if(!businessName){
    setAuthStatus("Inserisci il nome attività.","error");
    return;
  }
  sessionStorage.setItem("khamakey_pending_business_code",code);
  setAuthStatus("Creazione account...");
  const { data,error } = await supabase.auth.signUp({
    email,
    password:document.getElementById("signupPassword").value,
    options:{
      emailRedirectTo:authRedirectTo(),
      data:{
        full_name:document.getElementById("signupName").value.trim(),
        business_name:businessName,
        pending_business_code:code
      }
    }
  });
  if(error){
    if(/already registered|already been registered|user already registered/i.test(String(error.message || ""))){
      promptExistingAccountLogin(email);
      return;
    }
    setAuthStatus(error.message,"error");
    return;
  }
  if(data.session?.user){
    currentUser = data.session.user;
    try{
      await activateBusinessCode(code,businessName);
      sessionStorage.removeItem("khamakey_pending_business_code");
      setAuthStatus("Account creato e prodotto collegato.","ok");
    }catch(activationError){
      console.error(activationError);
      setAuthStatus(activationError.message || "Account creato, ma codice non collegato. Usa il modulo attivazione.","error");
      showActivationForm(code);
      return;
    }
    currentBusiness = null;
    await loadApplication();
    return;
  }
  if(isRepeatedSignup(data)){
    promptExistingAccountLogin(email);
    return;
  }
  setAuthStatus("Account creato. Conferma l’email, poi accedi con lo stesso codice prodotto.","ok");
});

activationForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!supabase || !session?.user){
    setAuthStatus("Sessione scaduta. Accedi di nuovo e riprova.","error");
    return;
  }
  const code = normalizeBusinessCode(document.getElementById("activationCode")?.value || "");
  const businessName = document.getElementById("activationBusiness")?.value.trim() || "";
  if(!/^[A-Z0-9]{8,32}$/.test(code)){
    setAuthStatus("Codice prodotto non valido.","error");
    return;
  }
  if(!businessName){
    setAuthStatus("Inserisci il nome attività.","error");
    return;
  }
  setAuthStatus("Attivazione in corso...");
  try{
    const row = await activateBusinessCode(code,businessName);
    sessionStorage.removeItem("khamakey_pending_business_code");
    currentBusiness = await reloadWorkspaceBusiness(row.business_id);
    setAuthStatus("Prodotto attivato. Apertura editor…","ok");
    await loadApplication();
  }catch(error){
    setAuthStatus(error.message || "Attivazione non riuscita.","error");
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
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  if(!email){
    setAuthStatus("Inserisci prima la tua email.","error");
    return;
  }
  const redirectTo = authRedirectTo("/");
  const { error } = await supabase.auth.resetPasswordForEmail(email,{redirectTo});
  const loggedAs = session?.user?.email;
  const extra = loggedAs && loggedAs.toLowerCase() !== email.toLowerCase()
    ? ` Sei ancora connesso come ${loggedAs}: esci prima, poi riapri il link dall’email.`
    : " Apri il link sullo stesso dispositivo. Se eri connesso con un altro account, esci prima.";
  setAuthStatus(error ? humanAuthError(error) : `Email inviata a ${email}.${extra}`,error ? "error" : "ok");
});

document.getElementById("logoutButton")?.addEventListener("click",async()=>{
  if(supabase) await supabase.auth.signOut();
});

const shellUserMenu = document.getElementById("shellUserMenu");
const shellUserBtn = document.getElementById("shellUserBtn");
const shellUserDropdown = document.getElementById("shellUserDropdown");
shellUserBtn?.addEventListener("click",event=>{
  event.stopPropagation();
  const open = shellUserDropdown?.hidden !== false;
  if(shellUserDropdown) shellUserDropdown.hidden = !open;
  shellUserBtn?.setAttribute("aria-expanded",open ? "true" : "false");
});
document.addEventListener("click",event=>{
  if(!event.target.closest("#shellUserMenu") && shellUserDropdown){
    shellUserDropdown.hidden = true;
    shellUserBtn?.setAttribute("aria-expanded","false");
  }
});

document.getElementById("shellCopyLinkBtn")?.addEventListener("click",async()=>{
  if(!shellPublicUrl) return;
  try{
    await navigator.clipboard.writeText(shellPublicUrl);
    setCloudStatus("Link copiato","ok");
  }catch{
    setCloudStatus("Impossibile copiare il link","error");
  }
});

document.getElementById("shellSaveBtn")?.addEventListener("click",()=>{
  postToEditor({type:"khamakey:shell-save"});
});
document.getElementById("shellMobilePreview")?.addEventListener("click",()=>{
  postToEditor({type:"khamakey:open-preview"});
});
document.getElementById("shellMobileAccount")?.addEventListener("click",()=>{
  openShellAccount("profile");
});
document.getElementById("shellMobileSave")?.addEventListener("click",()=>{
  postToEditor({type:"khamakey:shell-save"});
});

function openShellAccount(tab="profile"){
  if(shellUserDropdown) shellUserDropdown.hidden = true;
  shellUserBtn?.setAttribute("aria-expanded","false");
  postToEditor({type:"khamakey:open-account",tab});
}

document.querySelectorAll("[data-shell-account]").forEach(button=>{
  button.addEventListener("click",()=>openShellAccount(button.dataset.shellAccount));
});

document.getElementById("shellPreviewBtn")?.addEventListener("click",()=>{
  postToEditor({type:"khamakey:open-preview"});
});

function postToEditor(message){
  if(!editorFrame.contentWindow) return;
  markEditorReadyIfPresent();
  try{
    editorFrame.contentWindow.postMessage(message,EDITOR_POST_TARGET);
  }catch(error){
    console.warn("postToEditor",error);
  }
  const shellUi = message?.type === "khamakey:open-preview" || message?.type === "khamakey:open-account";
  if(shellUi && !editorReady) pendingShellCommands.push(message);
}

editorFrame.addEventListener("load",()=>{
  if(!editorFrame.src || editorFrame.src === "about:blank") return;
  editorHydrated = false;
  try{
    const doc = editorFrame.contentDocument;
    if(!doc?.getElementById("s-info") && !doc?.getElementById("s-dashboard")){
      clearEditorLoadTimer();
      setCloudStatus("Editor non trovato sul server (404).","error");
      setAuthStatus("Rideploy necessario: editor non raggiungibile.","error");
      return;
    }
  }catch(error){
    console.warn("editor iframe inspect",error);
  }
  markEditorReadyIfPresent();
  sendStateToEditor();
  scheduleSendStateBurst();
  setTimeout(()=> sendStateToEditor(),120);
  setTimeout(()=> markEditorReadyIfPresent(),400);
  scheduleEditorHandshakePoll();
});

window.addEventListener("message",event=>{
  if(!isEditorFrameMessage(event)) return;
  if(event.data?.type === "khamakey:editor-ready"){
    editorReady = true;
    clearEditorLoadTimer();
    sendStateToEditor();
    scheduleSendStateBurst();
    flushPendingShellCommands();
    setCloudStatus(workspaceWarnings.length ? "Cloud collegato, dati parziali" : "Cloud collegato",workspaceWarnings.length ? "warn" : "ok");
    return;
  }
  if(event.data?.type === "khamakey:request-state"){
    sendStateToEditor();
    return;
  }
  if(event.data?.type === "khamakey:request-links"){
    refreshWorkspaceLinks().then(links=>{
      syncShellHeader(links);
      postWorkspaceLinks(links);
    });
    return;
  }
  if(event.data?.type === "khamakey:editor-hydrated"){
    editorHydrated = true;
    resetHydrationRetry();
    if(workspaceWarnings.length){
      setCloudStatus("Cloud collegato, alcuni dati non disponibili","warn");
    }else{
      setCloudStatus("Cloud collegato","ok");
    }
    refreshWorkspaceLinks().then(links=>{
      syncShellHeader(links);
      postWorkspaceLinks(links);
    });
    scheduleForcePublishRetries();
    return;
  }
  if(["khamakey:dirty","khamakey:save","khamakey:public-snapshot"].includes(event.data?.type) && !editorHydrated && !editorReady){
    console.warn("Editor non ancora pronto: messaggio ignorato",event.data?.type);
    if(event.data?.type === "khamakey:save"){
      notifyEditorSaveBlocked("Sincronizzazione in corso. Attendi un secondo e riprova.");
    }
    return;
  }
  if(event.data?.type === "khamakey:public-snapshot" && !editorHydrated){
    if(hasPublishableSnapshot(event.data.state)) queueSave(event.data.state,true);
    return;
  }
  if(event.data?.type === "khamakey:dirty"){
    setCloudStatus("Salvataggio automatico…","warn");
    if(hasPublishableSnapshot(event.data.state)) queueSave(event.data.state);
    return;
  }
  if(event.data?.type === "khamakey:save"){
    if(!hasPublishableSnapshot(event.data.state)){
      postToEditor({type:"khamakey:force-publish"});
      scheduleForcePublishRetries();
      notifyEditorSaveBlocked("Anteprima in preparazione. Salvataggio automatico in corso…");
      return;
    }
    queueSave(event.data.state,true);
    return;
  }
  if(event.data?.type === "khamakey:public-snapshot"){
    if(hasPublishableSnapshot(event.data.state)) queueSave(event.data.state,true);
    else scheduleForcePublishRetries();
    return;
  }
  if(event.data?.type === "khamakey:logout") supabase.auth.signOut();
  if(event.data?.type === "khamakey:refresh-analytics") refreshAnalytics();
  if(event.data?.type === "khamakey:create-support-ticket") createSupportTicketFromEditor(event.data);
});
setInterval(refreshAnalytics,15000);

function bindAuthStateListener(){
  supabase.auth.onAuthStateChange(async(event,newSession)=>{
    session = newSession;
    if(event === "PASSWORD_RECOVERY"){
      authCallbackPending = false;
      showRecoveryForm(newSession?.user?.email || "");
      return;
    }
    if(event === "SIGNED_IN" && pendingRecovery){
      authCallbackPending = false;
      showRecoveryForm(newSession?.user?.email || "");
      return;
    }
    if(event === "INITIAL_SESSION"){
      if(authCallbackPending){
        if(session && pendingRecovery){
          authCallbackPending = false;
          showRecoveryForm(session.user?.email || "");
          return;
        }
        if(!session) return;
      }
      if(session && pendingRecovery){
        showRecoveryForm(session.user?.email || "");
        return;
      }
      if(session && !recoveryMode){
        try{
          await loadApplication();
        }catch(error){
          setAuthStatus(error.message,"error");
          authView.hidden = false;
        }
      }else if(!session){
        authView.hidden = false;
      }
      return;
    }
    if(!session){
      currentUser = null;
      currentBusiness = null;
      currentNfc = null;
      editorHydrated = false;
      editorReady = false;
      pendingShellCommands = [];
      sessionStorage.removeItem("khamakey_pending_business_code");
      refreshLoginCodeLabel();
      editorFrame.src = "about:blank";
      appView.hidden = true;
      authView.hidden = false;
      switchAuthTab("login");
      setCloudStatus("Disconnesso");
      return;
    }
    if(recoveryMode) return;
    authCallbackPending = false;
    try{
      await loadApplication();
    }catch(error){
      setAuthStatus(error.message,"error");
      authView.hidden = false;
    }
  });
}

async function bootstrapAuth(){
  if(!configureClient()){
    authView.hidden = false;
    return;
  }
  applyUrlParams();
  const flags = authCallbackFlags();
  pendingRecovery = flags.isRecovery;
  authView.hidden = false;
  await prepareAuthCallback();
  bindAuthStateListener();
}

bootstrapAuth();
