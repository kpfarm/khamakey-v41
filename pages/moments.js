import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";
import {
  uploadImage,
  uploadImages,
  validateImageFile,
  MAX_GALLERY_IMAGES
} from "./media-upload.js";

const auth = document.getElementById("momentsAuth");
const app = document.getElementById("momentsApp");
const authTabs = document.getElementById("authTabs");
const loginForm = document.getElementById("momentsLoginForm");
const signupForm = document.getElementById("momentsSignupForm");
const forgotForm = document.getElementById("momentsForgotForm");
const recoveryForm = document.getElementById("momentsRecoveryForm");
const statusNode = document.getElementById("momentsAuthStatus");
const detail = document.getElementById("momentDetail");
const userEmail = document.getElementById("momentsUserEmail");
const userAvatar = document.getElementById("momentsUserAvatar");
const userMenu = document.getElementById("momentsUserMenu");
const userMenuBtn = document.getElementById("momentsUserMenuBtn");
const PUBLIC_BASE_URL = WORKER_BASE_URL;

const SECTION_ORDER_DEFAULT = ["intro","details","gallery","schedule","location","contacts","message"];

const TYPE_LABELS = {
  free:"Uso libero",
  wedding:"Matrimonio",
  party:"Festa",
  travel:"Viaggio",
  memory:"Ricordo",
  memorial:"Memoriale",
  portfolio:"Portfolio"
};

const DEFAULT_SECTIONS = {
  intro:{enabled:true,title:"La nostra storia",body:"",images:[]},
  details:{enabled:true,title:"Dettagli",body:"",images:[]},
  gallery:{enabled:false,title:"Galleria",body:"",images:[]},
  schedule:{enabled:false,title:"Programma",body:"",images:[]},
  location:{enabled:false,title:"Luogo",body:"",images:[],address:"",maps_url:""},
  contacts:{enabled:false,title:"Contatti",body:"",images:[],email:"",phone:""},
  message:{enabled:false,title:"Messaggio",body:"",images:[]}
};

const SECTION_LABELS = {
  intro:"Introduzione",
  details:"Dettagli principali",
  gallery:"Galleria o ricordi",
  schedule:"Programma",
  location:"Luogo",
  contacts:"Contatti",
  message:"Messaggio libero"
};

const SECTION_SUBTITLES = {
  intro:"Presenta il momento e racconta la storia",
  details:"Informazioni essenziali da condividere",
  gallery:"Foto e ricordi visivi della pagina",
  schedule:"Timeline degli appuntamenti o tappe",
  location:"Indirizzo e link alle mappe",
  contacts:"Email e telefono per contattarti",
  message:"Un pensiero libero per chi visita la pagina"
};

const EDITOR_PANELS = {
  objects:{title:"Oggetti & Account",subtitle:"Scegli quale pagina modificare o attiva un nuovo prodotto NFC"},
  cover:{title:"Copertina",subtitle:"Titolo, immagine e tema della pagina pubblica"},
  order:{title:"Ordine sezioni",subtitle:"Trascina per definire l'ordine nella pagina NFC"},
  privacy:{title:"Privacy & PIN",subtitle:"Visibilità, bozza e protezione con PIN"}
};

let activeEditorPanel = "objects";
let mobilePreviewMode = false;

const MOBILE_NAV = [
  {id:"objects",label:"Oggetti",icon:"◉"},
  {id:"cover",label:"Copertina",icon:"✦"},
  {id:"section-intro",label:"Intro",icon:"✦"},
  {id:"section-details",label:"Dettagli",icon:"◎"},
  {id:"section-gallery",label:"Foto",icon:"▣"},
  {id:"section-schedule",label:"Programma",icon:"◷"},
  {id:"section-location",label:"Luogo",icon:"⌖"},
  {id:"section-contacts",label:"Contatti",icon:"☎"},
  {id:"section-message",label:"Messaggio",icon:"❝"},
  {id:"order",label:"Ordine",icon:"☰"},
  {id:"privacy",label:"PIN",icon:"🔒"}
];

const SECTION_ICONS = {
  intro:"✦",
  details:"◎",
  gallery:"▣",
  schedule:"◷",
  location:"⌖",
  contacts:"☎",
  message:"❝"
};

const THEME_LABELS = {
  classic:"Classico KhamaKey",
  celebration:"Celebrazione",
  minimal:"Minimal",
  memorial:"Memoriale sobrio"
};

const MOMENT_TEMPLATES = {
  wedding:{subtitle:"Un giorno da ricordare per sempre",sections:{
    intro:{enabled:true,title:"La nostra storia",body:"Come ci siamo conosciuti e perché questo giorno è speciale per noi."},
    details:{enabled:true,title:"Dettagli matrimonio",body:"Data, luogo della cerimonia e del ricevimento."},
    schedule:{enabled:true,title:"Programma della giornata",body:"Cerimonia\nRicevimento\nTaglio torta\nFesta"},
    location:{enabled:true,title:"Dove trovarci",body:"Indirizzo e indicazioni per raggiungere la location."},
    gallery:{enabled:true,title:"Le nostre foto",body:"Alcuni ricordi che vogliamo condividere con voi.",images:[]},
    contacts:{enabled:false,title:"Contatti",body:"",images:[]},
    message:{enabled:true,title:"Un messaggio per voi",body:"Grazie per essere parte di questo momento.",images:[]}
  }},
  party:{subtitle:"Festeggiamo insieme",sections:{
    intro:{enabled:true,title:"Benvenuti alla festa",body:"Cosa festeggiamo e perché vogliamo condividere questo momento."},
    details:{enabled:true,title:"Info utili",body:"Dress code, orario e cosa portare."},
    schedule:{enabled:true,title:"Programma serata",body:"Aperitivo\nCena\nMusica\nSorpresa"},
    location:{enabled:true,title:"Location",body:"Dove si svolge la festa e come arrivare."},
    gallery:{enabled:true,title:"Galleria",body:"",images:[]},
    contacts:{enabled:true,title:"Contatti",body:"Per informazioni scrivici qui.",images:[]},
    message:{enabled:false,title:"Messaggio",body:"",images:[]}
  }},
  travel:{subtitle:"Il nostro viaggio",sections:{
    intro:{enabled:true,title:"Partenza",body:"Dove andiamo e perché abbiamo scelto questa meta."},
    details:{enabled:true,title:"Tappe principali",body:"Città, esperienze e momenti da non perdere."},
    schedule:{enabled:true,title:"Itinerario",body:"Giorno 1\nGiorno 2\nGiorno 3"},
    location:{enabled:true,title:"Mappa e luoghi",body:"Hotel, ristoranti e punti di interesse."},
    gallery:{enabled:true,title:"Diario di viaggio",body:"",images:[]},
    contacts:{enabled:false,title:"Contatti",body:"",images:[]},
    message:{enabled:true,title:"Ricordo del viaggio",body:"Un pensiero da conservare.",images:[]}
  }},
  memory:{subtitle:"Un ricordo da custodire",sections:{
    intro:{enabled:true,title:"Il ricordo",body:"Cosa rende speciale questo momento."},
    details:{enabled:true,title:"Dettagli",body:"Data, contesto e persone coinvolte."},
    gallery:{enabled:true,title:"Immagini",body:"",images:[]},
    message:{enabled:true,title:"Messaggio personale",body:"Un pensiero da tenere vicino.",images:[]},
    schedule:{enabled:false,title:"Programma",body:"",images:[]},
    location:{enabled:false,title:"Luogo",body:"",images:[]},
    contacts:{enabled:false,title:"Contatti",body:"",images:[]}
  }},
  memorial:{subtitle:"In memoria",sections:{
    intro:{enabled:true,title:"Ricordo",body:"Un tributo a una persona o un momento importante."},
    details:{enabled:true,title:"Dettagli",body:"Informazioni essenziali da condividere con discrezione."},
    message:{enabled:true,title:"Messaggio",body:"Parole che vogliamo lasciare.",images:[]},
    gallery:{enabled:true,title:"Galleria",body:"",images:[]},
    schedule:{enabled:false,title:"Programma",body:"",images:[]},
    location:{enabled:false,title:"Luogo",body:"",images:[]},
    contacts:{enabled:false,title:"Contatti",body:"",images:[]}
  }},
  portfolio:{subtitle:"Portfolio e lavori",sections:{
    intro:{enabled:true,title:"Chi sono / Chi siamo",body:"Presentazione breve e ambito di lavoro."},
    details:{enabled:true,title:"Servizi",body:"Cosa offro e come lavoro."},
    gallery:{enabled:true,title:"Lavori selezionati",body:"",images:[]},
    contacts:{enabled:true,title:"Contatti",body:"Email, telefono o social per collaborazioni.",images:[]},
    schedule:{enabled:false,title:"Programma",body:"",images:[]},
    location:{enabled:false,title:"Luogo",body:"",images:[]},
    message:{enabled:false,title:"Messaggio",body:"",images:[]}
  }},
  free:{subtitle:"",sections:{...DEFAULT_SECTIONS}}
};

let supabase;
let rows = [];
let activeId = "";
let currentUser = null;
let sectionOrder = [...SECTION_ORDER_DEFAULT];
let recoveryMode = false;
let signupStep = 1;
let editorDirty = false;
let savedEditorSnapshot = "";
let uploadBusy = false;

function setStatus(node,message="",type=""){
  if(!node) return;
  node.textContent = message;
  node.className = `status ${type}`.trim();
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function normalizeCode(value){
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
}

function validatePin(pin){
  const clean = String(pin || "").trim();
  if(clean.length < 4) throw new Error("Il PIN deve avere almeno 4 caratteri.");
  return clean;
}

function pinStorageKey(eventId){
  return `moments_pin_${eventId}`;
}

function rememberPin(eventId,pin){
  if(!eventId || !pin) return;
  try{ localStorage.setItem(pinStorageKey(eventId),String(pin)); }catch{}
}

function getRememberedPin(eventId){
  try{ return localStorage.getItem(pinStorageKey(eventId)) || ""; }catch{ return ""; }
}

function clearRememberedPin(eventId){
  try{ localStorage.removeItem(pinStorageKey(eventId)); }catch{}
}

function showPinSuccessBanner(eventId,pin,title){
  const existing = document.getElementById("pinSuccessBanner");
  existing?.remove();
  const banner = document.createElement("div");
  banner.id = "pinSuccessBanner";
  banner.className = "pin-success-banner";
  banner.innerHTML = `
    <div>
      <p class="eyebrow">PIN impostato</p>
      <h3>Salva il PIN di «${esc(title || "la tua pagina")}»</h3>
      <p>Serve per aprire la pagina pubblica NFC. Non possiamo mostrarlo di nuovo su altri dispositivi.</p>
      <div class="pin-reveal-row">
        <code id="pinRevealValue">${esc(pin)}</code>
        <button type="button" class="ghost" id="copyPinBtn">Copia PIN</button>
      </div>
    </div>
    <button type="button" class="pin-success-close" id="dismissPinBanner" aria-label="Chiudi">×</button>`;
  detail.prepend(banner);
  document.getElementById("copyPinBtn")?.addEventListener("click",()=>copyText(pin,document.getElementById("copyPinBtn")));
  document.getElementById("dismissPinBanner")?.addEventListener("click",()=>banner.remove());
}

function parseImageLines(value){
  return String(value || "").split(/\n+/).map(line=>line.trim()).filter(line=>/^https?:\/\//i.test(line)).slice(0,24);
}

function formatImageLines(images){
  return Array.isArray(images) ? images.filter(Boolean).join("\n") : "";
}

function normalizeSectionOrder(order){
  const base = Array.isArray(order) ? order.filter(key=>DEFAULT_SECTIONS[key]) : [];
  return [...base, ...SECTION_ORDER_DEFAULT.filter(key=>!base.includes(key))];
}

function authRedirectUrl(){
  return location.protocol === "file:" ? undefined : `${location.origin}/moments.html`;
}

function bindPasswordToggles(root=document){
  root.querySelectorAll("[data-password-target]").forEach(button=>{
    button.addEventListener("click",()=>{
      const input = document.getElementById(button.dataset.passwordTarget);
      if(!input) return;
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.classList.toggle("visible",visible);
      button.setAttribute("aria-label", visible ? "Nascondi password" : "Mostra password");
    });
  });
}

function bindCodeInputs(root=document){
  root.querySelectorAll("input[name='code'],#momentsSignupCode").forEach(input=>{
    input.addEventListener("input",()=>{
      const pos = input.selectionStart;
      input.value = normalizeCode(input.value);
      if(pos != null) input.setSelectionRange(pos,pos);
    });
  });
}

async function copyText(value,button){
  try{
    await navigator.clipboard.writeText(value);
    if(button){
      const prev = button.textContent;
      button.textContent = "Copiato";
      button.classList.add("copy-ok");
      setTimeout(()=>{ button.textContent = prev; button.classList.remove("copy-ok"); },1400);
    }
  }catch{
    window.prompt("Copia questo link:",value);
  }
}

function showAuthTab(tab){
  recoveryMode = false;
  authTabs.hidden = false;
  document.querySelectorAll("[data-auth-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.authTab === tab);
  });
  loginForm.hidden = tab !== "login";
  signupForm.hidden = tab !== "signup";
  forgotForm.hidden = true;
  recoveryForm.hidden = true;
  setStatus(statusNode,"");
}

function showForgotForm(){
  recoveryMode = false;
  authTabs.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  recoveryForm.hidden = true;
  forgotForm.hidden = false;
  const email = document.getElementById("momentsEmail")?.value?.trim();
  if(email) document.getElementById("momentsForgotEmail").value = email;
  setStatus(statusNode,"");
}

function showRecoveryForm(){
  recoveryMode = true;
  authTabs.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  forgotForm.hidden = true;
  recoveryForm.hidden = false;
  setStatus(statusNode,"");
}

function setSignupStep(step){
  signupStep = step;
  document.querySelectorAll(".signup-step").forEach(node=>{
    node.classList.toggle("active",Number(node.dataset.step) === step);
  });
  document.querySelectorAll("[data-signup-panel]").forEach(panel=>{
    panel.hidden = Number(panel.dataset.signupPanel) !== step;
  });
}

let adminEventId = "";
let adminMode = false;

function applyUrlParams(){
  const params = new URLSearchParams(location.search);
  const code = normalizeCode(params.get("code") || "");
  adminEventId = String(params.get("admin_event") || "").trim();
  adminMode = Boolean(adminEventId);
  if(code){
    showAuthTab("signup");
    document.getElementById("momentsSignupCode").value = code;
    setSignupStep(1);
  }
  if(params.get("tab") === "signup") showAuthTab("signup");
}

async function activateCode({ code, title, momentType, pin }){
  const cleanCode = normalizeCode(code);
  if(!/^[A-Z0-9]{8,32}$/.test(cleanCode)) throw new Error("Il codice deve contenere 8-32 lettere o numeri.");
  const cleanPin = validatePin(pin);
  const publicSlug = cleanCode.toLowerCase();
  const { data,error } = await supabase.rpc("activate_moment_code",{
    p_code:cleanCode,
    p_title:title,
    p_slug:publicSlug,
    p_moment_type:momentType || "free",
    p_pin_hash:await momentPinHash(publicSlug,cleanPin)
  });
  if(error) throw error;
  return (Array.isArray(data) ? data[0] : data) || {};
}

async function momentPinHash(slug,pin){
  const data = new TextEncoder().encode(`moment:${slug}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

function mergedState(row){
  const state = row.page_state && typeof row.page_state === "object" ? row.page_state : {};
  const sections = {};
  for(const key of Object.keys(DEFAULT_SECTIONS)){
    const incoming = state.sections?.[key] || {};
    sections[key] = {...DEFAULT_SECTIONS[key],...incoming,images:Array.isArray(incoming.images) ? incoming.images.filter(Boolean) : []};
  }
  return {
    title:row.title || state.title || "",
    type:row.moment_type || row.event_type || state.type || "free",
    subtitle:state.subtitle || "",
    description:row.description || state.description || "",
    cover_url:state.cover_url || "",
    theme:state.theme || "classic",
    sectionOrder:normalizeSectionOrder(state.sectionOrder),
    sections
  };
}

function showAuth(message=""){
  auth.hidden = false;
  app.hidden = true;
  setStatus(statusNode,message);
}

async function showApp(user){
  if(!user) return;
  currentUser = user;
  auth.hidden = true;
  app.hidden = false;
  const email = user.email || "";
  if(userEmail) userEmail.textContent = email;
  if(userAvatar) userAvatar.textContent = (email[0] || "K").toUpperCase();
  ensureMobileNav();
  bindGlobalAppChrome();
  try{
    await loadObjects();
    if(!adminMode) await tryPendingActivation(user);
  }catch(error){
    console.error(error);
    setStatus(statusNode,error.message || "Errore caricamento area Moments.","error");
  }
}

function bindGlobalAppChrome(){
  if(userMenuBtn && userMenu && userMenuBtn.dataset.bound !== "1"){
    userMenuBtn.dataset.bound = "1";
    userMenuBtn.addEventListener("click",event=>{
      event.stopPropagation();
      userMenu.classList.toggle("open");
    });
    document.addEventListener("click",event=>{
      if(!userMenu.contains(event.target) && event.target !== userMenuBtn) userMenu.classList.remove("open");
    });
  }
  if(document.getElementById("momentsPreviewFab")?.dataset.bound !== "1"){
    const fab = document.getElementById("momentsPreviewFab");
    fab.dataset.bound = "1";
    fab.addEventListener("click",()=>{
      const shell = document.getElementById("momentEditorShell");
      if(!shell) return;
      mobilePreviewMode = !mobilePreviewMode;
      shell.classList.toggle("show-preview",mobilePreviewMode);
      fab.textContent = mobilePreviewMode ? "Modifica" : "Anteprima";
    });
  }
}

function ensureMobileNav(){
  const inner = document.getElementById("momentsBnavInner");
  if(!inner || inner.dataset.ready === "1") return;
  inner.dataset.ready = "1";
  MOBILE_NAV.forEach(item=>{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bnav-item";
    button.dataset.editorPanel = item.id;
    button.innerHTML = `<span class="bnav-icon">${item.icon}</span>${item.label}`;
    button.addEventListener("click",()=>{
      setEditorPanel(item.id);
      const shell = document.getElementById("momentEditorShell");
      if(shell && mobilePreviewMode){
        mobilePreviewMode = false;
        shell.classList.remove("show-preview");
        const fab = document.getElementById("momentsPreviewFab");
        if(fab) fab.textContent = "Anteprima";
      }
      window.scrollTo({top:0,behavior:"smooth"});
    });
    inner.appendChild(button);
  });
}

function syncMobileNav(panelId){
  document.querySelectorAll("#momentsBnavInner .bnav-item").forEach(button=>{
    button.classList.toggle("active",button.dataset.editorPanel === panelId);
  });
}

function bindPageMenuActions(publicUrl,nfcUrl){
  const openPage = document.getElementById("momentsMenuOpenPage");
  const testNfc = document.getElementById("momentsMenuTestNfc");
  const copyLink = document.getElementById("momentsMenuCopyLink");
  if(openPage){
    openPage.hidden = !publicUrl;
    openPage.onclick = ()=>publicUrl && window.open(publicUrl,"_blank","noopener");
  }
  if(testNfc){
    testNfc.hidden = !nfcUrl;
    testNfc.onclick = ()=>nfcUrl && window.open(nfcUrl,"_blank","noopener");
  }
  if(copyLink){
    copyLink.hidden = !publicUrl;
    copyLink.onclick = ()=>publicUrl && copyText(publicUrl,copyLink);
  }
}

async function tryPendingActivation(user){
  const pendingCode = normalizeCode(user?.user_metadata?.pending_moment_code || "");
  if(!pendingCode || rows.some(row=>normalizeCode(row.nfc_code) === pendingCode)) return;
  activeEditorPanel = "objects";
  if(activeId) renderDetail(activeId);
  else renderEmptyState(`Hai un codice da attivare (${pendingCode}). Compilalo nel modulo sotto.`,pendingCode);
}

function renderObjectsListHtml(){
  if(!rows.length) return `<p class="empty-inline">Nessun oggetto collegato. Attiva il primo codice nel modulo sotto.</p>`;
  return rows.map(row=>{
    const state = mergedState(row);
    const type = TYPE_LABELS[state.type] || state.type;
    return `<button class="object-pick ${row.id === activeId ? "active" : ""}" type="button" data-object-id="${esc(row.id)}">
      ${esc(state.title || row.slug)}
      <span>${esc(row.nfc_code || "NFC")} · ${row.public_visible ? "pubblicata" : "bozza"}</span>
      <span class="type-pill">${esc(type)}</span>
    </button>`;
  }).join("");
}

function renderActivationFormHtml(formId = "editorActivationForm",statusId = "editorActivationStatus",prefillCode = ""){
  return `<form id="${formId}" class="activation-inline-form">
    <label>Codice NFC<input name="code" autocomplete="off" placeholder="Esempio MOMENT1234" value="${esc(prefillCode)}" required></label>
    <label>Nome pagina<input name="title" placeholder="Esempio Il nostro viaggio" required></label>
    <label>PIN pagina<input name="access_pin" inputmode="numeric" autocomplete="new-password" placeholder="Esempio 1234" minlength="4" required></label>
    <label>Tipo utilizzo
      <select name="moment_type">
        ${Object.entries(TYPE_LABELS).map(([value,label])=>option(value,label,"free")).join("")}
      </select>
    </label>
    <button type="submit" class="primary">Attiva oggetto</button>
  </form>
  <p class="status" id="${statusId}"></p>`;
}

function renderObjectsPanel(){
  return `<div class="editor-panel ${activeEditorPanel === "objects" ? "active" : ""}" data-editor-panel="objects">
    ${renderSectionHeader(EDITOR_PANELS.objects.title,EDITOR_PANELS.objects.subtitle)}
    <div class="editor-card">
      <div class="side-head">
        <strong>Pagine collegate</strong>
        <span class="objects-count">${rows.length}</span>
      </div>
      <div class="objects-switcher" id="objectsSwitcher">${renderObjectsListHtml()}</div>
      <div class="activation-inline">
        <h3>Attiva un altro prodotto</h3>
        <p class="field-hint">Ogni codice NFC attiva il link pubblico già preparato per quell'oggetto.</p>
        ${renderActivationFormHtml()}
      </div>
    </div>
    <div class="editor-card account-card">
      <p class="eyebrow">Account</p>
      <p>${esc(currentUser?.email || "")}</p>
      <button type="button" class="ghost" id="editorLogout">Esci dall'account</button>
    </div>
  </div>`;
}

function renderEmptyState(message = "",prefillCode = ""){
  setEditorChromeVisible(false);
  detail.innerHTML = `
    <div class="empty-state">
      <p class="eyebrow">KhamaKey Moments</p>
      <h2>Attiva il tuo primo oggetto</h2>
      <p>${esc(message || "Inserisci il codice NFC ricevuto con il prodotto per creare la pagina collegata.")}</p>
    </div>
    <div class="editor-card" style="margin-top:16px;padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:14px">
      ${renderActivationFormHtml("emptyActivationForm","emptyActivationStatus",prefillCode)}
    </div>`;
  bindActivationForm(document.getElementById("emptyActivationForm"),document.getElementById("emptyActivationStatus"));
}

async function loadObjects(){
  let query = supabase
    .from("moment_events")
    .select("id,title,slug,event_type,moment_type,status,description,nfc_code,pin_enabled,public_visible,owner_email,page_state,created_at")
    .order("created_at",{ascending:false});
  if(adminMode && adminEventId){
    query = query.eq("id",adminEventId);
  }else if(!adminMode){
    query = query.eq("owner_email",(currentUser?.email || "").toLowerCase());
  }
  const { data,error } = await query;
  if(error){
    console.error(error);
    renderEmptyState(adminMode ? "Oggetto non trovato o permessi admin insufficienti." : "Oggetti non disponibili. Verifica account e codice prodotto.");
    return;
  }
  rows = data || [];
  if(adminMode && rows.length){
    const banner = document.getElementById("adminModeBanner");
    if(banner){
      banner.hidden = false;
      banner.textContent = `Modalità admin — stai modificando l'oggetto di ${rows[0].owner_email || "cliente"}. Le modifiche sono visibili al cliente.`;
    }
  }
  if(rows.length && !rows.some(row=>row.id === activeId)) activeId = rows[0].id;
  if(activeId) renderDetail(activeId);
  else renderEmptyState();
}

function refreshObjectsSwitcher(){
  const node = document.getElementById("objectsSwitcher");
  if(node) node.innerHTML = renderObjectsListHtml();
  document.querySelectorAll(".objects-count").forEach(node=>{ node.textContent = String(rows.length); });
  bindObjectSwitcher(detail);
}

function bindObjectSwitcher(root){
  root?.querySelectorAll("[data-object-id]").forEach(button=>{
    if(button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click",()=>{
      if(button.dataset.objectId === activeId) return;
      if(editorDirty && !confirm("Hai modifiche non salvate. Vuoi cambiare oggetto senza salvare?")) return;
      activeEditorPanel = "objects";
      renderDetail(button.dataset.objectId);
    });
  });
}

function bindActivationForm(form,statusEl){
  if(!form) return;
  bindCodeInputs(form);
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const data = new FormData(form);
    const code = normalizeCode(data.get("code"));
    const title = String(data.get("title") || "").trim();
    const pin = String(data.get("access_pin") || "").trim();
    const momentType = String(data.get("moment_type") || "free");
    if(!/^[A-Z0-9]{8,32}$/.test(code)) return setStatus(statusEl,"Codice non valido.","error");
    if(!title) return setStatus(statusEl,"Inserisci il nome della pagina.","error");
    try{ validatePin(pin); }catch(error){ return setStatus(statusEl,error.message,"error"); }
    setStatus(statusEl,"Collegamento in corso...");
    try{
      const item = await activateCode({code,title,momentType,pin});
      activeId = item.event_id || activeId;
      rememberPin(activeId,pin);
      form.reset();
      setStatus(statusEl,"Prodotto collegato al tuo account.","ok");
      activeEditorPanel = "cover";
      await loadObjects();
      if(activeId) showPinSuccessBanner(activeId,pin,title);
    }catch(error){
      console.error(error);
      setStatus(statusEl,error.message || "Collegamento non riuscito.","error");
    }
  });
}

function enableSection(formNode,key){
  const enabled = formNode.querySelector(`[name="section_${key}_enabled"]`);
  if(enabled && !enabled.checked){
    enabled.checked = true;
    enabled.dispatchEvent(new Event("change",{bubbles:true}));
  }
}

function applyTemplateToForm(formNode,type){
  const template = MOMENT_TEMPLATES[type] || MOMENT_TEMPLATES.free;
  if(template.subtitle) formNode.elements.subtitle.value = template.subtitle;
  for(const [key,section] of Object.entries(template.sections)){
    const enabled = formNode.querySelector(`[name="section_${key}_enabled"]`);
    const title = formNode.querySelector(`[name="section_${key}_title"]`);
    const body = formNode.querySelector(`[name="section_${key}_body"]`);
    const images = formNode.querySelector(`[name="section_${key}_images"]`);
    const details = formNode.querySelector(`details[data-section-key="${key}"]`);
    if(enabled) enabled.checked = Boolean(section.enabled);
    if(title) title.value = section.title || "";
    if(body) body.value = section.body || "";
    if(images) images.value = formatImageLines(section.images);
    if(details) details.open = Boolean(section.enabled);
  }
  markEditorDirty(formNode);
  renderPreview(readFormState(formNode));
}

function onboardingKey(eventId){
  return `moments_onboarding_${eventId}`;
}

function needsOnboarding(row){
  if(localStorage.getItem(onboardingKey(row.id)) === "done") return false;
  const state = mergedState(row);
  const hasContent = Boolean(state.subtitle || state.description || state.cover_url);
  const enabledSections = Object.values(state.sections || {}).filter(section=>section?.enabled).length;
  return !hasContent && enabledSections <= 2;
}

function setEditorChromeVisible(visible){
  document.getElementById("momentsBottomNav")?.toggleAttribute("hidden",!visible);
  document.getElementById("momentsPreviewFab")?.toggleAttribute("hidden",!visible);
  app?.classList.toggle("has-editor",visible);
}

function renderEditorSidebar(activePanel){
  const contentItems = sectionOrder.map(key=>`
    <button type="button" class="editor-nav-item ${activePanel === `section-${key}` ? "active" : ""}" data-editor-panel="section-${esc(key)}">
      <span class="editor-nav-icon">${esc(SECTION_ICONS[key] || "•")}</span>${esc(SECTION_LABELS[key])}
    </button>`).join("");
  return `<nav class="editor-sidebar" aria-label="Sezioni editor">
    <div class="editor-sidebar-group">Account</div>
    <button type="button" class="editor-nav-item ${activePanel === "objects" ? "active" : ""}" data-editor-panel="objects">
      <span class="editor-nav-icon">◉</span>Oggetti & Account
    </button>
    <div class="editor-sidebar-group">Pagina</div>
    <button type="button" class="editor-nav-item ${activePanel === "cover" ? "active" : ""}" data-editor-panel="cover">
      <span class="editor-nav-icon">✦</span>Copertina
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "order" ? "active" : ""}" data-editor-panel="order">
      <span class="editor-nav-icon">☰</span>Ordine sezioni
    </button>
    <div class="editor-sidebar-group">Contenuti</div>
    ${contentItems}
    <div class="editor-sidebar-group">Impostazioni</div>
    <button type="button" class="editor-nav-item ${activePanel === "privacy" ? "active" : ""}" data-editor-panel="privacy">
      <span class="editor-nav-icon">🔒</span>Privacy & PIN
    </button>
  </nav>`;
}

function renderSectionHeader(title,subtitle){
  return `<div class="section-header"><div class="section-title">${esc(title)}</div><div class="section-sub">${esc(subtitle)}</div></div>`;
}

function renderCoverPanel(state){
  return `<div class="editor-panel ${activeEditorPanel === "cover" ? "active" : ""}" data-editor-panel="cover">
    ${renderSectionHeader(EDITOR_PANELS.cover.title,EDITOR_PANELS.cover.subtitle)}
    <div class="editor-card">
      <div class="field-row">
        <label>Titolo pagina<input name="title" value="${esc(state.title)}" required></label>
        <label>Tipo utilizzo
          <select name="moment_type" id="momentTypeSelect">
            ${Object.entries(TYPE_LABELS).map(([value,label])=>option(value,label,state.type)).join("")}
          </select>
        </label>
      </div>
      <div class="template-row">
        <button type="button" class="ghost" id="applyMomentTemplate">Applica template</button>
        <span class="template-hint">Precompila testi in base al tipo scelto.</span>
      </div>
      <label>Sottotitolo<input name="subtitle" value="${esc(state.subtitle)}" placeholder="Frase breve per la copertina"></label>
      <label>Tema pagina pubblica
        <select name="page_theme">
          ${Object.entries(THEME_LABELS).map(([value,label])=>option(value,label,state.theme)).join("")}
        </select>
      </label>
      <label>Descrizione copertina<textarea name="description" placeholder="Cosa troveranno nella pagina">${esc(state.description)}</textarea></label>
      <div class="cover-preview-wrap">
        <label>Immagine copertina</label>
        <div class="upload-row">
          <input name="cover_url" value="${esc(state.cover_url)}" placeholder="https://... oppure carica un file">
          <input type="file" id="coverFileInput" accept="image/*" hidden>
          <button type="button" class="ghost upload-trigger" data-upload-target="cover">Carica foto</button>
        </div>
        <p class="field-hint" id="coverUploadStatus"></p>
        ${state.cover_url ? `<img class="cover-preview" id="coverPreview" src="${esc(state.cover_url)}" alt="" loading="lazy" decoding="async">` : `<img class="cover-preview" id="coverPreview" hidden alt="" loading="lazy" decoding="async">`}
      </div>
    </div>
  </div>`;
}

function renderOrderPanel(){
  return `<div class="editor-panel ${activeEditorPanel === "order" ? "active" : ""}" data-editor-panel="order">
    ${renderSectionHeader(EDITOR_PANELS.order.title,EDITOR_PANELS.order.subtitle)}
    <div class="editor-card">${renderSectionOrderList()}</div>
  </div>`;
}

function renderSectionPanels(state){
  return sectionOrder.map(key=>{
    const panelId = `section-${key}`;
    return `<div class="editor-panel ${activeEditorPanel === panelId ? "active" : ""}" data-editor-panel="${esc(panelId)}">
      ${renderSectionHeader(SECTION_LABELS[key],SECTION_SUBTITLES[key])}
      <div class="editor-card">${sectionEditor(key,state.sections[key],true)}</div>
    </div>`;
  }).join("");
}

function renderPrivacyPanel(row){
  const savedPin = getRememberedPin(row.id);
  const pinHintBlock = savedPin ? `
    <div class="pin-reminder-card">
      <p class="pin-reminder-label">PIN salvato su questo dispositivo</p>
      <div class="pin-reveal-row">
        <code id="savedPinValue">${esc(savedPin)}</code>
        <button type="button" class="ghost" id="copySavedPinBtn">Copia</button>
        <button type="button" class="ghost" id="forgetSavedPinBtn">Rimuovi da qui</button>
      </div>
      <p class="field-hint">Visibile solo su questo browser. Su un altro dispositivo imposta un nuovo PIN sotto.</p>
    </div>` : `
    <div class="pin-reminder-card pin-reminder-empty">
      <p class="field-hint"><strong>Il PIN non è recuperabile dal server</strong> (viene salvato cifrato). Se l'hai dimenticato, imposta un <em>nuovo PIN</em> nel campo sotto e clicca Salva.</p>
    </div>`;
  return `<div class="editor-panel ${activeEditorPanel === "privacy" ? "active" : ""}" data-editor-panel="privacy">
    ${renderSectionHeader(EDITOR_PANELS.privacy.title,EDITOR_PANELS.privacy.subtitle)}
    <div class="editor-card">
      ${pinHintBlock}
      <div class="pin-row">
        <label>Visibilità
          <select name="public_visible" id="publicVisibleSelect">
            <option value="true" ${row.public_visible ? "selected" : ""}>Pubblicata</option>
            <option value="false" ${!row.public_visible ? "selected" : ""}>Bozza privata</option>
          </select>
        </label>
        <label>Protezione PIN
          <select name="pin_enabled">
            <option value="true" ${row.pin_enabled ? "selected" : ""}>Attiva</option>
            <option value="false" ${!row.pin_enabled ? "selected" : ""}>Disattiva</option>
          </select>
        </label>
      </div>
      <label>Nuovo PIN<input name="access_pin" inputmode="numeric" autocomplete="new-password" placeholder="Lascia vuoto per mantenere il PIN attuale"></label>
      <p class="field-hint">Il PIN protegge la pagina pubblica collegata all'NFC. Condividilo solo con chi deve aprire la pagina.</p>
    </div>
  </div>`;
}

function renderOnboardingWizard(row){
  return `<div class="onboarding-wizard" id="onboardingWizard">
    <div class="onboarding-head">
      <p class="eyebrow">Primi passi</p>
      <h3>Costruisci la tua pagina in 3 step</h3>
      <button type="button" class="onboarding-close" id="dismissOnboarding" aria-label="Chiudi guida">×</button>
    </div>
    <ol class="onboarding-steps">
      <li class="active"><strong>1. Scegli il tipo</strong><span>Applica un template dalla sezione Copertina.</span></li>
      <li><strong>2. Personalizza</strong><span>Aggiungi titolo, foto e almeno una sezione contenuti.</span></li>
      <li><strong>3. Pubblica</strong><span>Salva e imposta «Pubblicata» in Privacy & PIN.</span></li>
    </ol>
    <button type="button" class="primary" id="onboardingStart">Inizia dalla Copertina</button>
  </div>`;
}

function setEditorPanel(panelId){
  activeEditorPanel = panelId;
  const shell = document.getElementById("momentEditorShell");
  if(!shell) return;
  shell.querySelectorAll("[data-editor-panel]").forEach(node=>{
    if(node.classList.contains("editor-nav-item")){
      node.classList.toggle("active",node.dataset.editorPanel === panelId);
    }else if(node.classList.contains("editor-panel")){
      node.classList.toggle("active",node.dataset.editorPanel === panelId);
    }
  });
  syncMobileNav(panelId);
}

function bindEditorNavigation(root){
  root.querySelectorAll(".editor-nav-item[data-editor-panel]").forEach(button=>{
    button.addEventListener("click",()=>{
      setEditorPanel(button.dataset.editorPanel);
      if(mobilePreviewMode){
        mobilePreviewMode = false;
        root.classList.remove("show-preview");
        const fab = document.getElementById("momentsPreviewFab");
        if(fab) fab.textContent = "Anteprima";
      }
    });
  });
}

function bindMobilePreviewToggle(root){
  root.querySelectorAll("[data-mobile-view]").forEach(button=>{
    button.addEventListener("click",()=>{
      mobilePreviewMode = button.dataset.mobileView === "preview";
      root.classList.toggle("show-preview",mobilePreviewMode);
      root.querySelectorAll("[data-mobile-view]").forEach(item=>{
        item.classList.toggle("active",item === button);
      });
    });
  });
}

function updateSaveStatus(saved){
  const node = document.getElementById("editorSaveStatus");
  if(node){
    node.textContent = saved ? "Salvato" : "Modifiche non salvate";
    node.classList.toggle("dirty",!saved);
  }
  document.getElementById("momentsSaveBar")?.classList.toggle("visible",!saved);
}

function renderSectionOrderList(){
  return `<div class="section-order-panel">
    <p class="section-order-hint">Trascina per cambiare l’ordine delle sezioni nella pagina pubblica.</p>
    <div class="section-order-list" id="sectionOrderList">
      ${sectionOrder.map((key,idx)=>`<div class="section-order-item" draggable="true" data-section-key="${esc(key)}">
        <span class="section-drag">☰</span><span class="section-order-icon">${esc(SECTION_ICONS[key] || "•")}</span><span>${esc(SECTION_LABELS[key])}</span><span class="section-order-num">#${idx+1}</span>
      </div>`).join("")}
    </div></div>`;
}

function bindSectionOrderDnD(){
  const listNode = document.getElementById("sectionOrderList");
  if(!listNode || listNode.dataset.bound === "1") return;
  listNode.dataset.bound = "1";
  let dragKey = null;
  const paint = ()=>{
    listNode.innerHTML = sectionOrder.map((key,idx)=>`<div class="section-order-item" draggable="true" data-section-key="${esc(key)}">
      <span class="section-drag">☰</span><span class="section-order-icon">${esc(SECTION_ICONS[key] || "•")}</span><span>${esc(SECTION_LABELS[key])}</span><span class="section-order-num">#${idx+1}</span>
    </div>`).join("");
  };
  listNode.addEventListener("dragstart",event=>{
    const item = event.target.closest(".section-order-item");
    if(!item) return;
    dragKey = item.dataset.sectionKey;
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  listNode.addEventListener("dragend",()=>{
    dragKey = null;
    listNode.querySelector(".dragging")?.classList.remove("dragging");
  });
  listNode.addEventListener("dragover",event=>{
    event.preventDefault();
    const over = event.target.closest(".section-order-item");
    if(!over || !dragKey || over.dataset.sectionKey === dragKey) return;
    const from = sectionOrder.indexOf(dragKey);
    const to = sectionOrder.indexOf(over.dataset.sectionKey);
    if(from < 0 || to < 0) return;
    sectionOrder.splice(from,1);
    sectionOrder.splice(to,0,dragKey);
    paint();
    const form = document.getElementById("momentEditorForm");
    if(form) markEditorDirty(form);
  });
  listNode.addEventListener("drop",event=>event.preventDefault());
}

function bindQuickPublish(root,row){
  const quickPublish = document.getElementById("quickPublishBtn");
  const select = document.getElementById("publicVisibleSelect");
  if(!quickPublish || !select) return;
  const sync = ()=>{
    const published = select.value === "true";
    quickPublish.textContent = published ? "Imposta bozza" : "Pubblica";
    quickPublish.classList.toggle("published",!published);
  };
  sync();
  quickPublish.addEventListener("click",()=>{
    select.value = select.value === "true" ? "false" : "true";
    sync();
    const form = document.getElementById("momentEditorForm");
    if(form) markEditorDirty(form);
  });
  select.addEventListener("change",sync);
}

function renderDetail(id){
  activeId = id;
  const row = rows.find(item=>item.id === id);
  if(!row) return;
  const state = mergedState(row);
  sectionOrder = [...state.sectionOrder];
  editorDirty = false;
  const publicUrl = `${PUBLIC_BASE_URL}/m/${encodeURIComponent(row.slug)}`;
  const nfcUrl = row.nfc_code ? `${PUBLIC_BASE_URL}/k/${encodeURIComponent(row.nfc_code)}` : "";
  const showWizard = needsOnboarding(row);
  detail.innerHTML = `
    ${adminMode ? `<p class="admin-mode-banner" id="adminModeBanner">Modalità admin — stai modificando l'oggetto di ${esc(row.owner_email || "cliente")}.</p>` : ""}
    <div class="detail-head">
      <div>
        <p class="eyebrow">Editor pagina</p>
        <h2>${esc(state.title || row.slug)}</h2>
        <p class="detail-meta">${esc(row.nfc_code || "")} · ${esc(TYPE_LABELS[state.type] || state.type)}</p>
        <div class="status-row">
          <span class="status-pill ${row.public_visible ? "live" : "draft"}">${row.public_visible ? "Pubblicata" : "Bozza privata"}</span>
          <span class="status-pill pin">${row.pin_enabled ? "PIN attivo" : "PIN disattivo"}</span>
        </div>
      </div>
      <div class="link-row">
        ${nfcUrl ? `<button type="button" class="copy-button" data-copy="${esc(nfcUrl)}">Copia NFC</button>` : ""}
        <button type="button" class="copy-button" data-copy="${esc(publicUrl)}">Copia link</button>
      </div>
    </div>
    ${showWizard ? renderOnboardingWizard(row) : ""}
    <div class="editor-shell" id="momentEditorShell">
      <div class="editor-topbar">
        <span class="editor-save-status" id="editorSaveStatus">Salvato</span>
        <div class="editor-topbar-actions">
          <div class="mobile-view-toggle">
            <button type="button" class="mobile-view-btn active" data-mobile-view="edit">Modifica</button>
            <button type="button" class="mobile-view-btn" data-mobile-view="preview">Anteprima</button>
          </div>
          <button type="button" class="ghost quick-publish published" id="quickPublishBtn">Pubblica</button>
          <a class="ghost editor-open-link" href="${esc(publicUrl)}" target="_blank" rel="noopener">Apri pagina</a>
          ${nfcUrl ? `<a class="ghost editor-open-link" href="${esc(nfcUrl)}" target="_blank" rel="noopener">Test NFC</a>` : ""}
          <button type="submit" form="momentEditorForm" class="primary editor-save-btn">Salva</button>
        </div>
      </div>
      <div class="editor-layout">
        ${renderEditorSidebar(activeEditorPanel)}
        <div class="editor-main">
          ${renderObjectsPanel()}
          <form id="momentEditorForm" class="editor-form-inner">
            ${renderCoverPanel(state)}
            ${renderOrderPanel()}
            ${renderSectionPanels(state)}
            ${renderPrivacyPanel(row)}
            <p class="status editor-form-status" id="editorStatus"></p>
          </form>
        </div>
        <aside class="preview-card" id="momentPreview">
          <div class="preview-label">Anteprima live</div>
        </aside>
      </div>
    </div>`;
  const editorForm = document.getElementById("momentEditorForm");
  const editorShell = document.getElementById("momentEditorShell");
  mobilePreviewMode = false;
  const previewFab = document.getElementById("momentsPreviewFab");
  if(previewFab) previewFab.textContent = "Anteprima";
  editorShell?.classList.remove("show-preview");
  savedEditorSnapshot = JSON.stringify(readFormState(editorForm));
  updateSaveStatus(true);
  editorForm.addEventListener("submit",event=>saveMoment(event,row));
  editorForm.addEventListener("input",()=>{
    markEditorDirty(editorForm);
    renderPreview(readFormState(editorForm));
    updateCoverPreview(editorForm);
  });
  editorForm.addEventListener("change",()=>{
    markEditorDirty(editorForm);
    renderPreview(readFormState(editorForm));
  });
  bindObjectSwitcher(detail);
  bindActivationForm(document.getElementById("editorActivationForm"),document.getElementById("editorActivationStatus"));
  document.getElementById("editorLogout")?.addEventListener("click",()=>document.getElementById("momentsLogout")?.click());
  document.getElementById("applyMomentTemplate")?.addEventListener("click",()=>{
    applyTemplateToForm(editorForm,editorForm.elements.moment_type.value || "free");
  });
  bindEditorNavigation(editorShell);
  bindMobilePreviewToggle(editorShell);
  bindQuickPublish(editorShell,row);
  bindMediaUploads(detail,row);
  document.getElementById("copySavedPinBtn")?.addEventListener("click",()=>copyText(getRememberedPin(row.id),document.getElementById("copySavedPinBtn")));
  document.getElementById("forgetSavedPinBtn")?.addEventListener("click",()=>{
    clearRememberedPin(row.id);
    renderDetail(row.id);
  });
  detail.querySelectorAll("[data-copy]").forEach(button=>{
    button.addEventListener("click",()=>copyText(button.dataset.copy,button));
  });
  document.getElementById("dismissOnboarding")?.addEventListener("click",()=>{
    localStorage.setItem(onboardingKey(row.id),"done");
    document.getElementById("onboardingWizard")?.remove();
  });
  document.getElementById("onboardingStart")?.addEventListener("click",()=>{
    setEditorPanel("cover");
    document.getElementById("onboardingWizard")?.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
  const orderList = document.getElementById("sectionOrderList");
  if(orderList) delete orderList.dataset.bound;
  bindSectionOrderDnD();
  renderPreview(readFormState(editorForm));
  syncMobileNav(activeEditorPanel);
  bindPageMenuActions(publicUrl,nfcUrl);
  setEditorChromeVisible(true);
}

function setUploadStatus(node,message="",type=""){
  if(!node) return;
  node.textContent = message;
  node.className = `field-hint ${type}`.trim();
}

async function uploadCoverImage(file,row,formNode){
  validateImageFile(file);
  const status = document.getElementById("coverUploadStatus");
  setUploadStatus(status,"Caricamento in corso...");
  uploadBusy = true;
  try{
    const url = await uploadImage(supabase,{scope:"moments",scopeId:row.id,file});
    formNode.elements.cover_url.value = url;
    updateCoverPreview(formNode);
    markEditorDirty(formNode);
    renderPreview(readFormState(formNode));
    setUploadStatus(status,"Copertina caricata.","ok");
  }catch(error){
    setUploadStatus(status,error.message || "Upload non riuscito.","error");
  }finally{
    uploadBusy = false;
  }
}

function readGalleryUrls(formNode,key){
  const textarea = formNode.querySelector(`textarea[name="section_${key}_images"]`);
  return parseImageLines(textarea?.value || "");
}

function writeGalleryUrls(formNode,key,urls){
  const textarea = formNode.querySelector(`textarea[name="section_${key}_images"]`);
  if(textarea) textarea.value = formatImageLines(urls);
}

function renderGalleryThumbs(formNode,key){
  const grid = document.getElementById(`galleryGrid_${key}`);
  if(!grid) return;
  const urls = readGalleryUrls(formNode,key);
  const addBtn = urls.length < MAX_GALLERY_IMAGES
    ? `<button type="button" class="gallery-add" data-gallery-add="${esc(key)}"><span>+</span>Carica foto</button>` : "";
  grid.innerHTML = urls.map((url,idx)=>`<div class="gallery-thumb"><img src="${esc(url)}" alt="" loading="lazy" decoding="async"><button type="button" class="gallery-remove" data-gallery-remove="${idx}" aria-label="Rimuovi">×</button></div>`).join("") + addBtn;
}

async function uploadGalleryImages(files,row,formNode,key){
  const current = readGalleryUrls(formNode,key);
  const room = Math.max(0,MAX_GALLERY_IMAGES - current.length);
  const batch = [...files].slice(0,room);
  if(!batch.length) throw new Error(`Puoi aggiungere ancora ${room} foto.`);
  const status = document.getElementById(`galleryUploadStatus_${key}`);
  setUploadStatus(status,`Caricamento ${batch.length} foto...`);
  uploadBusy = true;
  try{
    const urls = await uploadImages(supabase,{scope:"moments",scopeId:row.id},batch);
    writeGalleryUrls(formNode,key,[...current,...urls]);
    renderGalleryThumbs(formNode,key);
    enableSection(formNode,key);
    markEditorDirty(formNode);
    renderPreview(readFormState(formNode));
    setUploadStatus(status,`${urls.length} foto caricate. Clicca Salva per pubblicarle.`,"ok");
  }catch(error){
    setUploadStatus(status,error.message || "Upload non riuscito.","error");
  }finally{
    uploadBusy = false;
  }
}

function bindMediaUploads(root,row){
  const formNode = document.getElementById("momentEditorForm");
  if(!formNode) return;
  root.querySelector("[data-upload-target='cover']")?.addEventListener("click",()=>{
    document.getElementById("coverFileInput")?.click();
  });
  document.getElementById("coverFileInput")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadCoverImage(file,row,formNode);
  });
  root.querySelectorAll("[id^='galleryFile_']").forEach(input=>{
    input.addEventListener("change",async event=>{
      const key = input.id.replace("galleryFile_","");
      const files = event.target.files;
      event.target.value = "";
      if(!files?.length || uploadBusy) return;
      await uploadGalleryImages(files,row,formNode,key);
    });
  });
}

function bindMediaUploadDelegation(){
  if(!detail) return;
  if(detail.dataset.mediaBound === "1") return;
  detail.dataset.mediaBound = "1";
  detail.addEventListener("click",event=>{
    const formNode = document.getElementById("momentEditorForm");
    const row = rows.find(item=>item.id === activeId);
    if(!formNode || !row) return;
    const addBtn = event.target.closest("[data-gallery-add]");
    if(addBtn){
      document.getElementById(`galleryFile_${addBtn.dataset.galleryAdd}`)?.click();
      return;
    }
    const removeBtn = event.target.closest("[data-gallery-remove]");
    if(!removeBtn) return;
    const panel = removeBtn.closest("[data-gallery-key]");
    const key = panel?.dataset.galleryKey;
    if(!key) return;
    const urls = readGalleryUrls(formNode,key);
    urls.splice(Number(removeBtn.dataset.galleryRemove),1);
    writeGalleryUrls(formNode,key,urls);
    renderGalleryThumbs(formNode,key);
    markEditorDirty(formNode);
    renderPreview(readFormState(formNode));
  });
}

function option(value,label,current){
  return `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`;
}

function renderGalleryUpload(section,key){
  const images = Array.isArray(section.images) ? section.images.filter(Boolean) : [];
  return `<div class="gallery-upload-panel" data-gallery-key="${esc(key)}">
    <div class="gallery-grid" id="galleryGrid_${esc(key)}">
      ${images.map((url,idx)=>`<div class="gallery-thumb"><img src="${esc(url)}" alt="" loading="lazy" decoding="async"><button type="button" class="gallery-remove" data-gallery-remove="${idx}" aria-label="Rimuovi">×</button></div>`).join("")}
      ${images.length < MAX_GALLERY_IMAGES ? `<button type="button" class="gallery-add" data-gallery-add="${esc(key)}"><span>+</span>Carica foto</button>` : ""}
    </div>
    <input type="file" id="galleryFile_${esc(key)}" accept="image/*" multiple hidden>
    <label class="gallery-urls-label">URL aggiuntivi (una per riga, opzionale)
      <textarea name="section_${esc(key)}_images" class="gallery-urls" placeholder="https://...">${esc(formatImageLines(section.images))}</textarea>
    </label>
    <p class="field-hint" id="galleryUploadStatus_${esc(key)}">Carica fino a ${MAX_GALLERY_IMAGES} foto. Attiva la sezione e clicca Salva per vederle nella pagina pubblica.</p>
  </div>`;
}

function sectionEditor(key,section,standalone=false){
  const galleryField = key === "gallery" ? renderGalleryUpload(section,key) : "";
  const scheduleHint = key === "schedule"
    ? `<p class="section-hint">Scrivi una riga per ogni momento (es. «18:00 · Cerimonia»). Verrà mostrato come timeline.</p>` : "";
  const locationFields = key === "location" ? `
    <label>Indirizzo<input name="section_${esc(key)}_address" value="${esc(section.address || "")}" placeholder="Via, città"></label>
    <label>Link mappe<input name="section_${esc(key)}_maps_url" value="${esc(section.maps_url || "")}" placeholder="https://maps.google.com/..."></label>` : "";
  const contactFields = key === "contacts" ? `
    <label>Email<input name="section_${esc(key)}_email" type="email" value="${esc(section.email || "")}" placeholder="nome@email.com"></label>
    <label>Telefono<input name="section_${esc(key)}_phone" value="${esc(section.phone || "")}" placeholder="+39 ..."></label>` : "";
  const enabledToggle = `<label class="section-enabled-toggle"><input type="checkbox" name="section_${esc(key)}_enabled" ${section.enabled ? "checked" : ""}> Sezione visibile nella pagina pubblica</label>`;
  const fields = `
    <label>Titolo<input name="section_${esc(key)}_title" value="${esc(section.title || "")}"></label>
    <label>Contenuto<textarea name="section_${esc(key)}_body">${esc(section.body || "")}</textarea></label>
    ${scheduleHint}
    ${locationFields}
    ${contactFields}
    ${galleryField}`;
  if(standalone) return `${enabledToggle}${fields}`;
  return `<details class="section-box section-box-${esc(key)}" data-section-key="${esc(key)}" ${section.enabled ? "open" : ""}>
    <summary><span class="section-icon">${esc(SECTION_ICONS[key] || "•")}</span><label><input type="checkbox" name="section_${esc(key)}_enabled" ${section.enabled ? "checked" : ""} onclick="event.stopPropagation()"> <span>${esc(SECTION_LABELS[key])}</span></label></summary>
    <div class="section-body">${fields}</div>
  </details>`;
}

function readFormState(formNode){
  const form = new FormData(formNode);
  const sections = {};
  for(const key of Object.keys(DEFAULT_SECTIONS)){
    sections[key] = {
      enabled:form.get(`section_${key}_enabled`) === "on",
      title:String(form.get(`section_${key}_title`) || "").trim(),
      body:String(form.get(`section_${key}_body`) || "").trim(),
      images:key === "gallery" ? parseImageLines(form.get(`section_${key}_images`)) : [],
      address:key === "location" ? String(form.get(`section_${key}_address`) || "").trim() : "",
      maps_url:key === "location" ? String(form.get(`section_${key}_maps_url`) || "").trim() : "",
      email:key === "contacts" ? String(form.get(`section_${key}_email`) || "").trim() : "",
      phone:key === "contacts" ? String(form.get(`section_${key}_phone`) || "").trim() : ""
    };
  }
  return {
    title:String(form.get("title") || "").trim(),
    type:String(form.get("moment_type") || "free"),
    subtitle:String(form.get("subtitle") || "").trim(),
    description:String(form.get("description") || "").trim(),
    cover_url:String(form.get("cover_url") || "").trim(),
    theme:String(form.get("page_theme") || "classic"),
    sectionOrder:[...sectionOrder],
    sections
  };
}

function markEditorDirty(formNode){
  const snapshot = JSON.stringify(readFormState(formNode));
  editorDirty = snapshot !== savedEditorSnapshot;
  updateSaveStatus(!editorDirty);
  const flag = document.getElementById("unsavedFlag");
  if(flag) flag.hidden = !editorDirty;
}

function updateCoverPreview(formNode){
  const url = String(new FormData(formNode).get("cover_url") || "").trim();
  const img = document.getElementById("coverPreview");
  if(!img) return;
  if(/^https?:\/\//i.test(url)){
    img.src = url;
    img.hidden = false;
  }else{
    img.hidden = true;
    img.removeAttribute("src");
  }
}

function renderSectionPreview(key,section){
  const images = Array.isArray(section.images) ? section.images.filter(Boolean) : [];
  const gallery = images.length
    ? `<div class="preview-gallery">${images.slice(0,4).map(url=>`<img src="${esc(url)}" alt="" loading="lazy" decoding="async">`).join("")}${images.length > 4 ? `<span class="preview-gallery-more">+${images.length-4}</span>` : ""}</div>` : "";
  let extra = "";
  if(key === "schedule" && section.body){
    extra = `<div class="preview-timeline">${section.body.split("\n").filter(Boolean).slice(0,4).map(line=>`<div class="preview-timeline-item">${esc(line)}</div>`).join("")}</div>`;
  }
  if(key === "location" && (section.address || section.maps_url)){
    extra += `<div class="preview-meta">${section.address ? `<span>${esc(section.address)}</span>` : ""}${section.maps_url ? `<span class="preview-link">Mappe</span>` : ""}</div>`;
  }
  if(key === "contacts" && (section.email || section.phone)){
    extra += `<div class="preview-meta">${section.email ? `<span>${esc(section.email)}</span>` : ""}${section.phone ? `<span>${esc(section.phone)}</span>` : ""}</div>`;
  }
  const body = key === "schedule" ? "" : `<span>${esc(section.body || "")}</span>`;
  return `<div class="preview-section preview-section-${esc(key)}"><div class="preview-section-head"><span class="preview-section-icon">${esc(SECTION_ICONS[key] || "•")}</span><strong>${esc(section.title || "Sezione")}</strong></div>${body}${extra}${gallery}</div>`;
}

function renderPreview(state){
  const preview = document.getElementById("momentPreview");
  if(!preview) return;
  const theme = state.theme || "classic";
  const enabled = state.sectionOrder
    .map(key=>[key,state.sections[key]])
    .filter(([,section])=>section?.enabled && (section.title || section.body || section.address || section.email || section.phone || (section.images||[]).length));
  const heroStyle = state.cover_url && /^https?:\/\//i.test(state.cover_url)
    ? `style="background-image:linear-gradient(145deg,rgba(27,42,94,.72),rgba(76,175,39,.55)),url('${esc(state.cover_url)}');background-size:cover;background-position:center"`
    : "";
  preview.innerHTML = `
    <div class="preview-label">Anteprima live · ${esc(THEME_LABELS[theme] || theme)}</div>
    <div class="preview-shell theme-${esc(theme)}">
      <div class="preview-hero" ${heroStyle}>
        <small>KhamaKey Moments</small>
        <h3>${esc(state.title || "Titolo pagina")}</h3>
        <p>${esc(state.subtitle || state.description || "Anteprima della pagina pubblica")}</p>
      </div>
      <div class="preview-body">
        ${enabled.length ? enabled.map(([key,section])=>renderSectionPreview(key,section)).join("") : `<div class="preview-section"><strong>Nessuna sezione attiva</strong><span>Attiva almeno una sezione per costruire la pagina.</span></div>`}
      </div>
    </div>`;
}

async function saveMoment(event,row){
  event.preventDefault();
  const formNode = event.currentTarget;
  const editorStatus = document.getElementById("editorStatus");
  const state = readFormState(formNode);
  const pin = String(new FormData(formNode).get("access_pin") || "").trim();
  const publicVisible = new FormData(formNode).get("public_visible") === "true";
  const pinEnabled = new FormData(formNode).get("pin_enabled") === "true";
  if(!state.title) return setStatus(editorStatus,"Inserisci il titolo della pagina.","error");
  setStatus(editorStatus,"Salvataggio...");
  let pinHash = null;
  if(pin){
    try{ pinHash = await momentPinHash(row.slug,validatePin(pin)); }
    catch(error){ return setStatus(editorStatus,error.message,"error"); }
    rememberPin(row.id,pin);
  }
  const { error } = adminMode
    ? await supabase.rpc("admin_save_moment_page",{
        p_event_id:row.id,
        p_title:state.title,
        p_moment_type:state.type,
        p_description:state.description,
        p_page_state:state,
        p_public_visible:publicVisible,
        p_pin_enabled:pinEnabled,
        p_pin_hash:pinHash
      })
    : await supabase.rpc("save_my_moment_page",{
        p_event_id:row.id,
        p_title:state.title,
        p_moment_type:state.type,
        p_description:state.description,
        p_page_state:state,
        p_public_visible:publicVisible,
        p_pin_enabled:pinEnabled,
        p_pin_hash:pinHash
      });
  if(error){
    console.error(error);
    return setStatus(editorStatus,error.message || "Salvataggio non riuscito.","error");
  }
  savedEditorSnapshot = JSON.stringify(state);
  editorDirty = false;
  updateSaveStatus(true);
  localStorage.setItem(onboardingKey(row.id),"done");
  setStatus(editorStatus,"Pagina salvata.","ok");
  await loadObjects();
}

supabase = createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
bindPasswordToggles();
bindCodeInputs();
bindMediaUploadDelegation();
applyUrlParams();

document.querySelectorAll("[data-auth-tab]").forEach(button=>button.addEventListener("click",()=>showAuthTab(button.dataset.authTab)));

document.getElementById("momentsForgot")?.addEventListener("click",showForgotForm);
document.getElementById("momentsForgotBack")?.addEventListener("click",()=>showAuthTab("login"));

forgotForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  const email = document.getElementById("momentsForgotEmail").value.trim().toLowerCase();
  if(!email) return setStatus(statusNode,"Inserisci l’email.","error");
  setStatus(statusNode,"Invio link di recupero...");
  const { error } = await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl()});
  setStatus(statusNode,error ? (error.message || "Recupero non riuscito.") : "Controlla la email: ti abbiamo inviato il link per la nuova password.", error ? "error" : "ok");
});

recoveryForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  setStatus(statusNode,"Aggiornamento password...");
  const { error } = await supabase.auth.updateUser({password:document.getElementById("momentsRecoveryPassword").value});
  if(error) return setStatus(statusNode,error.message || "Aggiornamento non riuscito.","error");
  recoveryMode = false;
  showAuthTab("login");
  setStatus(statusNode,"Password aggiornata. Ora puoi accedere.","ok");
});

loginForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  setStatus(statusNode,"Accesso in corso...");
  try{
    const { data,error } = await supabase.auth.signInWithPassword({
      email:document.getElementById("momentsEmail").value.trim().toLowerCase(),
      password:document.getElementById("momentsPassword").value
    });
    if(error) return setStatus(statusNode,error.message || "Accesso non riuscito.","error");
    const user = data.session?.user || data.user;
    if(!user) return setStatus(statusNode,"Sessione non disponibile. Riprova.","error");
    await showApp(user);
    setStatus(statusNode,"");
  }catch(error){
    console.error(error);
    setStatus(statusNode,error.message || "Errore imprevisto durante l'accesso.","error");
  }
});

document.getElementById("signupNextStep")?.addEventListener("click",()=>{
  const code = normalizeCode(document.getElementById("momentsSignupCode").value);
  if(!/^[A-Z0-9]{8,32}$/.test(code)) return setStatus(statusNode,"Inserisci un codice prodotto valido (8-32 caratteri).","error");
  setStatus(statusNode,"");
  setSignupStep(2);
});

document.getElementById("signupPrevStep")?.addEventListener("click",()=>setSignupStep(1));

signupForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  const email = document.getElementById("momentsSignupEmail").value.trim().toLowerCase();
  const code = normalizeCode(document.getElementById("momentsSignupCode").value);
  const title = document.getElementById("momentsSignupTitle").value.trim();
  const momentType = document.getElementById("momentsSignupType").value;
  const pin = document.getElementById("momentsSignupPin").value.trim();
  if(!/^[A-Z0-9]{8,32}$/.test(code)) return setStatus(statusNode,"Codice prodotto non valido.","error");
  if(!title) return setStatus(statusNode,"Inserisci il nome della pagina.","error");
  try{ validatePin(pin); }catch(error){ return setStatus(statusNode,error.message,"error"); }
  setStatus(statusNode,"Creazione account...");
  const { data,error } = await supabase.auth.signUp({
    email,
    password:document.getElementById("momentsSignupPassword").value,
    options:{data:{full_name:document.getElementById("momentsSignupName").value.trim(),product_area:"moments",pending_moment_code:code}}
  });
  if(error) return setStatus(statusNode,error.message || "Registrazione non riuscita.","error");
  if(data.session?.user){
    try{
      const item = await activateCode({code,title,momentType,pin});
      activeId = item.event_id || "";
      rememberPin(activeId,pin);
      setStatus(statusNode,"Account creato e prodotto collegato.","ok");
    }catch(activationError){
      console.error(activationError);
      setStatus(statusNode,activationError.message || "Account creato, ma codice non collegato. Usa il modulo attivazione.","error");
    }
    await showApp(data.session.user);
    if(activeId) showPinSuccessBanner(activeId,pin,title);
  }else{
    setStatus(statusNode,"Account creato. Conferma l’email, poi accedi e attiva lo stesso codice prodotto.","ok");
  }
});

document.getElementById("momentsLogout").addEventListener("click",async()=>{
  await supabase.auth.signOut();
  activeId = "";
  rows = [];
  showAuthTab("login");
  showAuth("Sessione chiusa.");
});

window.addEventListener("beforeunload",event=>{
  if(editorDirty) event.preventDefault();
});

const { data } = await supabase.auth.getSession();
if(data.session?.user) await showApp(data.session.user);
else showAuthTab("login");

supabase.auth.onAuthStateChange(async(event,session)=>{
  if(event === "PASSWORD_RECOVERY"){
    showRecoveryForm();
    return;
  }
  if(event === "INITIAL_SESSION") return;
  if(event === "SIGNED_IN" && session?.user){
    await showApp(session.user);
    return;
  }
  if(session?.user) return;
  if(recoveryMode) return;
  if(event !== "SIGNED_OUT") return;
  currentUser = null;
  activeId = "";
  rows = [];
  showAuth();
  showAuthTab("login");
});
