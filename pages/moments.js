import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";
import {
  uploadImage,
  uploadAudio,
  validateImageFile,
  deleteStorageObject,
  isCloudflareMediaUrl,
  inferMediaKind,
  MAX_GALLERY_IMAGES
} from "./media-upload.js";
import {
  readGalleryMedia,
  writeGalleryMedia,
  renderGalleryGrid,
  uploadGalleryMedia,
  renderGalleryUploadPanel,
  renderGalleryFileInput,
  renderCoverFramer,
  renderMusicAudioPanel,
  bindCoverFramer,
  syncCoverFramer,
  bindGalleryMediaInteractions,
  ensureMediaModals,
  coverFocusStyle,
  normalizeMediaList,
  renderSectionPhotoPanel
} from "./moments-media-ui.js";
import {
  readJourneySteps,
  writeJourneySteps,
  renderJourneySteps,
  renderJourneyPanel,
  renderJourneyFileInput,
  bindJourneyEditor,
  uploadJourneyStepPhoto
} from "./moments-journey-ui.js";
import {
  renderLetterMediaPanel,
  renderLetterFileInput,
  uploadLetterMedia,
  syncLetterMediaPanel,
  readLetterMedia,
  writeLetterMedia
} from "./moments-letter-ui.js";
import { journeyStepId, MAX_JOURNEY_STEPS, normalizeJourneyStep, resolveJourneySteps, compactJourneySteps } from "./moment-journey.js";
import {
  COLOR_PALETTES,
  PALETTE_LABELS,
  VARIANT_LABELS,
  HERO_STYLES,
  FONT_PAIRS,
  PAGE_LOOKS,
  normalizeDesignState,
  legacyThemeToPalette,
  resolvePalette,
  resolveFontPair,
  findLookForDesign,
  suggestLookForMomentType,
  looksForMomentType,
  decorPresetForType,
  decorPresetsForMomentType,
  PAGE_DECOR_PRESETS
} from "./moment-themes.js";
import {
  SECTION_ORDER_DEFAULT,
  DEFAULT_SECTIONS,
  SECTION_LABELS,
  SECTION_SUBTITLES,
  SECTION_ICONS,
  NAV_GROUPS,
  designNavItems,
  accountNavItems,
  normalizeSectionOrder,
  migrateSections,
  readSectionFromForm,
  parseImageLines,
  formatImageLines,
  sectionFieldHints
} from "./moment-sections.js";
import {
  TYPE_LABELS,
  renderCategorySelect,
  templateForType,
  normalizeMomentType
} from "./moment-categories.js";
import {
  navSectionsForEditor,
  kitSectionKeys,
  editorKitForType,
  hiddenOptionalSections,
  sectionLabelForType,
  sectionSubtitleForType,
  sectionNavLabelForType,
  showCounterForType,
  counterLabelForType,
  contentNavItems,
  sectionOrderForType,
  sectionFillGuideForType,
  primarySectionsForType
} from "./moment-editor-kit.js";
import { renderRsvpSharePanel, bindRsvpSharePanel } from "./moment-rsvp-kit.js";
import { bindRsvpResponsesPanel } from "./moment-rsvp-responses.js";
import { renderGuestbookModerationShell, bindGuestbookModerationPanel } from "./moment-guestbook-kit.js";
import { renderMomentDashboardShell, bindMomentDashboard } from "./moment-editor-dashboard.js";
import { renderRsvpFieldsEditor, readRsvpFieldsFromForm, bindRsvpFieldsEditor, normalizeRsvpSection, rsvpGuestPreviewLines } from "./moment-rsvp-fields.js";

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

const EDITOR_PANELS = {
  overview:{title:"Riepilogo",subtitle:"Stato pagina, link e statistiche RSVP / libro ospiti"},
  objects:{title:"Le tue pagine",subtitle:"Scegli quale pagina modificare"},
  cover:{title:"Copertina",subtitle:"Titolo, foto e messaggio — la prima cosa che si vede"},
  styling:{title:"Colori",subtitle:"Scegli lo stile — colori classici, molto contrasto"},
  counter:{title:"Contatore",subtitle:"Quanto tempo è passato da una data speciale?"},
  order:{title:"Ordine",subtitle:"Trascina per cambiare l'ordine delle sezioni"},
  privacy:{title:"Pubblica",subtitle:"Rendi visibile la pagina e proteggila con PIN"}
};

let activeEditorPanel = "cover";
let mobilePreviewMode = false;
let activeNavGroup = "content";
let currentMomentType = "free";
let pinnedExtraSections = [];

let supabase;
let rows = [];
let activeId = "";
let currentUser = null;
let sectionOrder = [...SECTION_ORDER_DEFAULT];
let recoveryMode = false;
let signupStep = 1;
let editorDirty = false;
let savedEditorSnapshot = "";
const SECTION_PHOTO_FIELDS = {
  countdown:{ field:"image_url", previewId:"countdownPhotoPreview", fileId:"countdownPhotoFile", label:"Carica foto" },
  pet:{ field:"pet_photo", previewId:"petPhotoPreview", fileId:"petPhotoFile", label:"Carica foto" }
};
const PROFILE_PHOTO_FIELD = { previewId:"profilePhotoPreview", fileId:"profilePhotoFile", label:"Carica foto profilo" };
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
      <p>Serve per aprire la pagina collegata al tag NFC. Non possiamo mostrarlo di nuovo su altri dispositivi.</p>
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

function rsvpGuestPreviewFromForm(formNode, pageTitle = ""){
  const form = new FormData(formNode);
  const extra = readRsvpFieldsFromForm(form);
  return rsvpGuestPreviewLines({
    event_name:String(form.get("section_rsvp_event_name") || pageTitle || "").trim(),
    field_keys:extra.field_keys,
    custom_fields:extra.custom_fields,
    ask_guests:extra.ask_guests,
    ask_notes:extra.ask_notes
  });
}

async function sharePageUrl(url, title = "KhamaKey Moments"){
  if(!url) return;
  if(navigator.share){
    try{
      await navigator.share({ title, url });
      return;
    }catch(error){
      if(error?.name === "AbortError") return;
    }
  }
  await copyText(url);
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
  const sections = migrateSections(state.sections || {});
  if(sections.gallery){
    sections.gallery.media = normalizeMediaList(sections.gallery);
    sections.gallery.images = sections.gallery.media.filter(item=>item.type === "image").map(item=>item.url);
  }
  return {
    title:row.title || state.title || "",
    type:normalizeMomentType(row.moment_type || row.event_type || state.type),
    subtitle:state.subtitle || "",
    description:row.description || state.description || "",
    cover_url:state.cover_url || "",
    cover_focus_x:state.cover_focus_x ?? 50,
    cover_focus_y:state.cover_focus_y ?? 50,
    cover_zoom:state.cover_zoom ?? 100,
    profile_photo:state.profile_photo || "",
    pill:state.pill || "",
    theme:state.theme || "classic",
    colorPalette:state.colorPalette || legacyThemeToPalette(state.theme || "classic"),
    themeVariant:state.themeVariant || "chiaro",
    heroStyle:state.heroStyle || "classico",
    fontPair:Object.keys(FONT_PAIRS).includes(state.fontPair) ? state.fontPair : "classic",
    pageDecor:PAGE_DECOR_PRESETS[state.pageDecor] ? state.pageDecor : "none",
    show_together_counter:Boolean(state.show_together_counter),
    together_since:state.together_since || "",
    counter_label:state.counter_label || "",
    show_counter_hms:Boolean(state.show_counter_hms),
    sectionOrder:normalizeSectionOrder(state.sectionOrder),
    pinned_sections:Array.isArray(state.pinned_sections) ? state.pinned_sections.filter(Boolean) : [],
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
      if(mobilePreviewMode){
        const form = document.getElementById("momentEditorForm");
        if(form) schedulePreviewUpdate(form,{immediate:true,force:true});
      }
    });
  }
}

function navItemsForGroup(groupId, formNode){
  if(groupId === "design") return designNavItems();
  if(groupId === "account") return accountNavItems();
  const enabled = enabledMapFromForm(formNode);
  return contentNavItems(sectionOrder, currentMomentType, pinnedExtraSections, enabled);
}

function enabledMapFromForm(formNode){
  const map = {};
  if(!formNode) return map;
  for(const key of Object.keys(DEFAULT_SECTIONS)){
    map[key] = isSectionEnabledInForm(formNode, key);
  }
  return map;
}

function syncPinnedSectionsInput(formNode){
  const input = formNode?.querySelector("#pinnedSectionsInput");
  if(input) input.value = pinnedExtraSections.join(",");
}

function activateExtraSection(key, formNode){
  if(!key) return;
  const type = currentTypeFromForm(formNode);
  const kit = editorKitForType(type);
  const enabledInput = formNode?.querySelector(`[name="section_${key}_enabled"]`);
  if(enabledInput && !enabledInput.checked){
    enabledInput.checked = true;
    syncSectionToggleButtons(formNode, key);
  }
  if(kit.optional.includes(key) && !pinnedExtraSections.includes(key)){
    pinnedExtraSections = [...pinnedExtraSections, key];
    syncPinnedSectionsInput(formNode);
  }
  syncEditorKitUi(formNode);
  setEditorPanel(`section-${key}`);
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{immediate:true});
}

function currentTypeFromForm(formNode){
  return normalizeMomentType(formNode?.elements?.moment_type?.value || currentMomentType || "free");
}

function sectionEditorNavLabel(formNode, type, key){
  const custom = String(formNode?.querySelector(`[name="section_${key}_title"]`)?.value || "").trim();
  if(custom) return custom.length > 22 ? `${custom.slice(0, 20)}…` : custom;
  return sectionNavLabelForType(type, key);
}

function syncEditorKitUi(formNode){
  const type = currentTypeFromForm(formNode);
  currentMomentType = type;
  const enabled = enabledMapFromForm(formNode);
  const navKeys = new Set(navSectionsForEditor(type, sectionOrder, pinnedExtraSections, enabled));
  const panelKeys = new Set(kitSectionKeys(type));
  const showCounter = showCounterForType(type);

  document.querySelectorAll(".editor-sidebar .editor-nav-item[data-editor-panel]").forEach(button=>{
    const panelId = button.dataset.editorPanel;
    if(panelId === "counter"){
      button.hidden = !showCounter;
      if(showCounter){
        button.innerHTML = `<span class="editor-nav-icon">⏱</span>${esc(counterLabelForType(type))}`;
      }
      return;
    }
    if(panelId === "extras"){
      button.hidden = !hiddenOptionalSections(type, pinnedExtraSections, enabled).length;
      return;
    }
    if(!panelId?.startsWith("section-")) return;
    const key = panelId.slice(8);
    const visible = navKeys.has(key);
    button.hidden = !visible;
    if(visible){
      button.innerHTML = `<span class="editor-nav-icon">${esc(SECTION_ICONS[key] || "•")}</span>${esc(sectionEditorNavLabel(formNode, type, key))}`;
    }
  });

  document.querySelectorAll("#momentEditorForm [data-editor-panel]").forEach(panel=>{
    const panelId = panel.dataset.editorPanel;
    if(panelId === "counter"){
      panel.hidden = !showCounter;
      return;
    }
    if(panelId === "extras") return;
    if(!panelId?.startsWith("section-")) return;
    const key = panelId.slice(8);
    panel.hidden = !panelKeys.has(key);
    if(panelKeys.has(key)){
      const title = panel.querySelector(".section-title");
      const sub = panel.querySelector(".section-sub");
      const custom = String(formNode?.querySelector(`[name="section_${key}_title"]`)?.value || "").trim();
      if(title) title.textContent = custom || sectionLabelForType(type, key);
      if(sub) sub.textContent = sectionSubtitleForType(type, key);
    }
  });

  if(!showCounter && activeEditorPanel === "counter"){
    setEditorPanel(`section-${[...navKeys][0] || "intro"}`);
  }else if(activeEditorPanel.startsWith("section-")){
    const activeKey = activeEditorPanel.slice(8);
    if(!navKeys.has(activeKey) && activeEditorPanel !== "extras"){
      setEditorPanel(hiddenOptionalSections(type, pinnedExtraSections, enabled).length ? "extras" : `section-${[...navKeys][0] || "intro"}`);
    }
  }

  if(activeNavGroup === "content") renderSubNav("content", formNode);
  const orderList = document.getElementById("sectionOrderList");
  if(orderList && formNode) refreshSectionOrderList(formNode);
  syncPinnedSectionsInput(formNode);
}

function ensureMobileNav(){
  const grpNav = document.getElementById("momentsGrpNav");
  const subNav = document.getElementById("momentsSubNav");
  if(!grpNav || !subNav) return;
  if(grpNav.dataset.ready !== "1"){
    grpNav.dataset.ready = "1";
    NAV_GROUPS.forEach(group=>{
      const button = document.createElement("button");
      button.type = "button";
      button.className = `grp-btn ${group.id === activeNavGroup ? "active" : ""}`;
      button.dataset.navGroup = group.id;
      button.innerHTML = `<span class="grp-icon">${group.icon}</span>${group.label}`;
      button.addEventListener("click",()=>setNavGroup(group.id));
      grpNav.appendChild(button);
    });
  }
  renderSubNav(activeNavGroup);
}

function setNavGroup(groupId){
  activeNavGroup = groupId;
  document.querySelectorAll("#momentsGrpNav .grp-btn").forEach(button=>{
    button.classList.toggle("active",button.dataset.navGroup === groupId);
  });
  if(groupId === "account" && !["overview","objects","privacy"].includes(activeEditorPanel)){
    setEditorPanel("overview");
  }
  renderSubNav(groupId);
  syncEditorProgress();
}

function renderSubNav(groupId, formNode){
  const subNav = document.getElementById("momentsSubNav");
  if(!subNav) return;
  const form = formNode || document.getElementById("momentEditorForm");
  const items = navItemsForGroup(groupId, form);
  subNav.innerHTML = items.map(item=>`<button type="button" class="snav-btn ${activeEditorPanel === item.id ? "active" : ""}" data-editor-panel="${esc(item.id)}"><span class="snav-icon">${item.icon}</span>${esc(item.label)}</button>`).join("");
  subNav.classList.add("open");
  subNav.querySelectorAll(".snav-btn").forEach(button=>{
    button.addEventListener("click",()=>{
      setEditorPanel(button.dataset.editorPanel);
      const shell = document.getElementById("momentEditorShell");
      if(shell && mobilePreviewMode){
        mobilePreviewMode = false;
        shell.classList.remove("show-preview");
        const fab = document.getElementById("momentsPreviewFab");
        if(fab) fab.textContent = "Anteprima";
      }
      window.scrollTo({top:0,behavior:"smooth"});
    });
  });
}

function syncMobileNav(panelId){
  const groupForPanel = panelId === "counter" || panelId.startsWith("section-") ? "content"
    : ["cover","styling","order"].includes(panelId) ? "design"
    : ["overview","objects","privacy"].includes(panelId) ? "account"
    : activeNavGroup;
  if(groupForPanel !== activeNavGroup){
    activeNavGroup = groupForPanel;
    document.querySelectorAll("#momentsGrpNav .grp-btn").forEach(button=>{
      button.classList.toggle("active",button.dataset.navGroup === groupForPanel);
    });
  }
  renderSubNav(activeNavGroup);
  document.querySelectorAll("#momentsSubNav .snav-btn").forEach(button=>{
    button.classList.toggle("active",button.dataset.editorPanel === panelId);
  });
}

function bindPageMenuActions(publicUrl, pageTitle){
  const openPage = document.getElementById("momentsMenuOpenPage");
  const sharePage = document.getElementById("momentsMenuSharePage");
  const copyLink = document.getElementById("momentsMenuCopyLink");
  if(openPage){
    openPage.hidden = !publicUrl;
    openPage.onclick = ()=>publicUrl && window.open(publicUrl,"_blank","noopener");
  }
  if(sharePage){
    sharePage.hidden = !publicUrl;
    sharePage.onclick = ()=>publicUrl && sharePageUrl(publicUrl, pageTitle || "KhamaKey Moments");
  }
  if(copyLink){
    copyLink.hidden = !publicUrl;
    copyLink.onclick = ()=>publicUrl && copyText(publicUrl,copyLink);
  }
}

function bindEditorPageActions(publicUrl, pageTitle){
  document.getElementById("editorOpenPageBtn")?.addEventListener("click",()=>{
    if(publicUrl) window.open(publicUrl,"_blank","noopener");
  });
  document.getElementById("editorSharePageBtn")?.addEventListener("click",()=>{
    if(publicUrl) sharePageUrl(publicUrl, pageTitle || "KhamaKey Moments");
  });
  document.getElementById("editorCopyLinkBtn")?.addEventListener("click",()=>{
    if(publicUrl) copyText(publicUrl, document.getElementById("editorCopyLinkBtn"));
  });
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
    <label>Tipo di pagina
      <select name="moment_type">
        ${renderCategorySelect("free")}
      </select>
    </label>
    <button type="submit" class="primary">Attiva oggetto</button>
  </form>
  <p class="status" id="${statusId}"></p>`;
}

function renderOverviewPanel(row, state, publicUrl){
  return `<div class="editor-panel ${activeEditorPanel === "overview" ? "active" : ""}" data-editor-panel="overview">
    ${renderSectionHeader(EDITOR_PANELS.overview.title,EDITOR_PANELS.overview.subtitle)}
    ${renderMomentDashboardShell({ publicUrl, published:row.public_visible, slug:row.slug })}
  </div>`;
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

function addJourneyStep(formNode){
  enableSection(formNode,"timeline");
  const steps = readJourneySteps(formNode,"timeline");
  if(steps.length >= MAX_JOURNEY_STEPS) return;
  steps.push(normalizeJourneyStep({ id:journeyStepId() }));
  writeJourneySteps(formNode,"timeline",steps);
  renderJourneySteps(formNode,"timeline");
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{ immediate:true, force:true });
}

function clearJourneyStepPhoto(formNode,stepId){
  const steps = readJourneySteps(formNode,"timeline");
  const index = steps.findIndex(step=>step.id === stepId);
  if(index < 0) return;
  const oldUrl = steps[index].image_url;
  steps[index].image_url = "";
  writeJourneySteps(formNode,"timeline",steps);
  renderJourneySteps(formNode,"timeline");
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{ immediate:true, force:true });
  if(oldUrl && isCloudflareMediaUrl(oldUrl)){
    deleteStorageObject(supabase,oldUrl).catch(()=>{});
  }
}

function removeJourneyStep(formNode,stepId){
  const steps = readJourneySteps(formNode,"timeline");
  const index = steps.findIndex(step=>step.id === stepId);
  if(index < 0) return;
  const removed = steps[index];
  steps.splice(index,1);
  writeJourneySteps(formNode,"timeline",steps);
  renderJourneySteps(formNode,"timeline");
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{ immediate:true, force:true });
  if(removed?.image_url && isCloudflareMediaUrl(removed.image_url)){
    deleteStorageObject(supabase,removed.image_url).catch(()=>{});
  }
}

function enableSection(formNode,key){
  const enabled = formNode.querySelector(`[name="section_${key}_enabled"]`);
  if(enabled && !enabled.checked){
    enabled.checked = true;
    enabled.dispatchEvent(new Event("change",{bubbles:true}));
  }
}

function isSectionEnabledInForm(formNode,key){
  return Boolean(formNode?.querySelector(`[name="section_${key}_enabled"]`)?.checked);
}

function enabledSectionKeysFromState(state){
  const type = state?.type || currentMomentType;
  const pinned = state?.pinned_sections || pinnedExtraSections;
  const enabled = Object.fromEntries(Object.entries(state?.sections || {}).map(([k,v])=>[k, Boolean(v?.enabled)]));
  return navSectionsForEditor(type, sectionOrder, pinned, enabled).filter(key=>enabled[key]);
}

function enabledSectionKeysFromForm(formNode){
  const type = currentTypeFromForm(formNode);
  const enabled = enabledMapFromForm(formNode);
  return navSectionsForEditor(type, sectionOrder, pinnedExtraSections, enabled)
    .filter(key=>isSectionEnabledInForm(formNode, key));
}

function applyEnabledSectionOrder(newEnabledOrder,formNode){
  let index = 0;
  sectionOrder = sectionOrder.map(key=>(
    isSectionEnabledInForm(formNode,key) ? newEnabledOrder[index++] : key
  ));
}

function renderSectionEnabledInput(key,enabled){
  return `<input type="checkbox" class="section-enabled-input" name="section_${esc(key)}_enabled" ${enabled ? "checked" : ""} hidden>`;
}

function renderSectionToggleButton(key,enabled){
  return "";
}

function renderSectionPanelToggle(key,enabled){
  const icon = SECTION_ICONS[key] || "•";
  return `<div class="section-switch ${enabled ? "is-on" : ""}" data-section-toggle="${esc(key)}" role="switch" aria-checked="${enabled ? "true" : "false"}" tabindex="0">
    ${renderSectionEnabledInput(key,enabled)}
    <span class="section-switch-label">
      <span class="section-switch-icon">${icon}</span>
      <span class="section-switch-copy">
        <strong>${enabled ? "Visibile in pagina" : "Non visibile"}</strong>
        <small>${enabled ? "I visitatori la vedono" : "Tocca per mostrarla"}</small>
      </span>
    </span>
    <span class="section-switch-track" aria-hidden="true"><i></i></span>
  </div>`;
}

function syncSectionToggleButtons(formNode,key){
  const input = formNode.querySelector(`[name="section_${key}_enabled"]`);
  if(!input) return;
  const enabled = input.checked;
  formNode.querySelectorAll(`[data-section-toggle="${key}"]`).forEach(node=>{
    node.classList.toggle("is-on",enabled);
    node.setAttribute("aria-checked",enabled ? "true" : "false");
    const strong = node.querySelector(".section-switch-copy strong");
    const small = node.querySelector(".section-switch-copy small");
    if(strong) strong.textContent = enabled ? "Visibile in pagina" : "Non visibile";
    if(small) small.textContent = enabled ? "I visitatori la vedono" : "Tocca per mostrarla";
  });
  const stack = formNode.querySelector(`[data-section-stack="${key}"]`);
  if(stack) stack.classList.toggle("is-muted",!enabled);
}

function refreshSectionOrderList(formNode){
  const listNode = document.getElementById("sectionOrderList");
  if(!listNode) return;
  const keys = enabledSectionKeysFromForm(formNode);
  if(!keys.length){
    listNode.innerHTML = `<p class="section-order-empty">Nessuna sezione attiva. Attiva almeno una sezione dal menu <strong>Contenuti</strong>.</p>`;
    return;
  }
  listNode.innerHTML = keys.map((key,idx)=>renderSectionOrderItem(key,idx, currentTypeFromForm(formNode))).join("");
}

function bindSectionToggleButtons(formNode){
  if(formNode.dataset.toggleBound === "1") return;
  formNode.dataset.toggleBound = "1";
  formNode.addEventListener("click",event=>{
    const toggle = event.target.closest("[data-section-toggle]");
    if(!toggle || !formNode.contains(toggle)) return;
    const key = toggle.dataset.sectionToggle;
    const input = formNode.querySelector(`[name="section_${key}_enabled"]`);
    if(!input) return;
    input.checked = !input.checked;
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  formNode.addEventListener("keydown",event=>{
    if(event.key !== "Enter" && event.key !== " ") return;
    const toggle = event.target.closest("[data-section-toggle]");
    if(!toggle || !formNode.contains(toggle)) return;
    event.preventDefault();
    toggle.click();
  });
}

function syncAllSectionToggleButtons(formNode){
  sectionOrder.forEach(key=>syncSectionToggleButtons(formNode,key));
}

function bumpSectionInOrder(key){
  if(!sectionOrder.includes(key)) sectionOrder = [...sectionOrder, key];
  else sectionOrder = [...sectionOrder.filter(item=>item !== key), key];
}

function bindSectionEnableHandlers(formNode){
  formNode.querySelectorAll('[name^="section_"][name$="_enabled"]').forEach(checkbox=>{
    if(checkbox.dataset.boundEnable === "1") return;
    checkbox.dataset.boundEnable = "1";
    checkbox.addEventListener("change",()=>{
      const match = checkbox.name.match(/^section_(.+)_enabled$/);
      const key = match?.[1];
      if(!key) return;
      syncSectionToggleButtons(formNode,key);
      refreshSectionOrderList(formNode);
      if(checkbox.checked){
        bumpSectionInOrder(key);
        const titleInput = formNode.querySelector(`[name="section_${key}_title"]`);
        if(titleInput && !titleInput.value.trim()){
          titleInput.value = DEFAULT_SECTIONS[key]?.title || SECTION_LABELS[key] || "";
        }
        setEditorPanel(`section-${key}`);
        syncMobileNav(activeEditorPanel);
      }
      schedulePreviewUpdate(formNode,{immediate:true,force:true});
      syncEditorKitUi(formNode);
    });
  });
}

function applyTemplateToForm(formNode,type){
  const template = templateForType(type);
  if(template.subtitle) formNode.elements.subtitle.value = template.subtitle;
  if(template.pill && formNode.elements.pill) formNode.elements.pill.value = template.pill;
  for(const [key,section] of Object.entries(template.sections)){
    const enabled = formNode.querySelector(`[name="section_${key}_enabled"]`);
    const title = formNode.querySelector(`[name="section_${key}_title"]`);
    const body = formNode.querySelector(`[name="section_${key}_body"]`);
    const images = formNode.querySelector(`[name="section_${key}_images"]`);
    const panel = formNode.querySelector(`details[data-section-key="${key}"]`);
    if(enabled) enabled.checked = Boolean(section.enabled);
    if(title) title.value = section.title || "";
    if(body) body.value = section.body || "";
    if(images) images.value = formatImageLines(section.images);
    if(key === "rsvp"){
      const askGuests = formNode.querySelector('[name="section_rsvp_field_guests"]');
      const askNotes = formNode.querySelector('[name="section_rsvp_field_notes"]');
      if(askGuests) askGuests.checked = section.field_keys ? section.field_keys.includes("guests") : section.ask_guests !== false;
      if(askNotes) askNotes.checked = section.field_keys ? section.field_keys.includes("notes") : section.ask_notes !== false;
    }
    ["recipient","signature","event_label","target_date","spotify_url","author","sign_name","sign_subtitle","whatsapp_number","event_name"].forEach(field=>{
      const input = formNode.querySelector(`[name="section_${key}_${field}"]`);
      if(input) input.value = section[field] || "";
    });
    if(panel) panel.open = Boolean(section.enabled);
  }
  markEditorDirty(formNode);
  syncAllSectionToggleButtons(formNode);
  sectionOrder = sectionOrderForType(type);
  refreshSectionOrderList(formNode);
  if(formNode.elements.moment_type){
    formNode.elements.moment_type.value = normalizeMomentType(type);
  }
  currentMomentType = normalizeMomentType(type);
  pinnedExtraSections = [];
  syncPinnedSectionsInput(formNode);
  syncEditorKitUi(formNode);
  const mergedSteps = resolveJourneySteps(template.sections.timeline || {}, template.sections.places || {});
  writeJourneySteps(formNode,"timeline",mergedSteps);
  renderJourneySteps(formNode,"timeline");
  const timelineEnabled = formNode.querySelector('[name="section_timeline_enabled"]');
  if(timelineEnabled && (template.sections.timeline?.enabled || template.sections.places?.enabled)){
    timelineEnabled.checked = true;
  }
  const placesEnabled = formNode.querySelector('[name="section_places_enabled"]');
  if(placesEnabled) placesEnabled.checked = false;
  syncAllSectionToggleButtons(formNode);
  const suggestedLook = suggestLookForMomentType(normalizeMomentType(type));
  if(suggestedLook && PAGE_LOOKS[suggestedLook]) applyPageLook(formNode, suggestedLook, { preview:false });
  const suggestedDecor = decorPresetForType(normalizeMomentType(type));
  const decorInput = formNode.querySelector('[name="page_decor"]');
  if(decorInput) decorInput.value = suggestedDecor;
  syncDecorCards(formNode, decorInput?.value || "none");
  schedulePreviewUpdate(formNode,{immediate:true,force:true});
  promptSaveReminder("Template applicato. Clicca Salva verde in alto a destra per pubblicare le modifiche.");
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

function renderEditorSidebar(activePanel, momentType = currentMomentType, pinned = pinnedExtraSections, enabled = {}){
  const navKeys = navSectionsForEditor(momentType, sectionOrder, pinned, enabled);
  const showExtras = hiddenOptionalSections(momentType, pinned, enabled).length > 0;
  const counterBtn = showCounterForType(momentType) ? `
    <button type="button" class="editor-nav-item ${activePanel === "counter" ? "active" : ""}" data-editor-panel="counter">
      <span class="editor-nav-icon">⏱</span>${esc(counterLabelForType(momentType))}
    </button>` : "";
  const extrasBtn = showExtras ? `
    <button type="button" class="editor-nav-item ${activePanel === "extras" ? "active" : ""}" data-editor-panel="extras">
      <span class="editor-nav-icon">➕</span>Altre sezioni
    </button>` : "";
  const contentItems = `${counterBtn}
    ${navKeys.map(key=>`
    <button type="button" class="editor-nav-item ${activePanel === `section-${key}` ? "active" : ""}" data-editor-panel="section-${esc(key)}" data-section-nav-key="${esc(key)}">
      <span class="editor-nav-icon">${esc(SECTION_ICONS[key] || "•")}</span>${esc(sectionLabelForType(momentType, key))}
    </button>`).join("")}${extrasBtn}`;
  return `<nav class="editor-sidebar" aria-label="Sezioni editor">
    <div class="editor-sidebar-group">Account</div>
    <button type="button" class="editor-nav-item ${activePanel === "overview" ? "active" : ""}" data-editor-panel="overview">
      <span class="editor-nav-icon">📊</span>Riepilogo
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "objects" ? "active" : ""}" data-editor-panel="objects">
      <span class="editor-nav-icon">◉</span>Pagine
    </button>
    <div class="editor-sidebar-group">Design</div>
    <button type="button" class="editor-nav-item ${activePanel === "cover" ? "active" : ""}" data-editor-panel="cover">
      <span class="editor-nav-icon">✦</span>Copertina
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "styling" ? "active" : ""}" data-editor-panel="styling">
      <span class="editor-nav-icon">◑</span>Colori
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "order" ? "active" : ""}" data-editor-panel="order">
      <span class="editor-nav-icon">☰</span>Ordine sezioni
    </button>
    <div class="editor-sidebar-group">Contenuti</div>
    ${contentItems}
    <div class="editor-sidebar-group">Impostazioni</div>
    <button type="button" class="editor-nav-item ${activePanel === "privacy" ? "active" : ""}" data-editor-panel="privacy">
      <span class="editor-nav-icon">🔒</span>Pubblica
    </button>
  </nav>`;
}

function renderSectionHeader(title,subtitle){
  return `<div class="section-header"><div class="section-title">${esc(title)}</div><div class="section-sub">${esc(subtitle)}</div></div>`;
}

function readDesignFields(formNode){
  return {
    colorPalette: formNode.querySelector("#colorPaletteInput")?.value || "classic",
    themeVariant: formNode.querySelector('[name="theme_variant"]')?.value || "chiaro",
    fontPair: formNode.querySelector('[name="font_pair"]')?.value || "classic",
    heroStyle: formNode.querySelector('[name="hero_style"]')?.value || "classico"
  };
}

function syncLookCards(formNode, lookId = ""){
  const stylingPanel = formNode.querySelector('[data-editor-panel="styling"]');
  if(!stylingPanel) return;
  const activeLook = lookId || findLookForDesign(readDesignFields(formNode));
  stylingPanel.querySelectorAll(".look-card").forEach(card=>{
    card.classList.toggle("active", card.dataset.look === activeLook);
  });
  const lookInput = formNode.querySelector("#pageLookInput");
  if(lookInput) lookInput.value = activeLook;
}

function refreshDesignPickers(formNode, momentType){
  const stylingPanel = formNode?.querySelector('[data-editor-panel="styling"]');
  if(!stylingPanel) return;
  const type = normalizeMomentType(momentType || formNode.elements?.moment_type?.value || "free");
  const palette = formNode.querySelector("#colorPaletteInput")?.value || "classic";
  const variant = formNode.querySelector('[name="theme_variant"]')?.value || "chiaro";
  const fontPair = formNode.querySelector('[name="font_pair"]')?.value || "classic";
  const heroStyle = formNode.querySelector('[name="hero_style"]')?.value || "classico";
  const currentLook = formNode.querySelector("#pageLookInput")?.value
    || findLookForDesign({ colorPalette:palette, themeVariant:variant, fontPair, heroStyle })
    || suggestLookForMomentType(type);
  const lookHost = stylingPanel.querySelector(".look-picker-host");
  if(lookHost) lookHost.innerHTML = renderLookPicker(currentLook, type);
  const decorHost = stylingPanel.querySelector(".decor-picker-host");
  const currentDecor = formNode.querySelector("#pageDecorInput")?.value || "none";
  if(decorHost) decorHost.innerHTML = renderDecorPicker(currentDecor, type);
  stylingPanel.querySelectorAll(".look-card").forEach(button=>{
    button.addEventListener("click",()=>applyPageLook(formNode, button.dataset.look || "classic"));
  });
  stylingPanel.querySelectorAll(".decor-card").forEach(button=>{
    button.addEventListener("click",()=>{
      const input = formNode.querySelector("#pageDecorInput");
      if(input) input.value = button.dataset.decor || "none";
      syncDecorCards(formNode, input?.value || "none");
      markEditorDirty(formNode);
      schedulePreviewUpdate(formNode,{ immediate:true });
    });
  });
  syncLookCards(formNode, formNode.querySelector("#pageLookInput")?.value || currentLook);
  syncDecorCards(formNode, formNode.querySelector("#pageDecorInput")?.value || "none");
}

function applySuggestedLookForType(formNode, type, { preview = true } = {}){
  refreshDesignPickers(formNode, type);
  const suggestedLook = suggestLookForMomentType(normalizeMomentType(type));
  if(suggestedLook && PAGE_LOOKS[suggestedLook]) applyPageLook(formNode, suggestedLook, { preview });
  const suggestedDecor = decorPresetForType(normalizeMomentType(type));
  const decorInput = formNode.querySelector("#pageDecorInput");
  if(decorInput) decorInput.value = suggestedDecor;
  syncDecorCards(formNode, decorInput?.value || "none");
  if(preview) schedulePreviewUpdate(formNode,{ immediate:true });
}

function applyPageLook(formNode, lookId, { preview = true, resetZoom = true } = {}){
  const look = PAGE_LOOKS[lookId];
  if(!look) return;
  const paletteInput = formNode.querySelector("#colorPaletteInput");
  if(paletteInput) paletteInput.value = look.palette;
  const variantSelect = formNode.querySelector('[name="theme_variant"]');
  if(variantSelect) variantSelect.value = look.variant;
  const fontSelect = formNode.querySelector('[name="font_pair"]');
  if(fontSelect) fontSelect.value = look.fontPair;
  const heroSelect = formNode.querySelector('[name="hero_style"]');
  if(heroSelect) heroSelect.value = look.heroStyle;
  const lookInput = formNode.querySelector("#pageLookInput");
  if(lookInput) lookInput.value = lookId;
  if(resetZoom) resetCoverZoomIfNeeded(formNode);
  syncPaletteButtons(formNode, look.palette);
  syncLookCards(formNode, lookId);
  updateDesignSwatch(formNode);
  markEditorDirty(formNode);
  if(preview) schedulePreviewUpdate(formNode,{ immediate:true });
}

function resetCoverZoomIfNeeded(formNode){
  const zoomInput = formNode?.elements?.cover_zoom;
  if(!zoomInput || Number(zoomInput.value) <= 110) return;
  zoomInput.value = 100;
  const zoomVal = document.getElementById("coverZoomVal");
  if(zoomVal) zoomVal.textContent = "100%";
  syncCoverFramer(formNode);
}

function syncPaletteButtons(formNode, palette){
  const stylingPanel = formNode.querySelector('[data-editor-panel="styling"]');
  if(!stylingPanel) return;
  stylingPanel.querySelectorAll(".palette-btn").forEach(button=>{
    button.classList.toggle("active", button.dataset.palette === palette);
  });
}

function syncDecorCards(formNode, decorId){
  const stylingPanel = formNode.querySelector('[data-editor-panel="styling"]');
  if(!stylingPanel) return;
  stylingPanel.querySelectorAll(".decor-card").forEach(button=>{
    button.classList.toggle("active", button.dataset.decor === decorId);
    button.setAttribute("aria-pressed", button.dataset.decor === decorId ? "true" : "false");
  });
}

function renderLookPicker(currentLook, momentType = "free"){
  const suggested = suggestLookForMomentType(momentType);
  const order = looksForMomentType(momentType);
  return `<div class="look-grid">${order.map(id=>{
    const look = PAGE_LOOKS[id];
    if(!look) return "";
    const colors = resolvePalette(look.palette, look.variant);
    const isSuggested = id === suggested;
    return `<button type="button" class="look-card ${currentLook === id ? "active" : ""} ${isSuggested ? "look-suggested" : ""}" data-look="${esc(id)}" aria-pressed="${currentLook === id ? "true" : "false"}">
      <span class="look-card-preview" style="--lk-go:${esc(colors.go)};--lk-g2:${esc(colors.g2)};--lk-hero:${esc(colors.hero)};--lk-ro:${esc(colors.ro)};--lk-bl:${esc(colors.bl)};--lk-card:${esc(colors.card || colors.bl2)};--lk-in:${esc(colors.in)}"></span>
      <span class="look-card-emoji" aria-hidden="true">${look.emoji}</span>
      <strong>${esc(look.label)}${isSuggested ? " · consigliato" : ""}</strong>
      <small>${esc(look.hint)}</small>
    </button>`;
  }).join("")}</div>
  <input type="hidden" name="page_look" id="pageLookInput" value="${esc(currentLook)}">`;
}

function renderDecorPicker(currentDecor, momentType = "free"){
  const current = PAGE_DECOR_PRESETS[currentDecor] ? currentDecor : "none";
  const ids = decorPresetsForMomentType(normalizeMomentType(momentType));
  return `<div class="decor-grid">${ids.map(id=>{
    const preset = PAGE_DECOR_PRESETS[id];
    if(!preset) return "";
    const preview = preset.emojis.slice(0, 3).join("") || "—";
    return `<button type="button" class="decor-card ${current === id ? "active" : ""}" data-decor="${esc(id)}" aria-pressed="${current === id ? "true" : "false"}">
      <span class="decor-card-preview">${preview}</span>
      <strong>${esc(preset.label)}</strong>
      <small>${esc(preset.hint)}</small>
    </button>`;
  }).join("")}</div>
  <input type="hidden" name="page_decor" id="pageDecorInput" value="${esc(current)}">`;
}

function renderPalettePicker(current){
  return `<div class="palette-row">${Object.keys(COLOR_PALETTES).filter(k=>k!=="classic").map(key=>{
    const c = COLOR_PALETTES[key];
    return `<button type="button" class="palette-btn ${current === key ? "active" : ""}" data-palette="${esc(key)}" title="${esc(PALETTE_LABELS[key] || key)}"><span style="background:linear-gradient(135deg,${c.go},${c.ro})"></span></button>`;
  }).join("")}<button type="button" class="palette-btn ${current === "classic" ? "active" : ""}" data-palette="classic" title="KhamaKey"><span style="background:linear-gradient(135deg,#4CAF27,#1B2A5E)"></span></button></div><input type="hidden" name="color_palette" id="colorPaletteInput" value="${esc(current)}">`;
}

function updateDesignSwatch(formNode){
  const swatch = formNode?.querySelector(".design-swatch");
  if(!swatch) return;
  const palette = formNode.querySelector("#colorPaletteInput")?.value || "classic";
  const variant = formNode.querySelector('[name="theme_variant"]')?.value || "chiaro";
  const colors = resolvePalette(palette, variant);
  swatch.style.setProperty("--sw-bl", colors.bl);
  swatch.style.setProperty("--sw-go", colors.go);
  swatch.style.setProperty("--sw-ro", colors.ro);
  swatch.style.setProperty("--sw-g2", colors.g2);
  swatch.style.setProperty("--sw-in", colors.in);
  swatch.style.setProperty("--sw-hero", colors.hero);
}

function bindDesignPanelHandlers(formNode){
  const stylingPanel = formNode.querySelector('[data-editor-panel="styling"]');
  if(!stylingPanel || stylingPanel.dataset.designBound === "1") return;
  stylingPanel.dataset.designBound = "1";

  const onDesignChange = ()=>{
    syncLookCards(formNode);
    updateDesignSwatch(formNode);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{ immediate:true });
  };

  stylingPanel.querySelectorAll(".look-card").forEach(button=>{
    button.addEventListener("click",()=>{
      applyPageLook(formNode, button.dataset.look || "classic");
    });
  });

  stylingPanel.querySelectorAll(".decor-card").forEach(button=>{
    button.addEventListener("click",()=>{
      const input = formNode.querySelector("#pageDecorInput");
      if(input) input.value = button.dataset.decor || "none";
      syncDecorCards(formNode, input?.value || "none");
      onDesignChange();
    });
  });

  stylingPanel.querySelectorAll("[data-suggest-look]").forEach(button=>{
    button.addEventListener("click",()=>{
      applyPageLook(formNode, button.dataset.suggestLook || "classic");
    });
  });

  stylingPanel.querySelectorAll(".palette-btn").forEach(button=>{
    button.addEventListener("click",()=>{
      const input = formNode.querySelector("#colorPaletteInput");
      if(input) input.value = button.dataset.palette || "classic";
      syncPaletteButtons(formNode, input?.value || "classic");
      onDesignChange();
    });
  });

  ["theme_variant","font_pair","hero_style"].forEach(name=>{
    formNode.querySelector(`[name="${name}"]`)?.addEventListener("change", onDesignChange);
  });
}

function renderDesignSuggestBanner(momentType, currentLook){
  const suggested = suggestLookForMomentType(momentType);
  if(!suggested || suggested === currentLook) return "";
  const look = PAGE_LOOKS[suggested];
  if(!look) return "";
  const typeLabel = TYPE_LABELS[momentType] || "questa pagina";
  return `<p class="design-suggest">💡 Per <strong>${esc(typeLabel)}</strong> prova ${look.emoji} <button type="button" class="design-suggest-btn" data-suggest-look="${esc(suggested)}">${esc(look.label)}</button></p>`;
}

function renderDesignPanel(state){
  const palette = state.colorPalette || legacyThemeToPalette(state.theme);
  const variant = state.themeVariant || "chiaro";
  const colors = resolvePalette(palette, variant);
  const fontPair = state.fontPair || "classic";
  const currentLook = findLookForDesign({
    colorPalette: palette,
    themeVariant: variant,
    fontPair,
    heroStyle: state.heroStyle || "classico"
  });
  return `<div class="editor-panel ${activeEditorPanel === "styling" ? "active" : ""}" data-editor-panel="styling">
    ${renderSectionHeader(EDITOR_PANELS.styling.title,EDITOR_PANELS.styling.subtitle)}
    <div class="editor-card">
      <p class="ecard-title">Scegli lo stile</p>
      <p class="design-intro">Stili per <strong>${esc(TYPE_LABELS[state.type] || "questa categoria")}</strong>. Colori classici: sfondo forte, riquadri bianchi, testi neri.</p>
      ${renderDesignSuggestBanner(state.type, currentLook)}
      <div class="look-picker-host">${renderLookPicker(currentLook, state.type)}</div>
    </div>
    <div class="editor-card">
      <p class="ecard-title">Ecco come sarà</p>
      <div class="design-swatch" style="--sw-bl:${esc(colors.bl)};--sw-go:${esc(colors.go)};--sw-g2:${esc(colors.g2)};--sw-ro:${esc(colors.ro)};--sw-in:${esc(colors.in)};--sw-hero:${esc(colors.hero)}">
        <div class="design-swatch-hero"><span>Il titolo della tua pagina</span></div>
        <div class="design-swatch-body"><span>Sfondo</span><span>Accenti</span></div>
      </div>
    </div>
    <div class="editor-card">
      <p class="ecard-title">Icone e adesivi (facoltativo)</p>
      <p class="design-intro">Adesivi leggeri — solo quelli adatti a questa categoria.</p>
      <div class="decor-picker-host">${renderDecorPicker(state.pageDecor || "none", state.type)}</div>
    </div>
    <details class="design-advanced editor-card">
      <summary>Vuoi cambiare qualcosa in più? (facoltativo)</summary>
      <label>Tonalità colori
        ${renderPalettePicker(palette)}
      </label>
      <label>Sfondo pagina
        <select name="theme_variant">
          ${Object.entries(VARIANT_LABELS).map(([value,label])=>option(value,label,variant)).join("")}
        </select>
      </label>
      <p class="field-hint">Chiaro = luminoso · Caldo = avvolgente · Scuro = elegante di sera</p>
      <label>Stile scritte
        <select name="font_pair">
          ${Object.entries(FONT_PAIRS).map(([value,meta])=>option(value,meta.label,fontPair)).join("")}
        </select>
      </label>
      <label>Copertina in alto
        <select name="hero_style">
          ${Object.entries(HERO_STYLES).map(([value,label])=>option(value,label,state.heroStyle || "classico")).join("")}
        </select>
      </label>
      <p class="field-hint">La copertina è la prima cosa che si vede aprendo il link NFC.</p>
    </details>
  </div>`;
}

function renderCoverPanel(state){
  return `<div class="editor-panel ${activeEditorPanel === "cover" ? "active" : ""}" data-editor-panel="cover">
    ${renderSectionHeader(EDITOR_PANELS.cover.title,EDITOR_PANELS.cover.subtitle)}
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> Di cosa parla?</p>
      <label>Titolo della pagina<input name="title" value="${esc(state.title)}" required placeholder="Es. Il nostro anniversario"></label>
      <label>Tipo di momento
        <select name="moment_type" id="momentTypeSelect">
          ${renderCategorySelect(state.type)}
        </select>
      </label>
      <button type="button" class="primary smart-action-btn" id="applyMomentTemplate">✨ Prepara tutto per me</button>
      <p class="field-hint">Scegli il tipo e tocca il pulsante — testi, sezioni e colori si sistemano da soli.</p>
    </div>
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">2</span> La foto di copertina</p>
      <div class="cover-preview-wrap">
        <input type="hidden" name="cover_url" id="coverUrlInput" value="${esc(state.cover_url)}">
        <div class="cover-upload-actions">
          <input type="file" id="coverFileInput" accept="image/*" hidden>
          <button type="button" class="primary upload-trigger" data-upload-target="cover">📷 Carica foto copertina</button>
        </div>
        <p class="field-hint" id="coverUploadStatus"></p>
        ${renderCoverFramer(state)}
      </div>
        <details class="design-advanced cover-extra">
        <summary>Altri testi sulla copertina (facoltativo)</summary>
        <label>Etichetta sopra il titolo<input name="pill" value="${esc(state.pill)}" placeholder="Es. Amore · Un mondo tutto nostro"></label>
        <label>Frase sotto il titolo<input name="subtitle" value="${esc(state.subtitle)}" placeholder="Es. Per sempre insieme"></label>
        <label>Descrizione breve<textarea name="description" placeholder="Breve frase per chi apre la pagina — non incollare link o indirizzi tecnici">${esc(state.description)}</textarea></label>
      </details>
      <details class="design-advanced cover-extra">
        <summary>Foto profilo tonda (solo stile Natura)</summary>
        <input type="hidden" name="profile_photo" id="profilePhotoInput" value="${esc(state.profile_photo)}">
        <div class="section-photo-preview" id="profilePhotoPreview">${profilePhotoPreviewHtml(state.profile_photo)}</div>
        <input type="file" id="profilePhotoFile" accept="image/*" hidden>
        <p class="field-hint">Opzionale — compare nella copertina con lo stile Profilo/Natura.</p>
      </details>
      <p class="field-hint">I colori si scelgono in <strong>Design → Colori</strong> — un tap e la pagina cambia look.</p>
    </div>
  </div>`;
}

function renderCounterPanel(state){
  if(!showCounterForType(state.type)) return "";
  const counterTitle = counterLabelForType(state.type);
  return `<div class="editor-panel ${activeEditorPanel === "counter" ? "active" : ""}" data-editor-panel="counter">
    ${renderSectionHeader(counterTitle,EDITOR_PANELS.counter.subtitle)}
    <div class="section-switch ${state.show_together_counter ? "is-on" : ""}" data-counter-switch="main" role="switch" aria-checked="${state.show_together_counter ? "true" : "false"}" tabindex="0">
      <span class="section-switch-label">
        <span class="section-switch-icon">⏱</span>
        <span class="section-switch-copy">
          <strong>${state.show_together_counter ? "Contatore attivo" : "Contatore spento"}</strong>
          <small>${state.show_together_counter ? "Compare sotto la copertina" : "Tocca per mostrarlo"}</small>
        </span>
      </span>
      <span class="section-switch-track" aria-hidden="true"><i></i></span>
    </div>
    <input type="checkbox" name="show_together_counter" ${state.show_together_counter ? "checked" : ""} hidden id="showTogetherCounterInput">
    <div class="section-editor-stack ${state.show_together_counter ? "" : "is-muted"}">
      <div class="editor-card smart-card">
        <p class="ecard-title"><span class="step-badge">1</span> Da quale data?</p>
        <label>Testo sopra il contatore<input name="counter_label" value="${esc(state.counter_label || "")}" placeholder="Es. Insieme da, Ti sopporto da"></label>
        <label>Data speciale<input type="date" name="together_since" value="${esc(state.together_since || "")}"></label>
        <p class="field-hint">Es. primo appuntamento, matrimonio o inizio viaggio.</p>
      </div>
      <div class="editor-card smart-card">
        <p class="ecard-title"><span class="step-badge">2</span> Come contare?</p>
        <label class="smart-toggle"><input type="checkbox" name="show_counter_hms" ${state.show_counter_hms ? "checked" : ""}> Timer live (giorni · ore · min · sec)</label>
        <p class="field-hint">Spento = <strong>anni, mesi, giorni</strong> (fisso). Acceso = il contatore <strong>scorre ogni secondo</strong> nella pagina.</p>
      </div>
    </div>
  </div>`;
}

function renderOrderPanel(state){
  return `<div class="editor-panel ${activeEditorPanel === "order" ? "active" : ""}" data-editor-panel="order">
    ${renderSectionHeader(EDITOR_PANELS.order.title,EDITOR_PANELS.order.subtitle)}
    <div class="editor-card">
      <p class="field-hint order-intro">Tieni premuto ☰ e trascina — le sezioni attive si riordinano subito nell'anteprima.</p>
      ${renderSectionOrderList(state)}
    </div>
  </div>`;
}

function renderExtrasPanel(state){
  const pinned = state.pinned_sections || [];
  const enabled = Object.fromEntries(Object.entries(state.sections || {}).map(([k,v])=>[k, Boolean(v?.enabled)]));
  const hidden = hiddenOptionalSections(state.type, pinned, enabled);
  if(!hidden.length) return "";
  const primary = new Set(primarySectionsForType(state.type));
  const cards = hidden.map(key=>{
    const isPrimary = primary.has(key);
    return `
    <button type="button" class="extras-card" data-pin-section="${esc(key)}">
      <span class="extras-card-icon">${esc(SECTION_ICONS[key] || "•")}</span>
      <span class="extras-card-copy">
        <strong>${esc(sectionLabelForType(state.type, key))}</strong>
        <small>${esc(sectionSubtitleForType(state.type, key))}</small>
      </span>
      <span class="extras-card-action">${isPrimary ? "Riattiva →" : "Aggiungi →"}</span>
    </button>`;
  }).join("");
  return `<div class="editor-panel ${activeEditorPanel === "extras" ? "active" : ""}" data-editor-panel="extras">
    ${renderSectionHeader("Altre sezioni","Tutte le sezioni extra per questo template — attiva solo quelle che ti servono.")}
    <div class="editor-card smart-card">
      <p class="field-hint">Le sezioni consigliate compaiono nel menu quando sono attive. Qui trovi <strong>tutte le altre</strong> (e quelle consigliate che hai spento): tocca per attivarle e compila solo se ti serve.</p>
      <div class="extras-grid">${cards}</div>
    </div>
  </div>`;
}

function bindExtrasPanel(formNode){
  formNode?.querySelectorAll("[data-pin-section]").forEach(button=>{
    button.addEventListener("click",()=>activateExtraSection(button.dataset.pinSection, formNode));
  });
}

function renderSectionPanels(state, shareMeta = {}){
  const panelKeys = new Set(kitSectionKeys(state.type));
  const enabled = Object.fromEntries(Object.entries(state.sections || {}).map(([k,v])=>[k, Boolean(v?.enabled)]));
  const navKeys = new Set(navSectionsForEditor(state.type, sectionOrder, state.pinned_sections || [], enabled));
  return sectionOrder.filter(key=>key !== "places").map(key=>{
    const panelId = `section-${key}`;
    const section = state.sections[key];
    const enabledOn = Boolean(section?.enabled);
    const hidden = !panelKeys.has(key);
    const mutedNav = panelKeys.has(key) && !navKeys.has(key);
    const rsvpShare = key === "rsvp"
      ? renderRsvpSharePanel({
          publicUrl:shareMeta.publicUrl,
          momentType:state.type,
          section,
          pageTitle:state.title,
          published:shareMeta.published !== false
        })
      : "";
    const guestbookModeration = key === "guestbook" ? renderGuestbookModerationShell() : "";
    return `<div class="editor-panel ${activeEditorPanel === panelId ? "active" : ""}" data-editor-panel="${esc(panelId)}" data-section-panel-key="${esc(key)}" ${hidden ? "hidden" : ""}>
      ${renderSectionHeader(sectionLabelForType(state.type, key),sectionSubtitleForType(state.type, key))}
      ${mutedNav ? `<p class="field-hint extras-hint">Sezione extra — attivala con l'interruttore sotto o da <strong>Altre sezioni</strong>.</p>` : ""}
      ${renderSectionPanelToggle(key,enabledOn)}
      <div class="section-editor-stack ${enabledOn ? "" : "is-muted"}" data-section-stack="${esc(key)}">
        ${sectionEditor(key,section,true)}
        ${rsvpShare}
        ${guestbookModeration}
      </div>
    </div>`;
  }).join("");
}

function renderPrivacyPanel(row, state = {}){
  const anniversaryEmails = state.anniversary_emails !== false;
  const savedPin = getRememberedPin(row.id);
  const pinHintBlock = savedPin ? `
    <div class="pin-reminder-card">
      <p class="pin-reminder-label">PIN su questo telefono</p>
      <div class="pin-reveal-row">
        <code id="savedPinValue">${esc(savedPin)}</code>
        <button type="button" class="ghost" id="copySavedPinBtn">Copia</button>
        <button type="button" class="ghost" id="forgetSavedPinBtn">Rimuovi</button>
      </div>
    </div>` : `
    <div class="pin-reminder-card pin-reminder-empty">
      <p class="field-hint">Il PIN non si può recuperare dal server. Se l'hai dimenticato, scrivine uno nuovo sotto e tocca <strong>Salva</strong>.</p>
    </div>`;
  return `<div class="editor-panel ${activeEditorPanel === "privacy" ? "active" : ""}" data-editor-panel="privacy">
    ${renderSectionHeader(EDITOR_PANELS.privacy.title,EDITOR_PANELS.privacy.subtitle)}
    <div class="editor-card smart-card">
      <p class="ecard-title">🌍 Chi può vedere la pagina?</p>
      <label>Stato pagina
        <select name="public_visible" id="publicVisibleSelect">
          <option value="true" ${row.public_visible ? "selected" : ""}>✅ Pubblicata — chi ha il link la vede</option>
          <option value="false" ${!row.public_visible ? "selected" : ""}>🔒 Bozza — solo tu la modifichi</option>
        </select>
      </label>
      <p class="field-hint">Dopo aver scelto, tocca il pulsante verde <strong>Salva</strong> in basso.</p>
    </div>
    <div class="editor-card smart-card">
      <p class="ecard-title">🔐 PIN di apertura</p>
      ${pinHintBlock}
      <label>Protezione
        <select name="pin_enabled">
          <option value="true" ${row.pin_enabled ? "selected" : ""}>PIN attivo</option>
          <option value="false" ${!row.pin_enabled ? "selected" : ""}>Nessun PIN</option>
        </select>
      </label>
      <label>Nuovo PIN<input name="access_pin" inputmode="numeric" autocomplete="new-password" placeholder="Es. 1234 — lascia vuoto per non cambiare"></label>
      <p class="field-hint">Chi avvicina il tag NFC dovrà inserire questo PIN per aprire la pagina.</p>
    </div>
    <div class="editor-card smart-card">
      <p class="ecard-title">💫 Ricordi nel tempo</p>
      <label class="smart-toggle">
        <input type="checkbox" name="anniversary_emails" ${anniversaryEmails ? "checked" : ""}>
        <span><strong>Email anniversario</strong><small>Ogni anno, alla data dell'evento o del contatore «insieme da», ti inviamo un promemoria con il link alla pagina.</small></span>
      </label>
      <p class="field-hint">Usa la data evento, «insieme da» o la data del countdown se attivi.</p>
    </div>
  </div>`;
}

function renderOnboardingWizard(row){
  return `<div class="onboarding-wizard" id="onboardingWizard">
    <div class="onboarding-head">
      <p class="eyebrow">5 minuti</p>
      <h3>La tua pagina in 4 passi</h3>
      <button type="button" class="onboarding-close" id="dismissOnboarding" aria-label="Chiudi guida">×</button>
    </div>
    <ol class="onboarding-steps">
      <li class="active"><strong>1. Copertina</strong><span>Titolo, tipo pagina e foto.</span></li>
      <li><strong>2. Template</strong><span>Scegli il tipo e tocca «Prepara tutto per me».</span></li>
      <li><strong>3. Contenuti</strong><span>Modifica testi e media. In «Altre sezioni» aggiungi solo ciò che ti serve.</span></li>
      <li><strong>4. Pubblica</strong><span>Salva e condividi il link NFC.</span></li>
    </ol>
    <button type="button" class="primary" id="onboardingStart">Inizia → Copertina</button>
  </div>`;
}

function editorProgressStep(){
  if(activeNavGroup === "account") return 4;
  if(activeNavGroup === "content") return 3;
  if(activeEditorPanel === "styling" || activeEditorPanel === "order") return 2;
  return 1;
}

function syncEditorProgress(){
  document.querySelectorAll(".editor-progress-step").forEach(node=>{
    const step = Number(node.dataset.progressStep);
    const current = editorProgressStep();
    node.classList.toggle("active", step === current);
    node.classList.toggle("done", step < current);
  });
}

function renderEditorProgress(){
  const current = editorProgressStep();
  const steps = [
    { n:1, label:"Copertina", panel:"cover", group:"design" },
    { n:2, label:"Colori", panel:"styling", group:"design" },
    { n:3, label:"Contenuti", panel:"content", group:"content" },
    { n:4, label:"Pubblica", panel:"privacy", group:"account" }
  ];
  return `<nav class="editor-progress" aria-label="Passi rapidi">${steps.map(step=>`<button type="button" class="editor-progress-step ${current === step.n ? "active" : ""} ${current > step.n ? "done" : ""}" data-progress-step="${step.n}" data-progress-panel="${esc(step.panel)}" data-progress-group="${esc(step.group)}"><span class="editor-progress-num">${step.n}</span><span class="editor-progress-label">${esc(step.label)}</span></button>`).join("")}</nav>`;
}

function bindEditorProgress(root){
  root.querySelectorAll("[data-progress-step]").forEach(button=>{
    button.addEventListener("click",()=>{
      const group = button.dataset.progressGroup;
      const panel = button.dataset.progressPanel;
      if(group) setNavGroup(group);
      if(panel === "content"){
        const form = document.getElementById("momentEditorForm");
        const first = form ? (enabledSectionKeysFromForm(form)[0] || navSectionsForEditor(currentTypeFromForm(form), sectionOrder, pinnedExtraSections, enabledMapFromForm(form))[0] || "intro") : "intro";
        setEditorPanel(`section-${first}`);
      }else if(panel){
        setEditorPanel(panel);
      }
      syncEditorProgress();
    });
  });
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
  syncEditorProgress();
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
      if(mobilePreviewMode){
        const form = document.getElementById("momentEditorForm");
        if(form) schedulePreviewUpdate(form,{immediate:true,force:true});
      }
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

function renderSectionOrderItem(key,idx,momentType = currentMomentType){
  return `<div class="section-order-item" draggable="true" data-section-key="${esc(key)}">
    <span class="section-drag" aria-hidden="true">☰</span>
    <span class="section-order-icon">${esc(SECTION_ICONS[key] || "•")}</span>
    <span>${esc(sectionLabelForType(momentType, key))}</span>
    <span class="section-order-num">#${idx+1}</span>
  </div>`;
}

function renderSectionOrderList(state){
  const keys = state ? enabledSectionKeysFromState(state) : navSectionsForEditor(currentMomentType, sectionOrder, pinnedExtraSections);
  const items = keys.length
    ? keys.map((key,idx)=>renderSectionOrderItem(key,idx, state?.type || currentMomentType)).join("")
    : `<p class="section-order-empty">Nessuna sezione attiva. Attiva almeno una sezione dal menu <strong>Contenuti</strong>.</p>`;
  return `<div class="section-order-panel">
    <p class="section-order-hint">Trascina per cambiare l'ordine delle sezioni attive sulla tua pagina.</p>
    <div class="section-order-list" id="sectionOrderList">${items}</div>
  </div>`;
}

function bindSectionOrderDnD(){
  const listNode = document.getElementById("sectionOrderList");
  if(!listNode || listNode.dataset.bound === "1") return;
  listNode.dataset.bound = "1";
  let dragKey = null;
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
    const form = document.getElementById("momentEditorForm");
    const over = event.target.closest(".section-order-item");
    if(!form || !over || !dragKey || over.dataset.sectionKey === dragKey) return;
    const enabled = enabledSectionKeysFromForm(form);
    const from = enabled.indexOf(dragKey);
    const to = enabled.indexOf(over.dataset.sectionKey);
    if(from < 0 || to < 0) return;
    enabled.splice(from,1);
    enabled.splice(to,0,dragKey);
    applyEnabledSectionOrder(enabled,form);
    refreshSectionOrderList(form);
    markEditorDirty(form);
    schedulePreviewUpdate(form,{immediate:true});
  });
  listNode.addEventListener("drop",event=>event.preventDefault());
}

function bindQuickPublish(root,row){
  const quickPublish = document.getElementById("quickPublishBtn");
  const select = document.getElementById("publicVisibleSelect");
  const hint = document.getElementById("editorActionHint");
  if(!quickPublish || !select) return;
  const sync = ()=>{
    const published = select.value === "true";
    quickPublish.textContent = published ? "Nascondi pagina" : "Pubblica pagina";
    quickPublish.title = published
      ? "La pagina non sarà più visibile pubblicamente finché non la ripubblichi"
      : "Rende la pagina visibile a chi ha il link NFC";
    quickPublish.classList.toggle("published",!published);
  };
  sync();
  quickPublish.addEventListener("click",()=>{
    select.value = select.value === "true" ? "false" : "true";
    sync();
    const form = document.getElementById("momentEditorForm");
    if(form) markEditorDirty(form);
    if(hint){
      hint.textContent = select.value === "true"
        ? "Visibilità impostata su Pubblicata — clicca Salva verde per applicare."
        : "Visibilità impostata su Bozza privata — clicca Salva verde per applicare.";
      hint.hidden = false;
    }
  });
  select.addEventListener("change",sync);
}

function promptSaveReminder(message = "Modifiche pronte — clicca Salva in alto a destra per aggiornare la tua pagina."){
  const hint = document.getElementById("editorActionHint");
  if(hint){
    hint.textContent = message;
    hint.hidden = false;
  }
  updateSaveStatus(false);
  document.querySelector(".editor-save-btn")?.classList.add("pulse-save");
  setTimeout(()=>document.querySelector(".editor-save-btn")?.classList.remove("pulse-save"),2400);
}

function renderDetail(id){
  activeId = id;
  const row = rows.find(item=>item.id === id);
  if(!row) return;
  const state = mergedState(row);
  sectionOrder = [...state.sectionOrder];
  currentMomentType = normalizeMomentType(state.type);
  pinnedExtraSections = [...(state.pinned_sections || [])];
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
        <button type="button" class="copy-button" id="editorCopyLinkBtn">Copia link</button>
        <button type="button" class="copy-button" id="editorSharePageBtn">Condividi</button>
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
          <button type="button" class="ghost quick-publish published" id="quickPublishBtn" title="Rende la pagina visibile a chi ha il link">Pubblica pagina</button>
          <button type="button" class="ghost editor-open-link" id="editorOpenPageBtn" title="Apre la pagina pubblica">Apri pagina</button>
          <button type="submit" form="momentEditorForm" class="primary editor-save-btn">Salva</button>
        </div>
      </div>
      <p class="editor-action-hint" id="editorActionHint" hidden></p>
      ${renderEditorProgress()}
      <p class="editor-topbar-help">4 passi · tocca la barra sopra per saltare · <strong>Salva</strong> quando hai finito</p>
      <div class="editor-layout">
        ${renderEditorSidebar(activeEditorPanel, state.type, state.pinned_sections || [], Object.fromEntries(Object.entries(state.sections || {}).map(([k,v])=>[k, Boolean(v?.enabled)])))}
        <div class="editor-main">
          ${renderOverviewPanel(row, state, publicUrl)}
          ${renderObjectsPanel()}
          <form id="momentEditorForm" class="editor-form-inner">
            <input type="hidden" name="pinned_sections" id="pinnedSectionsInput" value="${esc((state.pinned_sections || []).join(","))}">
            ${renderCoverPanel(state)}
            ${renderDesignPanel(state)}
            ${renderCounterPanel(state)}
            ${renderOrderPanel(state)}
            ${renderSectionPanels(state,{ publicUrl, published:row.public_visible, pageTitle:state.title })}
            ${renderExtrasPanel(state)}
            ${renderGalleryFileInput("gallery")}
            ${renderJourneyFileInput()}
            ${renderLetterFileInput()}
            ${renderPrivacyPanel(row, state)}
            <p class="status editor-form-status" id="editorStatus"></p>
          </form>
        </div>
        <aside class="preview-card" id="momentPreview">
          <div class="preview-label">
            <span>Anteprima live</span>
            <span class="preview-live-status"></span>
          </div>
          <div class="preview-live-wrap">
            <div class="preview-live-stage" id="previewLiveStage">
              <iframe class="preview-live-iframe" title="Anteprima della tua pagina"></iframe>
            </div>
          </div>
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
  editorForm.addEventListener("input",event=>{
    markEditorDirty(editorForm);
    const coverField = event.target?.name === "cover_url" || event.target?.name?.startsWith("cover_focus") || event.target?.name === "cover_zoom";
    if(coverField) updateCoverPreview(editorForm);
    if(/^section_.+_title$/.test(event.target?.name || "")) syncEditorKitUi(editorForm);
    schedulePreviewUpdate(editorForm);
  });
  editorForm.addEventListener("change",event=>{
    markEditorDirty(editorForm);
    const isSectionToggle = /^section_.+_enabled$/.test(event.target?.name || "");
    if(event.target?.name === "theme_variant") updateDesignSwatch(editorForm);
    schedulePreviewUpdate(editorForm,{immediate:isSectionToggle || event.target?.name === "theme_variant"});
  });
  bindObjectSwitcher(detail);
  bindActivationForm(document.getElementById("editorActivationForm"),document.getElementById("editorActivationStatus"));
  document.getElementById("editorLogout")?.addEventListener("click",()=>document.getElementById("momentsLogout")?.click());
  document.getElementById("applyMomentTemplate")?.addEventListener("click",()=>{
    applyTemplateToForm(editorForm,editorForm.elements.moment_type.value || "free");
  });
  document.getElementById("momentTypeSelect")?.addEventListener("change",()=>{
    const type = editorForm.elements.moment_type?.value || "free";
    applySuggestedLookForType(editorForm, type);
    syncEditorKitUi(editorForm);
    markEditorDirty(editorForm);
  });
  bindDesignPanelHandlers(editorForm);
  updateDesignSwatch(editorForm);
  bindEditorNavigation(editorShell);
  bindEditorProgress(editorShell);
  bindMobilePreviewToggle(editorShell);
  bindQuickPublish(editorShell,row);
  bindMediaUploads(detail,row);
  bindCoverFramer(editorForm);
  bindCounterSwitch(editorForm);
  ensureMediaModals();
  bindGalleryMediaInteractions(detail,editorForm);
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
    setNavGroup("design");
    setEditorPanel("cover");
    document.getElementById("onboardingWizard")?.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
  editorForm.querySelector('[name="show_together_counter"]')?.addEventListener("change",event=>{
    const wrap = editorForm.querySelector('[data-editor-panel="counter"] .section-editor-stack');
    if(wrap) wrap.classList.toggle("is-muted",!event.target.checked);
  });
  const orderList = document.getElementById("sectionOrderList");
  if(orderList) delete orderList.dataset.bound;
  bindSectionOrderDnD();
  bindSectionEnableHandlers(editorForm);
  bindSectionToggleButtons(editorForm);
  bindExtrasPanel(editorForm);
  if(window.__momentsPreviewResizeBound !== "1"){
    window.__momentsPreviewResizeBound = "1";
    window.addEventListener("resize",()=>fitPreviewStage(),{passive:true});
  }
  const galleryMedia = normalizeMediaList(state.sections.gallery);
  writeGalleryMedia(editorForm,"gallery",galleryMedia);
  renderGalleryGrid(editorForm,"gallery");
  const journeySteps = resolveJourneySteps(state.sections.timeline,state.sections.places);
  writeJourneySteps(editorForm,"timeline",journeySteps);
  renderJourneySteps(editorForm,"timeline");
  bindJourneyEditor(editorForm,{
    onAddStep:addJourneyStep,
    onUploadStep:(formNode,stepId)=>openJourneyFilePicker(formNode,stepId),
    onClearPhoto:clearJourneyStepPhoto,
    onRemoveStep:removeJourneyStep
  });
  schedulePreviewUpdate(editorForm,{immediate:true,force:true});
  ensureMobileNav();
  syncMobileNav(activeEditorPanel);
  bindPageMenuActions(publicUrl, state.title || row.slug);
  bindEditorPageActions(publicUrl, state.title || row.slug);
  bindRsvpSharePanel(editorForm,{
    publicUrl,
    momentType:state.type,
    pageTitle:state.title || row.slug,
    published:row.public_visible,
    copyText,
    sharePageUrl
  });
  bindRsvpResponsesPanel({ supabase, eventId:row.id });
  bindGuestbookModerationPanel({ supabase, eventId:row.id });
  bindMomentDashboard({
    supabase,
    eventId:row.id,
    publicUrl,
    published:row.public_visible,
    slug:row.slug,
    state,
    copyText
  });
  bindRsvpFieldsEditor(editorForm,()=>{
    markEditorDirty(editorForm);
    schedulePreviewUpdate(editorForm);
    const panel = document.getElementById("rsvpSharePanel");
    if(panel){
      const preview = panel.querySelector("#rsvpGuestPreview");
      if(preview){
        preview.textContent = rsvpGuestPreviewFromForm(editorForm, state.title || row.slug);
      }
    }
  });
  setEditorChromeVisible(true);
}

function setUploadStatus(node,message="",type=""){
  if(!node) return;
  node.textContent = message;
  node.className = `field-hint ${type}`.trim();
}

function setCoverUrl(formNode, url){
  const hidden = formNode?.querySelector("#coverUrlInput") || formNode?.elements?.cover_url;
  if(hidden) hidden.value = url || "";
}

function profilePhotoPreviewHtml(url){
  const label = PROFILE_PHOTO_FIELD.label;
  if(url){
    return `<img src="${esc(url)}" alt=""><button type="button" class="ghost" data-profile-photo-remove>Rimuovi</button>`;
  }
  return `<button type="button" class="primary section-photo-btn" data-profile-photo-upload>📷 ${esc(label)}</button>`;
}

function refreshProfilePhotoPreview(url){
  const preview = document.getElementById("profilePhotoPreview");
  if(preview) preview.innerHTML = profilePhotoPreviewHtml(url);
}

async function uploadProfilePhoto(file,row,formNode){
  uploadBusy = true;
  try{
    validateImageFile(file);
    const url = await uploadImage(supabase,{scope:"moments",scopeId:row.id,file});
    const input = formNode.querySelector("#profilePhotoInput") || formNode.elements.profile_photo;
    const oldUrl = input?.value || "";
    if(input) input.value = url;
    refreshProfilePhotoPreview(url);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    if(oldUrl && isCloudflareMediaUrl(oldUrl) && oldUrl !== url){
      deleteStorageObject(supabase,oldUrl).catch(()=>{});
    }
  }catch(error){
    alert(error.message || "Upload foto profilo non riuscito.");
  }finally{
    uploadBusy = false;
  }
}

function removeProfilePhoto(formNode){
  const input = formNode.querySelector("#profilePhotoInput") || formNode.elements.profile_photo;
  const oldUrl = input?.value || "";
  if(input) input.value = "";
  refreshProfilePhotoPreview("");
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{immediate:true,force:true});
  if(oldUrl && isCloudflareMediaUrl(oldUrl)){
    deleteStorageObject(supabase,oldUrl).catch(()=>{});
  }
}

async function uploadCoverImage(file,row,formNode){
  validateImageFile(file);
  const status = document.getElementById("coverUploadStatus");
  setUploadStatus(status,"Caricamento in corso...");
  uploadBusy = true;
  try{
    const url = await uploadImage(supabase,{scope:"moments",scopeId:row.id,file});
    setCoverUrl(formNode, url);
    const framerImg = document.getElementById("coverFramerImg");
    if(framerImg) framerImg.src = url;
    bindCoverFramer(formNode);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    setUploadStatus(status,"Copertina caricata. Ricorda di toccare Salva.","ok");
  }catch(error){
    setUploadStatus(status,error.message || "Upload non riuscito.","error");
  }finally{
    uploadBusy = false;
  }
}

function readGalleryUrls(formNode,key){
  return readGalleryMedia(formNode,key).filter(item=>item.type === "image").map(item=>item.url);
}

function writeGalleryUrls(formNode,key,urls){
  const current = readGalleryMedia(formNode,key).filter(item=>item.type !== "image");
  const next = [...current,...urls.map(url=>({id:crypto.randomUUID(),type:"image",url,title:"",description:""}))];
  writeGalleryMedia(formNode,key,next);
}

function renderGalleryThumbs(formNode,key){
  renderGalleryGrid(formNode,key);
}

async function uploadGalleryImages(files,row,formNode,key){
  const status = document.getElementById(`galleryUploadStatus_${key}`);
  const batchSize = [...files].filter(Boolean).length;
  enableSection(formNode,key);
  try{
    const items = await uploadGalleryMedia({
      supabase,
      row,
      formNode,
      key,
      files,
      onStatus:(msg,type)=>setUploadStatus(status,msg,type),
      onBusy:busy=>{ uploadBusy = busy; }
    });
    enableSection(formNode,key);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    const count = items?.length || batchSize;
    promptSaveReminder(`${count} file caricati in galleria. Clicca Salva verde per vederli sulla tua pagina.`);
  }catch(error){
    const message = error.message || "Upload non riuscito.";
    setUploadStatus(status,message,"error");
    alert(message);
  }
}

async function uploadMusicAudio(file,row,formNode){
  const panel = document.getElementById("musicAudioPanel");
  uploadBusy = true;
  try{
    const url = await uploadAudio(supabase,{scope:"moments",scopeId:row.id,file});
    const urlInput = formNode.querySelector('[name="section_music_audio_url"]');
    const oldUrl = urlInput?.value || "";
    if(urlInput) urlInput.value = url;
    if(panel){
      panel.querySelector("[data-music-audio-add]")?.remove();
      panel.querySelector(".music-audio-preview")?.remove();
      panel.insertAdjacentHTML("beforeend",`<div class="music-audio-preview"><audio src="${esc(url)}" controls></audio><button type="button" class="ghost music-audio-remove" data-music-audio-remove aria-label="Rimuovi audio">Rimuovi</button></div>`);
    }
    enableSection(formNode,"music");
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    if(oldUrl && isCloudflareMediaUrl(oldUrl) && oldUrl !== url){
      deleteStorageObject(supabase,oldUrl).catch(()=>{});
    }
  }catch(error){
    alert(error.message || "Upload audio non riuscito.");
  }finally{
    uploadBusy = false;
  }
}

async function uploadSectionPhoto(key,file,row,formNode){
  const config = SECTION_PHOTO_FIELDS[key];
  if(!config) return;
  uploadBusy = true;
  try{
    validateImageFile(file);
    const url = await uploadImage(supabase,{scope:"moments",scopeId:row.id,file});
    const input = formNode.querySelector(`[name="section_${key}_${config.field}"]`);
    const oldUrl = input?.value || "";
    if(input) input.value = url;
    refreshSectionPhotoPreview(key,url);
    enableSection(formNode,key);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    if(oldUrl && isCloudflareMediaUrl(oldUrl) && oldUrl !== url){
      deleteStorageObject(supabase,oldUrl).catch(()=>{});
    }
  }catch(error){
    alert(error.message || "Upload foto non riuscito.");
  }finally{
    uploadBusy = false;
  }
}

function sectionPhotoPreviewHtml(key,url){
  const config = SECTION_PHOTO_FIELDS[key];
  const label = config?.label || "Carica foto";
  if(url){
    return `<img src="${esc(url)}" alt=""><button type="button" class="ghost" data-section-photo-remove="${esc(key)}">Rimuovi</button>`;
  }
  return `<button type="button" class="primary section-photo-btn" data-section-photo-upload="${esc(key)}">📷 ${esc(label)}</button>`;
}

function refreshSectionPhotoPreview(key,url){
  const config = SECTION_PHOTO_FIELDS[key];
  if(!config) return;
  const preview = document.getElementById(config.previewId);
  if(preview) preview.innerHTML = sectionPhotoPreviewHtml(key,url);
}

function removeSectionPhoto(key,formNode){
  const config = SECTION_PHOTO_FIELDS[key];
  if(!config) return;
  const input = formNode.querySelector(`[name="section_${key}_${config.field}"]`);
  const oldUrl = input?.value || "";
  if(input) input.value = "";
  refreshSectionPhotoPreview(key,"");
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{immediate:true,force:true});
  if(oldUrl && isCloudflareMediaUrl(oldUrl)){
    deleteStorageObject(supabase,oldUrl).catch(()=>{});
  }
}

function bindCounterSwitch(formNode){
  const panel = formNode.querySelector('[data-editor-panel="counter"]');
  if(!panel || panel.dataset.counterBound === "1") return;
  panel.dataset.counterBound = "1";
  const switchEl = panel.querySelector("[data-counter-switch]");
  const input = panel.querySelector("#showTogetherCounterInput");
  const stack = panel.querySelector(".section-editor-stack");
  if(!switchEl || !input) return;
  const sync = ()=>{
    switchEl.classList.toggle("is-on",input.checked);
    switchEl.setAttribute("aria-checked",input.checked ? "true" : "false");
    const strong = switchEl.querySelector(".section-switch-copy strong");
    const small = switchEl.querySelector(".section-switch-copy small");
    if(strong) strong.textContent = input.checked ? "Contatore attivo" : "Contatore spento";
    if(small) small.textContent = input.checked ? "Compare sotto la copertina" : "Tocca per mostrarlo";
    if(stack) stack.classList.toggle("is-muted",!input.checked);
  };
  switchEl.addEventListener("click",()=>{
    input.checked = !input.checked;
    input.dispatchEvent(new Event("change",{bubbles:true}));
    sync();
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true});
  });
  switchEl.addEventListener("keydown",event=>{
    if(event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    switchEl.click();
  });
  input.addEventListener("change",sync);
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
  document.getElementById("musicAudioFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadMusicAudio(file,row,formNode);
  });
  document.getElementById("petPhotoFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadSectionPhoto("pet",file,row,formNode);
  });
  document.getElementById("countdownPhotoFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadSectionPhoto("countdown",file,row,formNode);
  });
  document.getElementById("profilePhotoFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadProfilePhoto(file,row,formNode);
  });
  document.getElementById("letterFutureFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    try{
      const { oldUrl } = await uploadLetterMedia({
        supabase,
        row,
        formNode,
        file,
        onBusy:busy=>{ uploadBusy = busy; }
      });
      enableSection(formNode,"letter_future");
      markEditorDirty(formNode);
      schedulePreviewUpdate(formNode,{immediate:true,force:true});
      if(oldUrl && isCloudflareMediaUrl(oldUrl)){
        deleteStorageObject(supabase,oldUrl).catch(()=>{});
      }
    }catch(error){
      alert(error.message || "Upload allegato non riuscito.");
    }
  });
}

let journeyUploadStepId = null;

function openJourneyFilePicker(formNode,stepId){
  setEditorPanel("section-timeline");
  enableSection(formNode,"timeline");
  journeyUploadStepId = stepId;
  const input = document.getElementById("journeyStepFile");
  if(!input) return;
  requestAnimationFrame(()=>{ input.click(); });
}

async function uploadJourneyStepImage(file,row,formNode,stepId){
  try{
    validateImageFile(file);
    const { oldUrl } = await uploadJourneyStepPhoto({
      supabase,
      row,
      formNode,
      stepId,
      file,
      onBusy:busy=>{ uploadBusy = busy; }
    });
    enableSection(formNode,"timeline");
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    if(oldUrl && isCloudflareMediaUrl(oldUrl)){
      deleteStorageObject(supabase,oldUrl).catch(()=>{});
    }
  }catch(error){
    alert(error.message || "Upload foto tappa non riuscito.");
  }
}

function openGalleryFilePicker(formNode,key,type = ""){
  setEditorPanel(`section-${key}`);
  enableSection(formNode,key);
  const input = document.getElementById(`galleryFile_${key}`);
  if(!input) return;
  const accepts = { image:"image/*", video:"video/*", audio:"audio/*" };
  input.accept = accepts[type] || "image/*,video/*,audio/*";
  input.dataset.pendingType = type || "";
  requestAnimationFrame(()=>{ input.click(); });
}

function bindMediaUploadDelegation(){
  if(!detail) return;
  if(detail.dataset.mediaBound === "1") return;
  detail.dataset.mediaBound = "1";
  detail.addEventListener("change",async event=>{
    const journeyInput = event.target.closest("#journeyStepFile");
    if(journeyInput){
      const formNode = document.getElementById("momentEditorForm");
      const row = rows.find(item=>item.id === activeId);
      const file = journeyInput.files?.[0];
      const stepId = journeyUploadStepId;
      journeyUploadStepId = null;
      journeyInput.value = "";
      if(!formNode || !row || !file || !stepId || uploadBusy) return;
      await uploadJourneyStepImage(file,row,formNode,stepId);
      return;
    }
    const input = event.target.closest("input[id^='galleryFile_']");
    if(!input) return;
    const formNode = document.getElementById("momentEditorForm");
    const row = rows.find(item=>item.id === activeId);
    if(!formNode || !row) return;
    const key = input.id.replace("galleryFile_","");
    const files = input.files;
    const pendingType = input.dataset.pendingType || "";
    input.dataset.pendingType = "";
    input.value = "";
    if(!files?.length || uploadBusy) return;
    const filtered = pendingType
      ? [...files].filter(file=>(inferMediaKind(file) || "image") === pendingType)
      : [...files];
    if(!filtered.length){
      const status = document.getElementById(`galleryUploadStatus_${key}`);
      const label = pendingType === "video" ? "video" : pendingType === "audio" ? "audio" : "foto";
      setUploadStatus(status,`Formato non riconosciuto. Seleziona un ${label} valido (JPG, PNG, MP4 o MOV).`,"error");
      return;
    }
    await uploadGalleryImages(filtered,row,formNode,key);
  });
  detail.addEventListener("click",event=>{
    const formNode = document.getElementById("momentEditorForm");
    const row = rows.find(item=>item.id === activeId);
    if(!formNode || !row) return;
    const addBtn = event.target.closest("[data-gallery-add]");
    if(addBtn){
      event.preventDefault();
      openGalleryFilePicker(formNode,addBtn.dataset.galleryAdd || "gallery",addBtn.dataset.galleryType || "");
      return;
    }
    const removeBtn = event.target.closest("[data-gallery-remove]");
    if(removeBtn){
      const panel = removeBtn.closest("[data-gallery-key]");
      const key = removeBtn.dataset.mediaSection || panel?.dataset.galleryKey;
      if(!key) return;
      const media = readGalleryMedia(formNode,key);
      const mediaId = removeBtn.dataset.mediaId;
      let index = mediaId ? media.findIndex(item=>item.id === mediaId) : Number(removeBtn.dataset.galleryRemove);
      if(index < 0) index = Number(removeBtn.dataset.galleryRemove);
      const removed = media[index];
      media.splice(index,1);
      writeGalleryMedia(formNode,key,media);
      renderGalleryThumbs(formNode,key);
      markEditorDirty(formNode);
      schedulePreviewUpdate(formNode,{immediate:true,force:true});
      if(removed?.url && isCloudflareMediaUrl(removed.url)){
        deleteStorageObject(supabase,removed.url).catch(()=>{});
      }
      return;
    }
    if(event.target.closest("[data-music-audio-add]")){
      document.getElementById("musicAudioFile")?.click();
      return;
    }
    if(event.target.closest("[data-music-audio-remove]")){
      const urlInput = formNode.querySelector('[name="section_music_audio_url"]');
      const oldUrl = urlInput?.value || "";
      if(urlInput) urlInput.value = "";
      const titleInput = formNode.querySelector('[name="section_music_audio_title"]');
      const descInput = formNode.querySelector('[name="section_music_audio_description"]');
      if(titleInput) titleInput.value = "";
      if(descInput) descInput.value = "";
      const panel = document.getElementById("musicAudioPanel");
      if(panel){
        panel.querySelector(".music-audio-preview")?.remove();
        if(!panel.querySelector("[data-music-audio-add]")){
          panel.insertAdjacentHTML("beforeend",`<button type="button" class="gallery-add music-audio-add" data-music-audio-add><span>+</span>Carica audio MP3/M4A</button>`);
        }
      }
      markEditorDirty(formNode);
      schedulePreviewUpdate(formNode,{immediate:true,force:true});
      if(oldUrl && isCloudflareMediaUrl(oldUrl)){
        deleteStorageObject(supabase,oldUrl).catch(()=>{});
      }
      return;
    }
    const sectionPhotoUpload = event.target.closest("[data-section-photo-upload]");
    if(sectionPhotoUpload){
      const key = sectionPhotoUpload.dataset.sectionPhotoUpload;
      const config = SECTION_PHOTO_FIELDS[key];
      if(config) document.getElementById(config.fileId)?.click();
      return;
    }
    if(event.target.closest("[data-profile-photo-upload]")){
      document.getElementById("profilePhotoFile")?.click();
      return;
    }
    if(event.target.closest("[data-profile-photo-remove]")){
      removeProfilePhoto(formNode);
      return;
    }
    const sectionPhotoRemove = event.target.closest("[data-section-photo-remove]");
    if(sectionPhotoRemove){
      removeSectionPhoto(sectionPhotoRemove.dataset.sectionPhotoRemove,formNode);
      return;
    }
    if(event.target.closest("[data-letter-media-add]")){
      document.getElementById("letterFutureFile")?.click();
      return;
    }
    if(event.target.closest("[data-letter-media-remove]")){
      const old = readLetterMedia(formNode);
      writeLetterMedia(formNode,{ media_type:"", media_url:"", media_title:"" });
      syncLetterMediaPanel(formNode);
      markEditorDirty(formNode);
      schedulePreviewUpdate(formNode,{immediate:true,force:true});
      if(old.media_url && isCloudflareMediaUrl(old.media_url)){
        deleteStorageObject(supabase,old.media_url).catch(()=>{});
      }
    }
  });
}

function option(value,label,current){
  return `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`;
}

function renderGalleryUpload(section,key){
  return renderGalleryUploadPanel(section,key);
}

function sectionEditor(key,section,standalone=false){
  const hints = sectionFieldHints();
  const icon = SECTION_ICONS[key] || "•";
  const guide = sectionFillGuideForType(currentMomentType, key);
  const galleryField = key === "gallery" ? renderGalleryUpload(section,key) : "";
  const journeyField = key === "timeline" ? renderJourneyPanel(section) : "";
  const listHint = hints[key] && key !== "timeline"
    ? `<p class="section-hint">${esc(hints[key])}</p>` : "";
  const dedicationFields = key === "dedication" ? `
    <label>Destinatario<input name="section_${esc(key)}_recipient" value="${esc(section.recipient || "")}" placeholder="Es. Marco, amici, futuro noi"></label>
    <label>Firma<input name="section_${esc(key)}_signature" value="${esc(section.signature || "")}" placeholder="Es. Con amore, i tuoi nomi"></label>` : "";
  const countdownFields = key === "countdown" ? `
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> Quando?</p>
      <label>Cosa aspettate?<input name="section_${esc(key)}_event_label" value="${esc(section.event_label || "")}" placeholder="Es. Al nostro matrimonio"></label>
      <label>Data e ora<input type="datetime-local" name="section_${esc(key)}_target_date" value="${esc(section.target_date || "")}"></label>
    </div>
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">2</span> Foto</p>
      ${renderSectionPhotoPanel(key, section, "image_url", SECTION_PHOTO_FIELDS.countdown)}
      <p class="field-hint">Facoltativa — appare sopra il timer nella pagina.</p>
    </div>` : "";
  const musicFields = key === "music" ? `
    <label>Link Spotify<input name="section_${esc(key)}_spotify_url" value="${esc(section.spotify_url || "")}" placeholder="https://open.spotify.com/track/..."><span class="field-hint">Link pubblico della canzone o playlist — non link di file caricati.</span></label>
    <label>Link YouTube<input name="section_${esc(key)}_youtube_url" value="${esc(section.youtube_url || "")}" placeholder="https://youtube.com/watch?v=..."><span class="field-hint">Link pubblico del video — non link di file caricati.</span></label>
    ${renderMusicAudioPanel(section)}` : "";
  const letterFutureFields = key === "letter_future" ? `
    <label>Destinatario<input name="section_${esc(key)}_recipient" value="${esc(section.recipient || "")}" placeholder="Es. noi tra 10 anni"></label>
    <label>Data di apertura<input type="datetime-local" name="section_${esc(key)}_unlock_date" value="${esc(section.unlock_date || "")}"></label>
    ${renderLetterMediaPanel(section)}` : "";
  const rsvpFields = key === "rsvp" ? `
    <div class="editor-card smart-card">
      <p class="ecard-title"><span class="step-badge">1</span> WhatsApp organizzatore</p>
      <label>Numero WhatsApp<input name="section_${esc(key)}_whatsapp_number" value="${esc(section.whatsapp_number || "")}" placeholder="393331234567" inputmode="tel" autocomplete="tel"></label>
      <p class="field-hint">Prefisso internazionale senza + (39 = Italia). Gli invitati inviano il RSVP a questo numero.</p>
    </div>
    ${renderRsvpFieldsEditor(section)}` : "";
  const petFields = key === "pet" ? `
    <label>Nome<input name="section_${esc(key)}_pet_name" value="${esc(section.pet_name || "")}" placeholder="Es. Luna"></label>
    <label>Emoji<input name="section_${esc(key)}_pet_emoji" value="${esc(section.pet_emoji || "🐾")}" maxlength="4" placeholder="🐾"></label>
    ${renderSectionPhotoPanel(key, section, "pet_photo", SECTION_PHOTO_FIELDS.pet)}` : "";
  const quoteFields = key === "quote" ? `
    <label>Autore<input name="section_${esc(key)}_author" value="${esc(section.author || "")}" placeholder="Es. William Shakespeare"></label>` : "";
  const signatureFields = key === "signature" ? `
    <label>Nome firma<input name="section_${esc(key)}_sign_name" value="${esc(section.sign_name || "")}" placeholder="Es. Marco & Giulia"></label>
    <label>Sottotitolo<input name="section_${esc(key)}_sign_subtitle" value="${esc(section.sign_subtitle || "")}" placeholder="Es. Per sempre"></label>` : "";
  const bodyLabel = key === "quote" ? "Citazione" : key === "dedication" || key === "letter_future" ? "Testo della lettera" : key === "pet" ? "Racconto" : "Contenuto";
  const bodyField = key === "timeline" || key === "gallery" || key === "countdown" || key === "rsvp" || key === "guestbook"
    ? (key === "countdown" || key === "rsvp" || key === "guestbook" ? `<details class="design-advanced editor-card"><summary>Testo extra (facoltativo)</summary><label>${bodyLabel}<textarea name="section_${esc(key)}_body" placeholder="Scrivi qui...">${esc(section.body || "")}</textarea></label></details>` : "")
    : `<label>${bodyLabel}<textarea name="section_${esc(key)}_body" placeholder="Scrivi qui...">${esc(section.body || "")}</textarea></label>`;
  const titleField = key !== "quote" && key !== "signature"
    ? `<label>Titolo sezione<input name="section_${esc(key)}_title" value="${esc(section.title || "")}" placeholder="Es. ${esc(DEFAULT_SECTIONS[key]?.title || SECTION_LABELS[key] || "")}"><span class="field-hint">Compare nel menu della pagina e come titolo della sezione.</span></label>`
    : "";
  const fields = `
    ${titleField}
    ${bodyField}
    ${listHint}
    ${dedicationFields}
    ${countdownFields}
    ${musicFields}
    ${letterFutureFields}
    ${rsvpFields}
    ${petFields}
    ${quoteFields}
    ${signatureFields}
    ${journeyField}
    ${galleryField}`;
  if(standalone){
    if(key === "gallery"){
      return `<div class="editor-card"><p class="ecard-title">${icon} Aggiungi ricordi</p><p class="field-hint">${esc(guide)}</p>${galleryField}</div>`;
    }
    if(key === "timeline"){
      return `<div class="editor-card"><p class="ecard-title">${icon} Tappe del percorso</p><p class="field-hint">${esc(guide)}</p>${journeyField}</div>`;
    }
    if(key === "countdown"){
      return `<div class="editor-card"><p class="ecard-title">${icon} Conto alla rovescia</p><p class="field-hint">${esc(guide)}</p>${titleField}</div>${countdownFields}${bodyField}`;
    }
    if(key === "rsvp"){
      return `<div class="editor-card"><p class="ecard-title">${icon} RSVP invitati</p><p class="field-hint">${esc(guide)}</p>${titleField}${rsvpFields}${bodyField}</div>`;
    }
    if(key === "guestbook"){
      return `<div class="editor-card"><p class="ecard-title"><span class="step-badge">1</span> ${icon} Libro degli ospiti</p><p class="field-hint">${esc(guide)}</p>${titleField}<label>Invito agli ospiti<textarea name="section_${esc(key)}_body" placeholder="Scrivi qui...">${esc(section.body || "")}</textarea></label></div>`;
    }
    return `<div class="editor-card"><p class="ecard-title">${icon} ${esc(guide.split(".")[0])}</p>${fields.replace(galleryField,"").replace(journeyField,"")}</div>`;
  }
  const fillGuide = `<div class="section-fill-guide"><p>${esc(guide)}</p></div>`;
  return `<details class="section-box section-box-${esc(key)}" data-section-key="${esc(key)}" ${section.enabled ? "open" : ""}>
    <summary><span class="section-icon">${esc(icon)}</span><label><input type="checkbox" name="section_${esc(key)}_enabled" ${section.enabled ? "checked" : ""} onclick="event.stopPropagation()"> <span>${esc(SECTION_LABELS[key])}</span></label></summary>
    <div class="section-body">${fillGuide}${fields}</div>
  </details>`;
}

function normalizeWhatsAppDigits(raw){
  let wa = String(raw || "").replace(/\D/g, "");
  if(!wa) return "";
  if(wa.startsWith("0")) wa = wa.replace(/^0+/, "");
  if((wa.length === 9 || wa.length === 10) && wa.startsWith("3")) wa = `39${wa}`;
  return wa;
}

function sanitizeStateForSave(state){
  let clone;
  try{
    clone = JSON.parse(JSON.stringify(state));
  }catch{
    throw new Error("Contenuti non validi. Controlla testi e allegati della lettera al futuro.");
  }
  const stripBlob = value=>{
    const url = String(value || "").trim();
    return url.startsWith("blob:") ? "" : url;
  };
  const sections = clone.sections || {};
  if(sections.letter_future){
    const letter = sections.letter_future;
    letter.media_url = stripBlob(letter.media_url);
    if(!letter.media_url){
      letter.media_type = "";
      letter.media_title = "";
    }else if(!letter.media_type){
      letter.media_type = letter.media_url.match(/\.(mp4|webm|mov|m4v)(\?|$)/i) ? "video"
        : letter.media_url.match(/\.(mp3|m4a|wav|ogg|aac)(\?|$)/i) ? "audio" : "image";
    }
  }
  if(sections.gallery?.media){
    sections.gallery.media = sections.gallery.media.filter(item=>!String(item?.url || "").startsWith("blob:"));
    sections.gallery.images = sections.gallery.media.filter(item=>item.type === "image").map(item=>item.url);
  }
  if(sections.music){
    sections.music.audio_url = stripBlob(sections.music.audio_url);
  }
  if(sections.rsvp){
    sections.rsvp = normalizeRsvpSection(sections.rsvp);
    if(sections.rsvp.whatsapp_number){
      sections.rsvp.whatsapp_number = normalizeWhatsAppDigits(sections.rsvp.whatsapp_number);
    }
  }
  if(sections.timeline?.items){
    sections.timeline.items = sections.timeline.items.map(step=>({
      ...step,
      image_url:stripBlob(step.image_url),
      maps_url:stripBlob(step.maps_url)
    }));
  }
  return clone;
}

function readFormState(formNode){
  const form = new FormData(formNode);
  const sections = {};
  for(const key of Object.keys(DEFAULT_SECTIONS)){
    sections[key] = readSectionFromForm(form,key);
  }
  sections.gallery = {
    ...sections.gallery,
    media:readGalleryMedia(formNode,"gallery"),
    images:readGalleryMedia(formNode,"gallery").filter(item=>item.type === "image").map(item=>item.url)
  };
  sections.timeline = {
    ...sections.timeline,
    items:compactJourneySteps(readJourneySteps(formNode,"timeline"))
  };
  sections.music = {
    ...sections.music,
    audio_url:String(form.get("section_music_audio_url") || sections.music.audio_url || "").trim(),
    audio_title:String(form.get("section_music_audio_title") || sections.music.audio_title || "").trim(),
    audio_description:String(form.get("section_music_audio_description") || sections.music.audio_description || "").trim()
  };
  sections.letter_future = {
    ...sections.letter_future,
    ...readLetterMedia(formNode)
  };
  return {
    title:String(form.get("title") || "").trim(),
    type:normalizeMomentType(form.get("moment_type")),
    subtitle:String(form.get("subtitle") || "").trim(),
    description:String(form.get("description") || "").trim(),
    pill:String(form.get("pill") || "").trim(),
    cover_url:String(form.get("cover_url") || "").trim(),
    cover_focus_x:Number(form.get("cover_focus_x") || 50),
    cover_focus_y:Number(form.get("cover_focus_y") || 50),
    cover_zoom:Number(form.get("cover_zoom") || 100),
    profile_photo:String(form.get("profile_photo") || "").trim(),
    colorPalette:String(form.get("color_palette") || "classic"),
    themeVariant:String(form.get("theme_variant") || "chiaro"),
    heroStyle:String(form.get("hero_style") || "classico"),
    fontPair:String(form.get("font_pair") || "classic"),
    pageDecor:String(form.get("page_decor") || "none"),
    show_together_counter:form.get("show_together_counter") === "on",
    together_since:String(form.get("together_since") || "").trim(),
    counter_label:String(form.get("counter_label") || "").trim(),
    show_counter_hms:form.get("show_counter_hms") === "on",
    anniversary_emails:form.get("anniversary_emails") === "on",
    theme:String(form.get("page_theme") || "classic"),
    sectionOrder:[...sectionOrder],
    pinned_sections:String(form.get("pinned_sections") || "").split(",").map(value=>value.trim()).filter(Boolean),
    sections
  };
}

function markEditorDirty(formNode){
  clearTimeout(markEditorDirty.timer);
  markEditorDirty.timer = setTimeout(()=>{
    const snapshot = JSON.stringify(readFormState(formNode));
    editorDirty = snapshot !== savedEditorSnapshot;
    updateSaveStatus(!editorDirty);
    const flag = document.getElementById("unsavedFlag");
    if(flag) flag.hidden = !editorDirty;
  },180);
}

function shouldLivePreview(){
  if(window.matchMedia("(max-width:768px)").matches){
    return Boolean(document.getElementById("momentEditorShell")?.classList.contains("show-preview"));
  }
  return Boolean(document.getElementById("momentPreview"));
}

function schedulePreviewUpdate(formNode,options = {}){
  if(!options.force && !shouldLivePreview()) return;
  renderPreview(readFormState(formNode),options);
}

function updateCoverPreview(formNode){
  const url = String(new FormData(formNode).get("cover_url") || "").trim();
  const img = document.getElementById("coverFramerImg");
  if(!img) return;
  if(/^https?:\/\//i.test(url)){
    img.src = url;
    img.hidden = false;
  }else{
    img.removeAttribute("src");
  }
  syncCoverFramer(formNode);
}

let previewDebounceTimer = null;
let previewFetchId = 0;

function ensurePreviewShell(preview){
  let stage = preview.querySelector("#previewLiveStage");
  if(!stage){
    preview.innerHTML = `<div class="preview-label">
      <span>Anteprima live</span>
      <span class="preview-live-status"></span>
    </div>
    <div class="preview-live-wrap">
      <div class="preview-live-stage" id="previewLiveStage">
        <iframe class="preview-live-iframe" title="Anteprima della tua pagina"></iframe>
      </div>
    </div>`;
    stage = preview.querySelector("#previewLiveStage");
  }
  return {
    stage,
    iframe: stage?.querySelector("iframe.preview-live-iframe"),
    status: preview.querySelector(".preview-live-status")
  };
}

function fitPreviewStage(){
  const preview = document.getElementById("momentPreview");
  const stage = preview?.querySelector("#previewLiveStage");
  const iframe = stage?.querySelector("iframe.preview-live-iframe");
  const wrap = preview?.querySelector(".preview-live-wrap");
  if(!stage || !iframe || !wrap) return;
  const available = Math.max(wrap.clientWidth - 16, 280);
  stage.style.width = `${available}px`;
  stage.style.transform = "";
  stage.style.marginBottom = "";
  try{
    const doc = iframe.contentDocument;
    if(doc?.documentElement){
      const pageHeight = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight || 0,
        720
      );
      iframe.style.height = `${pageHeight}px`;
    }
  }catch{
    iframe.style.height = "720px";
  }
}

async function renderPreview(state,options = {}){
  const preview = document.getElementById("momentPreview");
  if(!preview) return;
  if(!options.force && !shouldLivePreview()) return;
  clearTimeout(previewDebounceTimer);
  const delay = options.immediate ? 0 : 350;
  previewDebounceTimer = setTimeout(async ()=>{
    const requestId = ++previewFetchId;
    const { iframe, status } = ensurePreviewShell(preview);
    if(!iframe) return;
    if(status) status.textContent = "Aggiornamento…";
    try{
      const response = await fetch(`${WORKER_BASE_URL}/api/moment/preview`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          title:state.title,
          description:state.subtitle || state.description,
          page_state:state
        })
      });
      if(requestId !== previewFetchId) return;
      if(!response.ok) throw new Error("Anteprima non disponibile");
      const html = await response.text();
      iframe.onload = ()=>{
        if(requestId !== previewFetchId) return;
        fitPreviewStage();
        if(status) status.textContent = "";
      };
      iframe.srcdoc = html;
      setTimeout(()=>{
        if(requestId === previewFetchId) fitPreviewStage();
      },120);
    }catch(error){
      if(requestId !== previewFetchId) return;
      iframe.onload = null;
      iframe.srcdoc = `<!doctype html><html><body style="font-family:sans-serif;padding:24px;color:#64748b"><p><strong>Anteprima non disponibile</strong></p><p>${esc(error.message || "Riprova tra poco.")}</p></body></html>`;
      iframe.style.height = "240px";
      if(status) status.textContent = "";
    }
  },delay);
}

async function saveMoment(event,row){
  event.preventDefault();
  const formNode = event.currentTarget;
  const editorStatus = document.getElementById("editorStatus");
  let state;
  try{
    state = sanitizeStateForSave(readFormState(formNode));
  }catch(error){
    setStatus(editorStatus,error.message || "Controlla i campi e riprova.","error");
    return;
  }
  const pin = String(new FormData(formNode).get("access_pin") || "").trim();
  const publicVisible = new FormData(formNode).get("public_visible") === "true";
  const pinEnabled = new FormData(formNode).get("pin_enabled") === "true";
  if(!state.title) return setStatus(editorStatus,"Inserisci il titolo della pagina.","error");
  if(state.sections?.letter_future?.enabled){
    const letter = state.sections.letter_future;
    const hasLetter = Boolean(String(letter.body || "").trim() || letter.unlock_date || letter.media_url);
    if(!hasLetter){
      return setStatus(editorStatus,"Lettera al futuro: scrivi il testo, la data di apertura o un allegato.","error");
    }
    if(letter.media_url && !letter.media_type){
      return setStatus(editorStatus,"Lettera al futuro: ricarica l'allegato prima di salvare.","error");
    }
  }
  setStatus(editorStatus,"Salvataggio...");
  try{
    let pinHash = null;
    if(pin){
      pinHash = await momentPinHash(row.slug,validatePin(pin));
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
      setStatus(editorStatus,error.message || "Salvataggio non riuscito.","error");
      const saveStatus = document.getElementById("editorSaveStatus");
      if(saveStatus){
        saveStatus.textContent = "Errore salvataggio";
        saveStatus.classList.add("dirty");
      }
      document.getElementById("editorStatus")?.scrollIntoView({behavior:"smooth",block:"nearest"});
      return;
    }
    savedEditorSnapshot = JSON.stringify(state);
    editorDirty = false;
    updateSaveStatus(true);
    localStorage.setItem(onboardingKey(row.id),"done");
    setStatus(editorStatus,"Pagina salvata.","ok");
    const hint = document.getElementById("editorActionHint");
    if(hint) hint.hidden = true;
    const panel = activeEditorPanel;
    try{
      await loadObjects();
    }catch(loadError){
      console.warn(loadError);
    }
    activeEditorPanel = panel;
    setEditorPanel(panel);
    const formAfter = document.getElementById("momentEditorForm");
    if(formAfter) schedulePreviewUpdate(formAfter,{immediate:true,force:true});
    bindMomentDashboard({
      supabase,
      eventId:row.id,
      publicUrl:`${PUBLIC_BASE_URL}/m/${encodeURIComponent(row.slug)}`,
      published:publicVisible,
      slug:row.slug,
      state,
      copyText
    });
  }catch(error){
    console.error(error);
    const msg = String(error?.message || "").includes("Load failed")
      ? "Connessione interrotta durante il salvataggio. Controlla la rete e riprova."
      : (error?.message || "Salvataggio non riuscito.");
    setStatus(editorStatus,msg,"error");
  }
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
