import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL, authRedirectTo } from "./config.js";
import { normalizeMomentCode, formatMomentCodeDisplay, isValidMomentCode } from "./moment-codes.js";
import {
  applyChromeI18n,
  applyDocumentLang,
  getUiLocale,
  onUiLocaleChange,
  registerMessages,
  setUiLocale,
  t
} from "./moments-i18n.js?v=207";
import { AUTH_MESSAGES_EN, AUTH_MESSAGES_IT } from "./moments-i18n-auth.js?v=207";
import { SHELL_MESSAGES_EN, SHELL_MESSAGES_IT } from "./moments-i18n-shell.js?v=207";
import { SAVE_MESSAGES_EN, SAVE_MESSAGES_IT } from "./moments-i18n-save.js?v=207";
import { NAV_MESSAGES_EN, NAV_MESSAGES_IT } from "./moments-i18n-nav.js?v=207";
import { SECTION_MESSAGES_EN, SECTION_MESSAGES_IT, SECTION_PHRASE_EN, SECTION_SUBTITLE_EN } from "./moments-i18n-sections.js?v=207";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=207";
import {
  uploadImage,
  uploadVideo,
  uploadAudio,
  bindUploadClient,
  validateImageFile,
  validateVideoFile,
  deleteStorageObject,
  isCloudflareMediaUrl,
  inferMediaKind,
  fileMatchesGalleryType,
  IMAGE_ACCEPT,
  warmUploadPipeline,
  warmUploadAuth,
  MAX_GALLERY_IMAGES
} from "./media-upload.js?v=173";
import {
  readGalleryMedia,
  writeGalleryMedia,
  renderGalleryGrid,
  uploadGalleryMedia,
  replaceGalleryMediaItem,
  renderGalleryUploadPanel,
  renderGalleryFileInput,
  renderCoverFramer,
  renderMusicAudioPanel,
  renderVideoSectionPanel,
  bindCoverFramer,
  syncCoverFramer,
  bindGalleryMediaInteractions,
  ensureMediaModals,
  coverFocusStyle,
  normalizeMediaList,
  renderSectionPhotoPanel
} from "./moments-media-ui.js?v=173";
import {
  readJourneySteps,
  writeJourneySteps,
  renderJourneySteps,
  renderJourneyPanel,
  renderJourneyFileInput,
  bindJourneyEditor,
  uploadJourneyStepPhoto
} from "./moments-journey-ui.js?v=174";
import {
  migrateLetterMediaSection,
  migrateVideoSectionMedia,
  migrateMusicSectionMedia,
  setActivePlanLimits
} from "./moment-media.js?v=173";
import {
  emptyEntitlements,
  fetchMomentEntitlements,
  formatBytes,
  normalizeEntitlements,
  normalizePlanLimits,
  planLimitsSummaryLines,
  PLAN_LABELS,
  storageBytesLimit,
  storageUsagePercent
} from "./moment-plans.js?v=183";
import { LIST_SECTION_MODES, itemsFromSection } from "./moment-list-items.js";
import {
  renderListItemsPanel,
  renderListItems,
  writeListItems,
  readListItems,
  bindListItemsEditor
} from "./moments-list-ui.js?v=207";
import { journeyStepId, MAX_JOURNEY_STEPS, normalizeJourneyStep, resolveJourneySteps, compactJourneySteps } from "./moment-journey.js";
import {
  COLOR_PALETTES,
  PALETTE_LABELS,
  PALETTE_PICKER_ORDER,
  VARIANT_LABELS,
  HERO_STYLES,
  FONT_PAIRS,
  PAGE_LOOKS,
  DARK_PAGE_PALETTES,
  normalizeDesignState,
  legacyThemeToPalette,
  canonicalizePalette,
  resolvePalette,
  resolveFontPair,
  findLookForDesign,
  suggestLookForMomentType,
  looksForMomentType
} from "./moment-themes.js?v=162";
import {
  SECTION_ORDER_DEFAULT,
  DEFAULT_SECTIONS,
  SECTION_LABELS,
  SECTION_SUBTITLES,
  SECTION_ICONS,
  NAV_GROUPS,
  designNavItems,
  pageNavItems,
  normalizeSectionOrder,
  migrateSections,
  readSectionFromForm,
  parseImageLines,
  formatImageLines,
  sectionFieldHints,
  sectionFillGuide,
  sectionHasContent,
  isSectionExcluded
} from "./moment-sections.js?v=186";
import {
  TYPE_LABELS,
  renderCategorySelect,
  templateForType,
  normalizeMomentType
} from "./moment-categories.js?v=180";
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
} from "./moment-editor-kit.js?v=186";
import { renderRsvpSharePanel, bindRsvpSharePanel } from "./moment-rsvp-kit.js";
import { bindRsvpResponsesPanel } from "./moment-rsvp-responses.js";
import { renderMomentDashboardShell, bindMomentDashboard } from "./moment-editor-dashboard.js";
import { renderRsvpFieldsEditor, readRsvpFieldsFromForm, bindRsvpFieldsEditor, normalizeRsvpSection, rsvpGuestPreviewLines } from "./moment-rsvp-fields.js?v=177";
import {
  renderHoroscopePeoplePanel,
  bindHoroscopePeopleEditor,
  refreshHoroscopePeopleEditor
} from "./moment-horoscope.js?v=186";

const auth = document.getElementById("momentsAuth");
const app = document.getElementById("momentsApp");
const boot = document.getElementById("momentsBoot");
const authTabs = document.getElementById("authTabs");
const loginForm = document.getElementById("momentsLoginForm");
const signupForm = document.getElementById("momentsSignupForm");
const forgotForm = document.getElementById("momentsForgotForm");
const recoveryForm = document.getElementById("momentsRecoveryForm");
const statusNode = document.getElementById("momentsAuthStatus");
const detail = document.getElementById("momentDetail");
const userName = document.getElementById("momentsUserName");
const userEmail = document.getElementById("momentsUserEmail");
const userAvatar = document.getElementById("momentsUserAvatar");
const userMenu = document.getElementById("momentsUserMenu");
const userMenuBtn = document.getElementById("momentsUserMenuBtn");
const userMenuProducts = document.getElementById("momentsMenuProducts");
const accountHub = document.getElementById("momentsAccountHub");
const accountPanels = document.getElementById("momentsAccountPanels");
const PUBLIC_BASE_URL = WORKER_BASE_URL;
let activeAccountTab = "products";
let appView = "editor"; // editor | account

const EDITOR_PANELS = {
  overview:{titleKey:"nav.overview",subtitle:"Stato pagina, link e statistiche RSVP / libro ospiti"},
  objects:{title:"Le tue pagine",subtitle:"Scegli quale pagina modificare"},
  cover:{titleKey:"nav.cover",subtitle:"Titolo, foto e messaggio — la prima cosa che si vede"},
  styling:{titleKey:"nav.colors",subtitle:"Scegli lo stile — colori classici, molto contrasto"},
  counter:{titleKey:"nav.counter",subtitle:"Quanto tempo è passato da un giorno speciale? Scegli la data; ore/min/sec sono opzionali."},
  order:{titleKey:"nav.order",subtitle:"Trascina per cambiare l'ordine delle sezioni"},
  privacy:{titleKey:"nav.publish",subtitle:"Rendi visibile la pagina e proteggila con PIN"}
};

function editorPanelTitle(panel){
  if(!panel) return "";
  if(panel.titleKey) return t(panel.titleKey);
  return panel.title || "";
}

/** Step 7b: translate taxonomy labels only (nav / sidebar / order). Keep custom user titles. */
function localizeSectionPhrase(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return SECTION_PHRASE_EN[raw] || raw;
}

function localizeSectionSubtitle(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return SECTION_SUBTITLE_EN[raw] || raw;
}

/** Step 11+: form field chrome (labels/hints/buttons). IT source → EN map. */
function localizeFieldPhrase(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

function lfSpan(itText){
  const it = String(itText || "");
  return `<span data-lf="${esc(it)}">${esc(localizeFieldPhrase(it))}</span>`;
}

function syncFieldChromeI18n(root = document){
  root.querySelectorAll("[data-lf]").forEach(el=>{
    const src = el.getAttribute("data-lf");
    if(src == null) return;
    el.textContent = localizeFieldPhrase(src);
  });
  root.querySelectorAll("[data-lf-placeholder]").forEach(el=>{
    const src = el.getAttribute("data-lf-placeholder");
    if(src == null) return;
    el.setAttribute("placeholder", localizeFieldPhrase(src));
  });
  root.querySelectorAll("[data-lf-option]").forEach(el=>{
    const src = el.getAttribute("data-lf-option");
    if(src == null) return;
    el.textContent = localizeFieldPhrase(src);
  });
  root.querySelectorAll("[data-lf-section-guide]").forEach(el=>{
    const key = el.getAttribute("data-lf-section-guide");
    if(!key) return;
    el.textContent = localizedSectionFillGuide(currentMomentType, key);
  });
  root.querySelectorAll("[data-lf-section-guide-title]").forEach(el=>{
    const key = el.getAttribute("data-lf-section-guide-title");
    if(!key) return;
    el.textContent = localizedSectionFillGuide(currentMomentType, key).split(".")[0];
  });
  root.querySelectorAll("[data-lf-title-name]").forEach(el=>{
    const nameIt = el.getAttribute("data-lf-title-name") || "";
    const hintIt = el.getAttribute("data-lf-title-hint") || "";
    el.setAttribute("title", `${localizeFieldPhrase(nameIt)} — ${localizeFieldPhrase(hintIt)}`);
  });
  root.querySelectorAll("[data-lf-list-badge]").forEach(el=>{
    const singular = el.getAttribute("data-lf-list-badge") || "";
    const num = el.getAttribute("data-lf-list-num") || "";
    el.textContent = `${localizeFieldPhrase(singular)} ${num}`.trim();
  });
}

function localizedSectionLabel(type, key){
  return localizeSectionPhrase(sectionLabelForType(type, key));
}

function localizedSectionNavLabel(type, key){
  return localizeSectionPhrase(sectionNavLabelForType(type, key));
}

function localizedCounterLabel(type){
  return localizeSectionPhrase(counterLabelForType(type));
}

function localizedSectionSubtitle(type, key){
  return localizeSectionSubtitle(sectionSubtitleForType(type, key));
}

function editorPanelSubtitle(panel){
  if(!panel) return "";
  return localizeSectionSubtitle(panel.subtitle || "");
}

let activeEditorPanel = "cover";
let mobilePreviewMode = false;
let activeNavGroup = "content";
let currentMomentType = "free";
let lastSavedMomentType = "free";
let pinnedExtraSections = [];

let supabase;
let rows = [];
let activeId = "";
let currentUser = null;
let sectionOrder = [...SECTION_ORDER_DEFAULT];
let recoveryMode = false;
let signupStep = 1;
const PENDING_MOMENT_KEY = "khamakey_pending_moment_activation";

function storePendingMomentActivation({ code, title, pin }){
  try{
    sessionStorage.setItem(PENDING_MOMENT_KEY, JSON.stringify({
      code:normalizeCode(code),
      title:String(title || "").trim(),
      pin:String(pin || "").trim(),
      at:Date.now()
    }));
  }catch{ /* ignore */ }
}

function readPendingMomentActivation(){
  try{
    const raw = sessionStorage.getItem(PENDING_MOMENT_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!data?.code) return null;
    return data;
  }catch{
    return null;
  }
}

function clearPendingMomentActivation(){
  try{ sessionStorage.removeItem(PENDING_MOMENT_KEY); }catch{ /* ignore */ }
}
let editorDirty = false;
let savedEditorSnapshot = "";
let lastPreviewHash = "";
let previewDebounceTimer = null;
let previewFetchId = 0;
const SECTION_PHOTO_FIELDS = {
  countdown:{ field:"image_url", previewId:"countdownPhotoPreview", fileId:"countdownPhotoFile", label:"Carica foto" },
  pet:{ field:"pet_photo", previewId:"petPhotoPreview", fileId:"petPhotoFile", label:"Carica foto" },
  music:{ field:"image_url", previewId:"musicPhotoPreview", fileId:"musicPhotoFile", label:"Carica immagine" }
};
const LIST_SECTION_KEYS = new Set(Object.keys(LIST_SECTION_MODES));
let uploadBusy = false;
let currentEntitlements = emptyEntitlements();

function setStatus(node,message="",type=""){
  if(!node) return;
  node.textContent = message;
  node.className = `status ${type}`.trim();
}

/** Errori salvataggio: topbar + status form (il banner mobile altrimenti sembra “morto”). */
function showEditorSaveFeedback(message, type = "error"){
  const editorStatus = document.getElementById("editorStatus");
  setStatus(editorStatus, message, type);
  const saveStatus = document.getElementById("editorSaveStatus");
  if(saveStatus){
    saveStatus.textContent = type === "ok" ? t("shell.saved") : (type === "error" ? t("shell.save_fail") : message);
    saveStatus.classList.toggle("dirty", type !== "ok");
  }
  const barMsg = document.querySelector("#momentsSaveBar .save-msg");
  if(barMsg && type === "error" && message){
    barMsg.innerHTML = `<strong>${esc(t("save.attention"))}</strong> ${esc(message)}`;
  }
  if(type === "error"){
    editorStatus?.scrollIntoView({ behavior:"smooth", block:"nearest" });
  }
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function normalizeCode(value){
  return normalizeMomentCode(value);
}

function validatePin(pin){
  const clean = String(pin || "").trim();
  if(clean.length < 4) throw new Error(t("auth.msg.pin_min"));
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
  const pageTitle = title || t("pin.banner.title_fallback");
  banner.innerHTML = `
    <div>
      <p class="eyebrow">${esc(t("pin.banner.eyebrow"))}</p>
      <h3>${esc(t("pin.banner.title", { title: pageTitle }))}</h3>
      <p>${esc(t("pin.banner.body"))}</p>
      <div class="pin-reveal-row">
        <code id="pinRevealValue">${esc(pin)}</code>
        <button type="button" class="ghost" id="copyPinBtn">${esc(t("pin.banner.copy"))}</button>
      </div>
    </div>
    <button type="button" class="pin-success-close" id="dismissPinBanner" aria-label="${esc(t("common.close"))}">×</button>`;
  detail.prepend(banner);
  document.getElementById("copyPinBtn")?.addEventListener("click",()=>copyText(pin,document.getElementById("copyPinBtn")));
  document.getElementById("dismissPinBanner")?.addEventListener("click",()=>banner.remove());
}

function bindPasswordToggles(root=document){
  root.querySelectorAll("[data-password-target]").forEach(button=>{
    button.addEventListener("click",()=>{
      const input = document.getElementById(button.dataset.passwordTarget);
      if(!input) return;
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.classList.toggle("visible",visible);
      button.setAttribute("aria-label", visible ? t("auth.password.hide") : t("auth.password.show"));
    });
  });
}

function activationTypeHintId(input){
  if(input.id === "momentsSignupCode") return "momentsSignupTypeHint";
  const form = input.closest("form");
  return form?.querySelector("[data-activation-type-hint]")?.id || "";
}

async function refreshActivationCodeTypeHint(code, hintEl){
  if(!hintEl) return;
  const clean = normalizeCode(code);
  if(!isValidMomentCode(clean)){
    hintEl.hidden = true;
    hintEl.textContent = "";
    hintEl.className = "field-hint activation-code-type";
    return;
  }
  hintEl.hidden = false;
  hintEl.textContent = t("auth.msg.code_peek");
  hintEl.className = "field-hint activation-code-type";
  try{
    const { data,error } = await supabase.rpc("peek_moment_activation_code",{ p_code:clean });
    if(error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if(!row?.product_type){
      hintEl.textContent = t("auth.msg.code_stock_miss");
      hintEl.className = "field-hint activation-code-type warn";
      return;
    }
    const typeLabel = TYPE_LABELS[normalizeMomentType(row.product_type)] || row.product_type;
    const productLabel = String(row.product_label || "").trim();
    hintEl.textContent = productLabel
      ? t("auth.msg.model_page_product", { type: typeLabel, product: productLabel })
      : t("auth.msg.model_page", { type: typeLabel });
    hintEl.className = "field-hint activation-code-type ok";
  }catch(error){
    console.warn("peek_moment_activation_code", error);
    hintEl.hidden = true;
    hintEl.textContent = "";
  }
}

function bindCodeInputs(root=document){
  root.querySelectorAll("input[name='code'],#momentsSignupCode").forEach(input=>{
    input.addEventListener("input",()=>{
      const start = input.selectionStart;
      const before = input.value;
      const formatted = formatMomentCodeDisplay(before);
      input.value = formatted;
      if(start != null){
        const delta = formatted.length - before.length;
        const next = Math.max(0, Math.min(formatted.length, start + delta));
        input.setSelectionRange(next, next);
      }
    });
    input.addEventListener("blur",()=>{
      input.value = formatMomentCodeDisplay(normalizeCode(input.value));
      const hintId = activationTypeHintId(input);
      if(hintId) refreshActivationCodeTypeHint(input.value, document.getElementById(hintId));
    });
  });
}

function lockedMomentType(row){
  return normalizeMomentType(row?.moment_type || row?.event_type || "free");
}

function renderMomentTypeField(state){
  const type = normalizeMomentType(state.type);
  // Clienti: niente tipologia in UI (resta hidden per salvataggio/template).
  // Admin: select per override operativo.
  if(adminMode){
    return `<label>Tipo di momento (admin)
        <select name="moment_type" id="momentTypeSelect">
          ${renderCategorySelect(type)}
        </select>
      </label>`;
  }
  return `<input type="hidden" name="moment_type" id="momentTypeInput" value="${esc(type)}">`;
}

function templateSeedKey(eventId){
  return `moments_template_seed_${eventId}`;
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
  hideBoot();
  auth.hidden = false;
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
  hideBoot();
  auth.hidden = false;
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
    document.getElementById("momentsSignupCode").value = formatMomentCodeDisplay(code);
    setSignupStep(1);
  }
  if(params.get("tab") === "signup") showAuthTab("signup");
}

async function activateCode({ code, title, pin }){
  const cleanCode = normalizeCode(code);
  if(!isValidMomentCode(cleanCode)) throw new Error("Il codice deve contenere 8-32 lettere o numeri (es. M7K2-9XPL-H3WN).");
  const cleanPin = validatePin(pin);
  const publicSlug = cleanCode.toLowerCase();
  const { data,error } = await supabase.rpc("activate_moment_code",{
    p_code:cleanCode,
    p_title:title,
    p_slug:publicSlug,
    p_moment_type:"free",
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
    const allMedia = normalizeMediaList(sections.gallery);
    const galleryVideos = allMedia.filter(item=>item.type === "video");
    const galleryImages = allMedia.filter(item=>item.type === "image");
    sections.gallery.media = galleryImages;
    sections.gallery.images = galleryImages.map(item=>item.url);
    if(!sections.video) sections.video = { ...DEFAULT_SECTIONS.video };
    const videoMedia = migrateVideoSectionMedia(sections.video);
    if(!videoMedia.length && galleryVideos.length){
      sections.video.media = galleryVideos;
      sections.video.video_url = galleryVideos[0].url;
      sections.video.video_title = galleryVideos[0].title || "";
      sections.video.video_description = galleryVideos[0].description || "";
    }else{
      sections.video.media = videoMedia;
      if(videoMedia[0]){
        sections.video.video_url = videoMedia[0].url;
        sections.video.video_title = videoMedia[0].title || sections.video.video_title || "";
        sections.video.video_description = videoMedia[0].description || sections.video.video_description || "";
      }
    }
  }
  if(sections.music){
    sections.music.media = migrateMusicSectionMedia(sections.music);
    if(sections.music.media[0]){
      sections.music.audio_url = sections.music.media[0].url;
      sections.music.audio_title = sections.music.media[0].title || sections.music.audio_title || "";
      sections.music.audio_description = sections.music.media[0].description || sections.music.audio_description || "";
    }
  }
  if(sections.letter_future){
    sections.letter_future.media = migrateLetterMediaSection(sections.letter_future);
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
    heroCut:state.heroCut || "dritto",
    heroFade:state.heroFade !== false,
    fontPair:Object.keys(FONT_PAIRS).includes(state.fontPair) ? state.fontPair : "classic",
    pageDecor:"none",
    show_together_counter:Boolean(state.show_together_counter),
    together_since:state.together_since || "",
    counter_label:state.counter_label || "",
    show_counter_hms:Boolean(state.show_counter_hms),
    sectionOrder:normalizeSectionOrder(state.sectionOrder).filter(key => !isSectionExcluded(key)),
    pinned_sections:Array.isArray(state.pinned_sections)
      ? state.pinned_sections.filter(key => key && !isSectionExcluded(key))
      : [],
    sections
  };
}

function finishSessionBoot(){
  document.body.classList.remove("session-pending");
  if(boot) boot.hidden = true;
}

function hideBoot(){
  finishSessionBoot();
}

function showAuth(message=""){
  finishSessionBoot();
  auth.hidden = false;
  app.hidden = true;
  setStatus(statusNode,message);
}

function renderEditorFailure(error, { reload = true } = {}){
  console.error(error);
  setEditorChromeVisible(false);
  const msg = String(error?.message || error || "Errore imprevisto durante il caricamento dell'editor.");
  detail.innerHTML = `
    <div class="empty-state editor-failure">
      <p class="eyebrow">KhamaKey Moments</p>
      <h2>Editor non disponibile</h2>
      <p>${esc(msg)}</p>
      ${reload ? `<button type="button" class="primary" id="editorFailureReload">Ricarica pagina</button>` : ""}
    </div>`;
  document.getElementById("editorFailureReload")?.addEventListener("click",()=>location.reload());
}

function showAppLoadError(error){
  finishSessionBoot();
  auth.hidden = true;
  app.hidden = false;
  renderEditorFailure(error);
}

function accountDisplayName(user = currentUser){
  const metaName = String(user?.user_metadata?.full_name || "").trim();
  if(metaName) return metaName;
  const email = String(user?.email || "").trim();
  if(!email) return t("account.title");
  return email.split("@")[0] || t("account.title");
}

function showEditorView(){
  appView = "editor";
  app?.classList.remove("account-mode");
  if(accountHub) accountHub.hidden = true;
  if(detail) detail.hidden = false;
  setEditorChromeVisible(Boolean(document.getElementById("momentEditorShell")));
}

function showAccountHub(tab = "products"){
  appView = "account";
  activeAccountTab = tab || "products";
  app?.classList.add("account-mode");
  if(detail) detail.hidden = true;
  if(accountHub) accountHub.hidden = false;
  setEditorChromeVisible(false);
  document.querySelectorAll("#momentsAccountTabs .account-tab").forEach(button=>{
    button.classList.toggle("active", button.dataset.accountTab === activeAccountTab);
  });
  renderAccountPanels();
  const backBtn = document.getElementById("momentsAccountBackToEditor");
  if(backBtn){
    backBtn.hidden = !rows.length;
    if(backBtn.dataset.bound !== "1"){
      backBtn.dataset.bound = "1";
      backBtn.addEventListener("click",async()=>{
        if(!rows.length) return;
        showEditorView();
        if(activeId){
          try{
            await ensureEventPageState(activeId);
            renderDetail(activeId);
          }catch(error){
            showAppLoadError(error);
          }
        }
      });
    }
  }
  if(document.getElementById("momentsAccountTabs")?.dataset.bound !== "1"){
    const tabs = document.getElementById("momentsAccountTabs");
    tabs.dataset.bound = "1";
    tabs.addEventListener("click",event=>{
      const button = event.target.closest("[data-account-tab]");
      if(!button) return;
      activeAccountTab = button.dataset.accountTab || "products";
      tabs.querySelectorAll(".account-tab").forEach(node=>{
        node.classList.toggle("active", node.dataset.accountTab === activeAccountTab);
      });
      renderAccountPanels();
    });
  }
}

function renderAccountPanels(){
  if(!accountPanels) return;
  const name = accountDisplayName(currentUser);
  const email = String(currentUser?.email || "").trim();
  const dateLocale = getUiLocale() === "en" ? "en-GB" : "it-IT";
  const createdAt = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString(dateLocale)
    : "—";
  if(activeAccountTab === "profile"){
    accountPanels.innerHTML = `
      <div class="account-panel-card">
        <h3>${esc(t("account.profile.title"))}</h3>
        <p>${esc(t("account.profile.lead"))}</p>
        <div class="account-profile-grid">
          <div class="account-profile-row"><span>${esc(t("account.profile.name"))}</span><strong>${esc(name)}</strong></div>
          <div class="account-profile-row"><span>${esc(t("account.profile.email"))}</span><strong>${esc(email || "—")}</strong></div>
          <div class="account-profile-row"><span>${esc(t("account.profile.created"))}</span><strong>${esc(createdAt)}</strong></div>
        </div>
        <div style="margin-top:14px">
          <button type="button" class="ghost" id="accountHubLogout">${esc(t("account.profile.logout"))}</button>
        </div>
        <nav class="account-legal-links" aria-label="${esc(t("auth.legal.nav"))}">
          <a href="./moments-privacy.html" target="_blank" rel="noopener">${esc(t("account.profile.privacy"))}</a>
          <a href="./moments-terms.html" target="_blank" rel="noopener">${esc(t("account.profile.terms"))}</a>
        </nav>
      </div>`;
    document.getElementById("accountHubLogout")?.addEventListener("click",()=>{
      document.getElementById("momentsLogout")?.click();
    });
    return;
  }
  if(activeAccountTab === "plan"){
    const ent = normalizeEntitlements(currentEntitlements);
    const planLabel = PLAN_LABELS[ent.plan_key] || ent.plan_name || "Free";
    accountPanels.innerHTML = `
      <div class="account-panel-card">
        <h3>${esc(t("account.plan.title"))}</h3>
        <p>${esc(t("account.plan.lead"))}</p>
        <div class="account-plan-card">
          <strong>Moments ${esc(planLabel)}</strong>
          <p>${esc(t("account.plan.included"))}</p>
          ${renderPlanLimitsList(ent.limits)}
        </div>
      </div>`;
    return;
  }
  if(activeAccountTab === "support"){
    accountPanels.innerHTML = `
      <div class="account-panel-card">
        <h3>${esc(t("account.support.title"))}</h3>
        <p>${esc(t("account.support.lead"))}</p>
        <form class="support-inline-form" id="momentSupportForm">
          <label><span>${esc(t("account.support.subject"))}</span><input name="subject" type="text" placeholder="${esc(t("account.support.subject.ph"))}" required></label>
          <label><span>${esc(t("account.support.priority"))}</span>
            <select name="priority">
              <option value="normal">${esc(t("account.support.priority.normal"))}</option>
              <option value="high">${esc(t("account.support.priority.high"))}</option>
              <option value="urgent">${esc(t("account.support.priority.urgent"))}</option>
              <option value="low">${esc(t("account.support.priority.low"))}</option>
            </select>
          </label>
          <label><span>${esc(t("account.support.details"))}</span><textarea name="description" rows="4" placeholder="${esc(t("account.support.details.ph"))}" required></textarea></label>
          <button type="submit" class="primary">${esc(t("account.support.submit"))}</button>
          <p class="status" id="momentSupportStatus" aria-live="polite"></p>
        </form>
      </div>`;
    const supportForm = document.getElementById("momentSupportForm");
    const row = rows.find(item=>item.id === activeId) || rows[0] || null;
    supportForm?.addEventListener("submit",event=>submitMomentSupportTicket(event, row));
    return;
  }
  accountPanels.innerHTML = `
    <div class="account-panel-card">
      <h3>${esc(t("account.products.title"))}</h3>
      <p>${esc(t("account.products.lead"))}</p>
      <div class="side-head">
        <strong>${esc(t("account.products.linked"))}</strong>
        <span class="objects-count">${rows.length}</span>
      </div>
      <div class="objects-switcher" id="objectsSwitcher">${renderObjectsListHtml()}</div>
    </div>
    <div class="account-panel-card">
      <h3>${esc(rows.length ? t("account.activate.another") : t("account.activate.first"))}</h3>
      <p>${esc(t("account.activate.lead"))}</p>
      ${renderActivationFormHtml("accountActivationForm","accountActivationStatus")}
    </div>`;
  bindObjectSwitcher(accountPanels);
  bindActivationForm(document.getElementById("accountActivationForm"), document.getElementById("accountActivationStatus"));
}

function refreshAccountMenu(){
  const email = String(currentUser?.email || "").trim();
  const name = accountDisplayName(currentUser);
  if(userName) userName.textContent = name;
  if(userEmail) userEmail.textContent = email || t("menu.email_missing");
  if(userAvatar){
    const seed = name || email || "K";
    userAvatar.textContent = seed.charAt(0).toUpperCase();
  }
  if(!userMenuProducts) return;
  if(!rows.length){
    userMenuProducts.innerHTML = `<p class="user-menu-empty">${esc(t("menu.empty_products"))}</p>`;
    return;
  }
  userMenuProducts.innerHTML = rows.map(row=>{
    let title = row?.title || row?.slug || t("menu.page_fallback");
    let typeLabel = "";
    try{
      const state = mergedState(row);
      title = state.title || title;
      typeLabel = TYPE_LABELS[state.type] || state.type || "";
    }catch(_error){
      typeLabel = TYPE_LABELS[normalizeMomentType(row?.moment_type || row?.event_type || "free")] || "";
    }
    const status = row.public_visible ? t("menu.status.published") : t("menu.status.draft");
    const code = row.nfc_code ? formatMomentCodeDisplay(row.nfc_code) : "NFC";
    return `<button type="button" class="user-menu-product ${row.id === activeId ? "active" : ""}" data-menu-object-id="${esc(row.id)}">
      ${esc(title)}
      <span>${esc(code)} · ${esc(typeLabel)} · ${status}</span>
    </button>`;
  }).join("");
  userMenuProducts.querySelectorAll("[data-menu-object-id]").forEach(button=>{
    button.addEventListener("click",async()=>{
      userMenu?.classList.remove("open");
      const nextId = button.dataset.menuObjectId;
      if(!nextId) return;
      if(editorDirty && activeId && nextId !== activeId && !confirm(t("shell.confirm_switch"))) return;
      try{
        await ensureEventPageState(nextId);
        showEditorView();
        renderDetail(nextId);
      }catch(error){
        showAppLoadError(error);
      }
    });
  });
}

async function showApp(user){
  if(!user) return;
  finishSessionBoot();
  currentUser = user;
  auth.hidden = true;
  app.hidden = false;
  refreshAccountMenu();
  ensureMobileNav();
  bindGlobalAppChrome();
  try{
    await loadObjects();
    if(!adminMode) await tryPendingActivation(user);
    warmUploadAuth(supabase);
  }catch(error){
    showAppLoadError(error);
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
      setPreviewFabLabel();
      if(mobilePreviewMode){
        const form = document.getElementById("momentEditorForm");
        if(form) schedulePreviewUpdate(form,{immediate:true,force:true});
      }
    });
  }
  const accountBtn = document.getElementById("momentsMenuAccount");
  if(accountBtn && accountBtn.dataset.bound !== "1"){
    accountBtn.dataset.bound = "1";
    accountBtn.addEventListener("click",()=>{
      userMenu?.classList.remove("open");
      showAccountHub("products");
    });
  }
  const supportBtn = document.getElementById("momentsMenuSupport");
  if(supportBtn && supportBtn.dataset.bound !== "1"){
    supportBtn.dataset.bound = "1";
    supportBtn.addEventListener("click",()=>{
      userMenu?.classList.remove("open");
      showAccountHub("support");
    });
  }
  const planBlock = document.getElementById("momentsMenuPlan");
  if(planBlock && planBlock.dataset.bound !== "1"){
    planBlock.dataset.bound = "1";
    planBlock.style.cursor = "pointer";
    planBlock.title = t("menu.plan_title");
    planBlock.addEventListener("click",()=>{
      userMenu?.classList.remove("open");
      showAccountHub("plan");
    });
  }
}

function localizeFixedNavItems(items){
  const keyById = {
    cover: "nav.cover",
    styling: "nav.colors",
    order: "nav.order",
    overview: "nav.overview",
    privacy: "nav.publish",
    extras: "nav.extras"
  };
  return (items || []).map(item=>{
    const key = keyById[item.id];
    if(!key) return item;
    return { ...item, label: t(key) };
  });
}

function navItemsForGroup(groupId, formNode){
  if(groupId === "design") return localizeFixedNavItems(designNavItems());
  if(groupId === "page" || groupId === "account") return localizeFixedNavItems(pageNavItems());
  const enabled = enabledMapFromForm(formNode);
  const type = currentMomentType;
  return contentNavItems(sectionOrder, type, pinnedExtraSections, enabled).map(item=>{
    if(item.id === "extras") return { ...item, label: t("nav.extras") };
    if(item.id === "counter") return { ...item, label: localizedCounterLabel(type) };
    if(String(item.id || "").startsWith("section-")){
      const key = item.id.slice(8);
      return { ...item, label: localizedSectionNavLabel(type, key) };
    }
    return item;
  });
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
  if(key === "rsvp") syncRsvpWhatsappWarn(formNode);
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
  return localizedSectionNavLabel(type, key);
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
        button.innerHTML = `<span class="editor-nav-icon">⏱</span>${esc(localizedCounterLabel(type))}`;
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
      if(title) title.textContent = custom || localizedSectionLabel(type, key);
      if(sub) sub.textContent = localizedSectionSubtitle(type, key);
    }
  });

  const fixedPanelMap = {
    overview: EDITOR_PANELS.overview,
    styling: EDITOR_PANELS.styling,
    cover: EDITOR_PANELS.cover,
    order: EDITOR_PANELS.order,
    privacy: EDITOR_PANELS.privacy
  };
  for(const [panelId, panelDef] of Object.entries(fixedPanelMap)){
    const panel = document.querySelector(`#momentEditorForm [data-editor-panel="${panelId}"]`);
    if(!panel) continue;
    const title = panel.querySelector(".section-title");
    const sub = panel.querySelector(".section-sub");
    if(title) title.textContent = editorPanelTitle(panelDef);
    if(sub) sub.textContent = editorPanelSubtitle(panelDef);
  }
  const counterPanel = document.querySelector(`#momentEditorForm [data-editor-panel="counter"]`);
  if(counterPanel){
    const title = counterPanel.querySelector(".section-title");
    const sub = counterPanel.querySelector(".section-sub");
    if(title) title.textContent = localizedCounterLabel(type);
    if(sub) sub.textContent = editorPanelSubtitle(EDITOR_PANELS.counter);
  }
  const extrasPanel = document.querySelector(`#momentEditorForm [data-editor-panel="extras"]`);
  if(extrasPanel){
    const title = extrasPanel.querySelector(".section-title");
    const sub = extrasPanel.querySelector(".section-sub");
    if(title) title.textContent = t("sec.extras_title") || t("nav.extras");
    if(sub) sub.textContent = t("sec.extras_sub");
  }

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
      button.innerHTML = `<span class="grp-icon">${group.icon}</span>${esc(t(`nav.group.${group.id}`))}`;
      button.addEventListener("click",()=>setNavGroup(group.id));
      grpNav.appendChild(button);
    });
  }else{
    NAV_GROUPS.forEach(group=>{
      const button = grpNav.querySelector(`[data-nav-group="${group.id}"]`);
      if(button) button.innerHTML = `<span class="grp-icon">${group.icon}</span>${esc(t(`nav.group.${group.id}`))}`;
    });
  }
  renderSubNav(activeNavGroup);
}

function setNavGroup(groupId){
  activeNavGroup = groupId;
  document.querySelectorAll("#momentsGrpNav .grp-btn").forEach(button=>{
    button.classList.toggle("active",button.dataset.navGroup === groupId);
  });
  if((groupId === "page" || groupId === "account") && !["overview","privacy"].includes(activeEditorPanel)){
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
        setPreviewFabLabel();
      }
      window.scrollTo({top:0,behavior:"smooth"});
    });
  });
}

function syncMobileNav(panelId){
  const groupForPanel = panelId === "counter" || panelId.startsWith("section-") || panelId === "extras" ? "content"
    : ["cover","styling","order"].includes(panelId) ? "design"
    : ["overview","privacy"].includes(panelId) ? "page"
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
  const stored = readPendingMomentActivation();
  const metaCode = normalizeCode(user?.user_metadata?.pending_moment_code || "");
  const pendingCode = normalizeCode(stored?.code || metaCode);
  if(!pendingCode) return;
  if(rows.some(row=>normalizeCode(row.nfc_code) === pendingCode)){
    clearPendingMomentActivation();
    return;
  }
  const title = String(stored?.title || user?.user_metadata?.pending_moment_title || "").trim();
  const pin = String(stored?.pin || "").trim();
  if(title && pin){
    try{
      const item = await activateCode({ code:pendingCode, title, pin });
      clearPendingMomentActivation();
      activeId = item.event_id || "";
      rememberPin(activeId, pin);
      await loadObjects({ render:true });
      if(activeId) showPinSuccessBanner(activeId, pin, title);
      return;
    }catch(error){
      console.error(error);
      showAccountHub("products");
      const status = document.getElementById("accountActivationStatus");
      if(status) setStatus(status, error.message || t("auth.msg.activate_fail"),"error");
      const codeInput = document.querySelector("#accountActivationForm [name='code']");
      if(codeInput) codeInput.value = formatMomentCodeDisplay(pendingCode);
      return;
    }
  }
  if(activeId){
    showEditorView();
    renderDetail(activeId);
  }else{
    showAccountHub("products");
    const codeInput = document.querySelector("#accountActivationForm [name='code']");
    if(codeInput) codeInput.value = formatMomentCodeDisplay(pendingCode);
    const status = document.getElementById("accountActivationStatus");
    if(status) setStatus(status, t("auth.msg.pending_code", { code: formatMomentCodeDisplay(pendingCode) }));
  }
}

function renderObjectsListHtml(){
  if(!rows.length) return `<p class="empty-inline">${esc(t("account.products.empty"))}</p>`;
  return rows.map(row=>{
    let state;
    try{
      state = mergedState(row);
    }catch(error){
      console.warn("mergedState fallito per pagina", row?.id, error);
      state = { title:row?.title || row?.slug || "Pagina", type:normalizeMomentType(row?.moment_type || row?.event_type || "free") };
    }
    const type = TYPE_LABELS[state.type] || state.type;
    return `<button class="object-pick ${row.id === activeId ? "active" : ""}" type="button" data-object-id="${esc(row.id)}">
      ${esc(state.title || row.slug)}
      <span>${esc(row.nfc_code || "NFC")} · ${row.public_visible ? t("menu.status.published") : t("menu.status.draft")}</span>
      <span class="type-pill">${esc(type)}</span>
    </button>`;
  }).join("");
}

function renderActivationFormHtml(formId = "editorActivationForm",statusId = "editorActivationStatus",prefillCode = ""){
  return `<form id="${formId}" class="activation-inline-form">
    <label><span>${esc(t("activate.code"))}</span><input name="code" autocomplete="off" placeholder="${esc(t("activate.code.ph"))}" value="${esc(formatMomentCodeDisplay(prefillCode))}" required></label>
    <p class="field-hint activation-code-type" id="editorActivationTypeHint" data-activation-type-hint hidden></p>
    <label><span>${esc(t("activate.page"))}</span><input name="title" placeholder="${esc(t("activate.page.ph"))}" required></label>
    <label><span>${esc(t("activate.pin"))}</span><input name="access_pin" inputmode="numeric" autocomplete="new-password" placeholder="${esc(t("activate.pin.ph"))}" minlength="4" required></label>
    <button type="submit" class="primary">${esc(t("activate.submit"))}</button>
  </form>
  <p class="status" id="${statusId}"></p>`;
}

function planLimitsSummaryLinesI18n(planLimits){
  const limits = normalizePlanLimits(planLimits);
  return [
    t("plan.limit.storage", { n: limits.storage_mb }),
    t("plan.limit.gallery", { n: limits.gallery_images }),
    t("plan.limit.video", { n: limits.video_clips }),
    t("plan.limit.audio", { n: limits.music_audio }),
    t("plan.limit.letter", {
      images: limits.letter_images,
      videos: limits.letter_videos,
      audio: limits.letter_audio,
      pdfs: limits.letter_pdfs
    }),
    t("plan.limit.files", { img: limits.max_image_mb, vid: limits.max_video_mb })
  ];
}

function renderPlanLimitsList(limits){
  const lines = planLimitsSummaryLinesI18n(limits);
  return `<ul class="plan-limits-list">${lines.map(line=>`<li>${esc(line)}</li>`).join("")}</ul>`;
}

function renderPlanStorageCard(entitlements = currentEntitlements){
  const ent = normalizeEntitlements(entitlements);
  const pct = storageUsagePercent(ent);
  const maxBytes = storageBytesLimit(ent.limits);
  const planLabel = PLAN_LABELS[ent.plan_key] || ent.plan_name || "Free";
  const planHint = ent.plan_key === "moments_free"
    ? "Limiti del piano Free incluso con il tuo oggetto NFC. I piani a pagamento arriveranno più avanti."
    : "Limiti attivi per questo Moment.";
  return `<div class="plan-storage-card" id="momentPlanStorageCard" data-plan-key="${esc(ent.plan_key)}">
    <div class="plan-storage-head">
      <div>
        <p class="eyebrow">Piano Moments</p>
        <strong>${esc(planLabel)}</strong>
      </div>
      <span class="plan-storage-usage">${esc(formatBytes(ent.bytes_used))} / ${esc(formatBytes(maxBytes))}</span>
    </div>
    <div class="plan-storage-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    <p class="field-hint plan-storage-hint">${esc(planHint)}</p>
    ${renderPlanLimitsList(ent.limits)}
  </div>`;
}

function renderOverviewPanel(row, state, publicUrl){
  return `<div class="editor-panel ${activeEditorPanel === "overview" ? "active" : ""}" data-editor-panel="overview">
    ${renderSectionHeader(editorPanelTitle(EDITOR_PANELS.overview),editorPanelSubtitle(EDITOR_PANELS.overview))}
    ${renderPlanStorageCard(currentEntitlements)}
    ${renderMomentDashboardShell({ publicUrl, published:row.public_visible, slug:row.slug })}
  </div>`;
}

async function refreshMomentEntitlements(eventId){
  if(!eventId) return currentEntitlements;
  try{
    currentEntitlements = await fetchMomentEntitlements(supabase, eventId);
  }catch(error){
    console.warn("Entitlements Moments non disponibili", error);
    currentEntitlements = emptyEntitlements(eventId);
  }
  setActivePlanLimits(currentEntitlements.limits);
  const card = document.getElementById("momentPlanStorageCard");
  if(card) card.outerHTML = renderPlanStorageCard(currentEntitlements);
  const form = document.getElementById("momentEditorForm");
  if(form){
    for(const key of ["gallery","video","music","letter_future"]){
      if(form.querySelector(`#galleryOrganized_${key}`)) renderGalleryGrid(form, key);
    }
  }
  return currentEntitlements;
}

function renderObjectsPanel(){
  // Legacy stub: prodotti/account vivono in #momentsAccountHub
  return "";
}

async function submitMomentSupportTicket(event,row){
  event.preventDefault();
  const status = document.getElementById("momentSupportStatus");
  if(!currentUser) return setStatus(status,t("account.support.login"),"error");
  const form = event.currentTarget;
  const subject = String(form.elements.subject.value || "").trim();
  const description = String(form.elements.description.value || "").trim();
  const priority = form.elements.priority.value || "normal";
  if(!subject || !description) return setStatus(status,t("account.support.fill"),"error");
  setStatus(status,t("account.support.sending"));
  const detail = [
    `Cliente: ${currentUser.email || ""}`,
    description,
    row?.slug ? `Pagina Moments: ${row.slug}` : "",
    row?.id ? `ID evento: ${row.id}` : ""
  ].filter(Boolean).join("\n\n");
  const { error } = await supabase.from("platform_support_tickets").insert({
    profile_id:currentUser.id,
    subject,
    priority,
    description:detail,
    status:"open",
    source:"moments_editor"
  });
  if(error){
    console.error(error);
    setStatus(status,error.message || t("account.support.fail"),"error");
    return;
  }
  try{
    const { data:sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if(token){
      await fetch(`${WORKER_BASE_URL}/api/moment/support-notify`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`
        },
        body:JSON.stringify({ subject, description:detail, priority })
      });
    }
  }catch(notifyError){
    console.warn("Avviso email supporto non inviato", notifyError);
  }
  form.reset();
  setStatus(status,t("account.support.ok"),"ok");
}

function renderEmptyState(message = "",prefillCode = ""){
  setEditorChromeVisible(false);
  detail.innerHTML = `
    <div class="empty-state">
      <p class="eyebrow">KhamaKey Moments</p>
      <h2>${esc(t("activate.empty.title"))}</h2>
      <p>${esc(message || t("activate.empty.lead"))}</p>
    </div>
    <div class="editor-card" style="margin-top:16px;padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:14px">
      ${renderActivationFormHtml("emptyActivationForm","emptyActivationStatus",prefillCode)}
    </div>`;
  bindActivationForm(document.getElementById("emptyActivationForm"),document.getElementById("emptyActivationStatus"));
}

async function ensureEventPageState(eventId){
  const row = rows.find(item=>item.id === eventId);
  if(!row) return null;
  if(row.page_state && typeof row.page_state === "object") return row;
  const { data,error } = await supabase
    .from("moment_events")
    .select("page_state,description,title,moment_type,event_type,pin_enabled,public_visible,nfc_code")
    .eq("id",eventId)
    .maybeSingle();
  if(error) throw error;
  if(data) Object.assign(row, data);
  if(!row.page_state || typeof row.page_state !== "object") row.page_state = {};
  return row;
}

async function loadObjects({ render = true } = {}){
  let query = supabase
    .from("moment_events")
    .select("id,title,slug,event_type,moment_type,status,description,nfc_code,pin_enabled,public_visible,owner_email,created_at")
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
  const prevStates = new Map(rows.map(row=>[row.id, row.page_state]));
  rows = (data || []).map(row=>({
    ...row,
    page_state: prevStates.get(row.id)
  }));
  if(adminMode && rows.length){
    const banner = document.getElementById("adminModeBanner");
    if(banner){
      banner.hidden = false;
      banner.textContent = `Modalità admin — stai modificando l'oggetto di ${rows[0].owner_email || "cliente"}. Le modifiche sono visibili al cliente.`;
    }
  }
  if(rows.length && !rows.some(row=>row.id === activeId)) activeId = rows[0].id;
  refreshAccountMenu();
  if(!render){
    if(appView === "account") renderAccountPanels();
    else refreshObjectsSwitcher();
    return;
  }
  if(activeId){
    try{
      await ensureEventPageState(activeId);
      showEditorView();
      renderDetail(activeId);
    }catch(error){
      showAppLoadError(error);
    }
  }else{
    showAccountHub("products");
  }
}

function refreshObjectsSwitcher(){
  const node = document.getElementById("objectsSwitcher");
  if(node) node.innerHTML = renderObjectsListHtml();
  document.querySelectorAll(".objects-count").forEach(node=>{ node.textContent = String(rows.length); });
  bindObjectSwitcher(accountPanels || detail);
}

function bindObjectSwitcher(root){
  root?.querySelectorAll("[data-object-id]").forEach(button=>{
    if(button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click",async()=>{
      const nextId = button.dataset.objectId;
      if(!nextId) return;
      if(nextId === activeId && appView === "editor") return;
      if(editorDirty && activeId && nextId !== activeId && !confirm(t("shell.confirm_switch"))) return;
      activeEditorPanel = "cover";
      try{
        await ensureEventPageState(nextId);
        showEditorView();
        renderDetail(nextId);
      }catch(error){
        console.error(error);
        alert(error.message || "Impossibile aprire la pagina.");
      }
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
    if(!/^[A-Z0-9]{8,32}$/.test(code)) return setStatus(statusEl,t("auth.msg.code_bad"),"error");
    if(!title) return setStatus(statusEl,t("auth.msg.page_title_required"),"error");
    try{ validatePin(pin); }catch(error){ return setStatus(statusEl,error.message,"error"); }
    setStatus(statusEl,t("auth.msg.linking"));
    try{
      const item = await activateCode({code,title,pin});
      clearPendingMomentActivation();
      activeId = item.event_id || activeId;
      rememberPin(activeId,pin);
      form.reset();
      setStatus(statusEl,t("auth.msg.linked_ok"),"ok");
      activeEditorPanel = "cover";
      await loadObjects();
      if(activeId) showPinSuccessBanner(activeId,pin,title);
    }catch(error){
      console.error(error);
      setStatus(statusEl,error.message || t("auth.msg.link_fail"),"error");
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

function localizedSectionFillGuide(type, key){
  const base = sectionFillGuide(key);
  const raw = sectionFillGuideForType(type, key);
  if(raw === base) return localizeFieldPhrase(base);
  const sep = " — ";
  if(raw.startsWith(base + sep)){
    const ctx = raw.slice(base.length + sep.length);
    return `${localizeFieldPhrase(base)}${sep}${localizeSectionSubtitle(ctx)}`;
  }
  return localizeFieldPhrase(raw);
}

function renderSectionPanelToggle(key,enabled){
  const icon = SECTION_ICONS[key] || "•";
  const titleIt = enabled ? "Visibile in pagina" : "Non visibile";
  const hintIt = enabled ? "I visitatori la vedono" : "Tocca per mostrarla";
  return `<div class="section-switch ${enabled ? "is-on" : ""}" data-section-toggle="${esc(key)}" role="switch" aria-checked="${enabled ? "true" : "false"}" tabindex="0">
    ${renderSectionEnabledInput(key,enabled)}
    <span class="section-switch-label">
      <span class="section-switch-icon">${icon}</span>
      <span class="section-switch-copy">
        <strong data-lf="${esc(titleIt)}">${esc(localizeFieldPhrase(titleIt))}</strong>
        <small data-lf="${esc(hintIt)}">${esc(localizeFieldPhrase(hintIt))}</small>
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
    if(strong){
      const it = enabled ? "Visibile in pagina" : "Non visibile";
      strong.setAttribute("data-lf", it);
      strong.textContent = localizeFieldPhrase(it);
    }
    if(small){
      const it = enabled ? "I visitatori la vedono" : "Tocca per mostrarla";
      small.setAttribute("data-lf", it);
      small.textContent = localizeFieldPhrase(it);
    }
  });
  const stack = formNode.querySelector(`[data-section-stack="${key}"]`);
  if(stack) stack.classList.toggle("is-muted",!enabled);
}

function refreshSectionOrderList(formNode){
  const listNode = document.getElementById("sectionOrderList");
  if(!listNode) return;
  const keys = enabledSectionKeysFromForm(formNode);
  if(!keys.length){
    listNode.innerHTML = `<p class="section-order-empty">${lfSpan("Nessuna sezione attiva. Attiva almeno una sezione dal menu Contenuti.")}</p>`;
    return;
  }
  listNode.innerHTML = keys.map((key,idx)=>renderSectionOrderItem(key,idx, currentTypeFromForm(formNode), formNode)).join("");
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
      }else{
        // Optional aggiunte da «Altre sezioni»: togli pin così tornano nella lista extra
        const kit = editorKitForType(currentTypeFromForm(formNode));
        if(kit.optional.includes(key) && pinnedExtraSections.includes(key)){
          pinnedExtraSections = pinnedExtraSections.filter(item => item !== key);
          syncPinnedSectionsInput(formNode);
          markEditorDirty(formNode);
        }
      }
      if(key === "rsvp") syncRsvpWhatsappWarn(formNode);
      schedulePreviewUpdate(formNode,{immediate:true,force:true});
      syncEditorKitUi(formNode);
    });
  });
}

function formHasMeaningfulContent(formNode){
  if(!formNode) return false;
  const state = readFormState(formNode);
  if(String(state.cover_url || "").trim()) return true;
  if(String(state.subtitle || "").trim() || String(state.description || "").trim() || String(state.pill || "").trim()) return true;
  if(String(state.profile_photo || "").trim()) return true;
  if(state.show_together_counter || String(state.together_since || "").trim()) return true;
  for(const [key,section] of Object.entries(state.sections || {})){
    if(sectionHasContent(key, section)) return true;
  }
  return false;
}

function confirmMomentTypeChange(nextType, previousType){
  const nextLabel = TYPE_LABELS[nextType] || nextType;
  const prevLabel = TYPE_LABELS[previousType] || previousType;
  return window.confirm(
    `Stai passando da «${prevLabel}» a «${nextLabel}».\n\n` +
    "Cambiare categoria aggiorna il design suggerito. I testi che hai già scritto restano finché non tocchi «Prepara tutto per me».\n\n" +
    "Se usi quel pulsante, testi, sezioni e impostazioni verranno sostituiti in modo irreversibile.\n\n" +
    "Vuoi cambiare categoria?"
  );
}

function confirmApplyMomentTemplate(type){
  const label = TYPE_LABELS[type] || type;
  return window.confirm(
    `«Prepara tutto per me» sostituirà testi, sezioni attive, ordine e colori con il modello «${label}».\n\n` +
    "I contenuti attuali andranno persi se poi salvi la pagina. Operazione irreversibile.\n\n" +
    "Continuare?"
  );
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
  schedulePreviewUpdate(formNode,{immediate:true,force:true});
  promptSaveReminder(t("save.reminder_template"));
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
      <span class="editor-nav-icon">⏱</span>${esc(localizedCounterLabel(momentType))}
    </button>` : "";
  const extrasBtn = showExtras ? `
    <button type="button" class="editor-nav-item ${activePanel === "extras" ? "active" : ""}" data-editor-panel="extras">
      <span class="editor-nav-icon">➕</span>${esc(t("nav.extras"))}
    </button>` : "";
  const contentItems = `${counterBtn}
    ${navKeys.map(key=>`
    <button type="button" class="editor-nav-item ${activePanel === `section-${key}` ? "active" : ""}" data-editor-panel="section-${esc(key)}" data-section-nav-key="${esc(key)}">
      <span class="editor-nav-icon">${esc(SECTION_ICONS[key] || "•")}</span>${esc(localizedSectionLabel(momentType, key))}
    </button>`).join("")}${extrasBtn}`;
  return `<nav class="editor-sidebar" aria-label="${esc(t("nav.aria.sidebar"))}">
    <div class="editor-sidebar-group">${esc(t("nav.sidebar.page"))}</div>
    <button type="button" class="editor-nav-item ${activePanel === "overview" ? "active" : ""}" data-editor-panel="overview">
      <span class="editor-nav-icon">📊</span>${esc(t("nav.overview"))}
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "privacy" ? "active" : ""}" data-editor-panel="privacy">
      <span class="editor-nav-icon">🔒</span>${esc(t("nav.publish"))}
    </button>
    <div class="editor-sidebar-group">${esc(t("nav.sidebar.design"))}</div>
    <button type="button" class="editor-nav-item ${activePanel === "cover" ? "active" : ""}" data-editor-panel="cover">
      <span class="editor-nav-icon">✦</span>${esc(t("nav.cover"))}
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "styling" ? "active" : ""}" data-editor-panel="styling">
      <span class="editor-nav-icon">◑</span>${esc(t("nav.colors"))}
    </button>
    <button type="button" class="editor-nav-item ${activePanel === "order" ? "active" : ""}" data-editor-panel="order">
      <span class="editor-nav-icon">☰</span>${esc(t("nav.order_long"))}
    </button>
    <div class="editor-sidebar-group">${esc(t("nav.sidebar.content"))}</div>
    ${contentItems}
  </nav>`;
}

function renderSectionHeader(title,subtitle){
  return `<div class="section-header"><div class="section-title">${esc(title)}</div><div class="section-sub">${esc(subtitle)}</div></div>`;
}

function readDesignFields(formNode){
  return {
    colorPalette: canonicalizePalette(formNode.querySelector("#colorPaletteInput")?.value || "verde"),
    themeVariant: formNode.querySelector('[name="theme_variant"]')?.value || "chiaro",
    fontPair: formNode.querySelector('[name="font_pair"]')?.value || "classic",
    heroStyle: formNode.querySelector('[name="hero_style"]')?.value || "classico",
    heroCut: formNode.querySelector('[name="hero_cut"]')?.value || "dritto",
    heroFade: formNode.querySelector('[name="hero_fade"]')?.value !== "off"
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
  stylingPanel.querySelectorAll(".look-card").forEach(button=>{
    button.addEventListener("click",()=>applyPageLook(formNode, button.dataset.look || "classic"));
  });
  syncLookCards(formNode, formNode.querySelector("#pageLookInput")?.value || currentLook);
}

function applySuggestedLookForType(formNode, type, { preview = true } = {}){
  refreshDesignPickers(formNode, type);
  const suggestedLook = suggestLookForMomentType(normalizeMomentType(type));
  if(suggestedLook && PAGE_LOOKS[suggestedLook]) applyPageLook(formNode, suggestedLook, { preview });
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
  // Lo zoom copertina è indipendente dallo stile pagina: non resettarlo al cambio look.
  void formNode;
}

function syncPaletteButtons(formNode, palette){
  const stylingPanel = formNode.querySelector('[data-editor-panel="styling"]');
  if(!stylingPanel) return;
  const active = canonicalizePalette(palette);
  stylingPanel.querySelectorAll(".palette-btn").forEach(button=>{
    button.classList.toggle("active", button.dataset.palette === active);
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
    const label = localizeFieldPhrase(look.label);
    const hint = localizeFieldPhrase(look.hint);
    return `<button type="button" class="look-card ${currentLook === id ? "active" : ""} ${isSuggested ? "look-suggested" : ""}" data-look="${esc(id)}" aria-pressed="${currentLook === id ? "true" : "false"}">
      <span class="look-card-preview" style="--lk-go:${esc(colors.go)};--lk-g2:${esc(colors.g2)};--lk-hero:${esc(colors.hero)};--lk-ro:${esc(colors.ro)};--lk-bl:${esc(colors.bl)};--lk-card:${esc(colors.card || colors.bl2)};--lk-in:${esc(colors.in)}"></span>
      <span class="look-card-emoji" aria-hidden="true">${look.emoji}</span>
      <strong><span data-lf="${esc(look.label)}">${esc(label)}</span>${isSuggested ? ` · <span data-lf="consigliato">${esc(localizeFieldPhrase("consigliato"))}</span>` : ""}</strong>
      <small data-lf="${esc(look.hint)}">${esc(hint)}</small>
    </button>`;
  }).join("")}</div>
  <input type="hidden" name="page_look" id="pageLookInput" value="${esc(currentLook)}">`;
}

function renderPalettePicker(current){
  const active = canonicalizePalette(current);
  const bgHintIt = "sfondo pagina";
  const bgHint = localizeFieldPhrase(bgHintIt);
  return `<div class="palette-row">${PALETTE_PICKER_ORDER.map(key=>{
    const c = COLOR_PALETTES[key];
    const nameIt = PALETTE_LABELS[key] || key;
    const name = localizeFieldPhrase(nameIt);
    const title = `${name} — ${bgHint}`;
    return `<button type="button" class="palette-btn ${active === key ? "active" : ""}" data-palette="${esc(key)}" title="${esc(title)}" data-lf-title-name="${esc(nameIt)}" data-lf-title-hint="${esc(bgHintIt)}"><span style="background:${c.bl}"></span></button>`;
  }).join("")}</div><input type="hidden" name="color_palette" id="colorPaletteInput" value="${esc(active)}">`;
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

  stylingPanel.querySelectorAll("[data-suggest-look]").forEach(button=>{
    button.addEventListener("click",()=>{
      applyPageLook(formNode, button.dataset.suggestLook || "classic");
    });
  });

  stylingPanel.querySelectorAll(".palette-btn").forEach(button=>{
    button.addEventListener("click",()=>{
      const key = canonicalizePalette(button.dataset.palette || "verde");
      const input = formNode.querySelector("#colorPaletteInput");
      if(input) input.value = key;
      const variantSelect = formNode.querySelector('[name="theme_variant"]');
      // Solo nero/antracite impostano «scuro»; rosso/verde/ecc. restano sfondo colorato
      if(variantSelect){
        if(DARK_PAGE_PALETTES.has(key)) variantSelect.value = "scuro";
        else if(variantSelect.value === "scuro") variantSelect.value = "chiaro";
      }
      syncPaletteButtons(formNode, key);
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
  const typeLabel = TYPE_LABELS[momentType] || localizeFieldPhrase("questa pagina");
  return `<p class="design-suggest">💡 ${lfSpan("Per")} <strong>${esc(typeLabel)}</strong> ${lfSpan("prova")} ${look.emoji} <button type="button" class="design-suggest-btn" data-suggest-look="${esc(suggested)}" data-lf="${esc(look.label)}">${esc(localizeFieldPhrase(look.label))}</button></p>`;
}

function renderDesignPanel(state){
  const palette = canonicalizePalette(state.colorPalette || legacyThemeToPalette(state.theme));
  const variant = state.themeVariant || "chiaro";
  const colors = resolvePalette(palette, variant);
  const fontPair = state.fontPair || "classic";
  const currentLook = findLookForDesign({
    colorPalette: palette,
    themeVariant: variant,
    fontPair,
    heroStyle: state.heroStyle || "classico"
  });
  const typeLabel = TYPE_LABELS[state.type] || localizeFieldPhrase("questa categoria");
  return `<div class="editor-panel ${activeEditorPanel === "styling" ? "active" : ""}" data-editor-panel="styling">
    ${renderSectionHeader(editorPanelTitle(EDITOR_PANELS.styling),editorPanelSubtitle(EDITOR_PANELS.styling))}
    <div class="editor-card">
      <p class="ecard-title">${lfSpan("Scegli lo stile")}</p>
      <p class="design-intro">${lfSpan("Stili per")} <strong>${esc(typeLabel)}</strong>. ${lfSpan("Il colore scelto è lo sfondo della pagina; i riquadri restano bianchi con testo nero.")}</p>
      ${renderDesignSuggestBanner(state.type, currentLook)}
      <div class="look-picker-host">${renderLookPicker(currentLook, state.type)}</div>
    </div>
    <div class="editor-card">
      <p class="ecard-title">${lfSpan("Ecco come sarà")}</p>
      <div class="design-swatch" style="--sw-bl:${esc(colors.bl)};--sw-go:${esc(colors.go)};--sw-g2:${esc(colors.g2)};--sw-ro:${esc(colors.ro)};--sw-in:${esc(colors.in)};--sw-hero:${esc(colors.hero)}">
        <div class="design-swatch-hero"><span>${lfSpan("Il titolo della tua pagina")}</span></div>
        <div class="design-swatch-body"><span>${lfSpan("Sfondo")}</span><span>${lfSpan("Accenti")}</span></div>
      </div>
    </div>
    <details class="design-advanced editor-card">
      <summary>${lfSpan("Vuoi cambiare qualcosa in più? (facoltativo)")}</summary>
      <label>${lfSpan("Colore di sfondo")}
        ${renderPalettePicker(palette)}
      </label>
      <p class="field-hint">${lfSpan("Ogni cerchio è uno sfondo diverso (incluso il rosso). Nero e antracite = pagina scura.")}</p>
      <label>${lfSpan("Atmosfera")}
        <select name="theme_variant">
          ${Object.entries(VARIANT_LABELS).map(([value,label])=>option(value,label,variant)).join("")}
        </select>
      </label>
      <p class="field-hint">${lfSpan("Chiaro · Caldo (sfondo più intenso) · Scuro (pagina di sera)")}</p>
      <label>${lfSpan("Stile scritte")}
        <select name="font_pair">
          ${Object.entries(FONT_PAIRS).map(([value,meta])=>option(value,meta.label,fontPair)).join("")}
        </select>
      </label>
      <label>${lfSpan("Copertina in alto")}
        <select name="hero_style">
          ${Object.entries(HERO_STYLES).map(([value,label])=>option(value,label,state.heroStyle || "classico")).join("")}
        </select>
      </label>
      <label>${lfSpan("Raccordo fondo copertina")}
        <select name="hero_cut">
          ${[
            ["dritto", "Dritto classico"],
            ["divider", "Divisore con icona"],
            ["arco", "Taglio ad arco"],
            ["diagonale", "Taglio diagonale"]
          ].map(([value,label])=>option(value,label,state.heroCut || "dritto")).join("")}
        </select>
      </label>
      <label>${lfSpan("Sfumatura sotto la foto")}
        <select name="hero_fade">
          ${[
            ["on", "Attiva (colore pagina)"],
            ["off", "Spenta (taglio netto)"]
          ].map(([value,label])=>option(value,label,state.heroFade === false ? "off" : "on")).join("")}
        </select>
      </label>
      <p class="field-hint">${lfSpan("La sfumatura fonde la foto con lo sfondo della pagina. Puoi spegnerla per un distacco netto.")}</p>
    </details>
  </div>`;
}

function renderCoverPanel(state){
  return `<div class="editor-panel ${activeEditorPanel === "cover" ? "active" : ""}" data-editor-panel="cover">
    ${renderSectionHeader(editorPanelTitle(EDITOR_PANELS.cover),editorPanelSubtitle(EDITOR_PANELS.cover))}
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> ${lfSpan("Di cosa parla?")}</p>
      <label>${lfSpan("Titolo della pagina")}<input name="title" value="${esc(state.title)}" required placeholder="${esc(localizeFieldPhrase("Es. Il nostro anniversario"))}" data-lf-placeholder="Es. Il nostro anniversario"></label>
      ${renderMomentTypeField(state)}
      <p class="category-change-warning">⚠️ <strong>${lfSpan("Attenzione:")}</strong> ${lfSpan("«Prepara tutto per me» sostituisce testi, sezioni e colori — operazione irreversibile dopo il salvataggio.")}</p>
      <button type="button" class="primary smart-action-btn" id="applyMomentTemplate">✨ ${lfSpan("Prepara tutto per me")}</button>
      <p class="field-hint">${lfSpan("Ripristina il modello della tua categoria con testi e sezioni suggeriti. I contenuti attuali verranno sostituiti.")}</p>
    </div>
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">2</span> ${lfSpan("La foto di copertina")}</p>
      <div class="cover-preview-wrap">
        <input type="hidden" name="cover_url" id="coverUrlInput" value="${esc(state.cover_url)}">
        <div class="cover-upload-actions">
          <input type="file" id="coverFileInput" accept="${IMAGE_ACCEPT}" hidden>
          <button type="button" class="primary upload-trigger" data-upload-target="cover">📷 ${lfSpan("Carica foto copertina")}</button>
        </div>
        <p class="field-hint" id="coverUploadStatus"></p>
        <div id="coverFramerSlot">${renderCoverFramer(state)}</div>
      </div>
        <details class="design-advanced cover-extra">
        <summary>${lfSpan("Altri testi sulla copertina (facoltativo)")}</summary>
        <label>${lfSpan("Etichetta sopra il titolo")}<input name="pill" value="${esc(state.pill)}" placeholder="${esc(localizeFieldPhrase("Es. Amore · Un mondo tutto nostro"))}" data-lf-placeholder="Es. Amore · Un mondo tutto nostro"></label>
        <label>${lfSpan("Frase sotto il titolo")}<input name="subtitle" value="${esc(state.subtitle)}" placeholder="${esc(localizeFieldPhrase("Es. Per sempre insieme"))}" data-lf-placeholder="Es. Per sempre insieme"></label>
        <label>${lfSpan("Descrizione breve")}<textarea name="page_description" placeholder="${esc(localizeFieldPhrase("Breve frase per chi apre la pagina — non incollare link o indirizzi tecnici"))}" data-lf-placeholder="Breve frase per chi apre la pagina — non incollare link o indirizzi tecnici">${esc(state.description)}</textarea></label>
      </details>
      <p class="field-hint">${lfSpan("I colori si scelgono in Design → Colori — un tap e la pagina cambia look.")}</p>
    </div>
  </div>`;
}

function renderCounterPanel(state){
  if(!showCounterForType(state.type)) return "";
  const counterTitle = localizedCounterLabel(state.type);
  const onLabel = "Contatore attivo";
  const offLabel = "Contatore spento";
  const onHint = "Compare sotto la copertina";
  const offHint = "Tocca per mostrarlo";
  return `<div class="editor-panel ${activeEditorPanel === "counter" ? "active" : ""}" data-editor-panel="counter">
    ${renderSectionHeader(counterTitle,editorPanelSubtitle(EDITOR_PANELS.counter))}
    <div class="section-switch ${state.show_together_counter ? "is-on" : ""}" data-counter-switch="main" role="switch" aria-checked="${state.show_together_counter ? "true" : "false"}" tabindex="0">
      <span class="section-switch-label">
        <span class="section-switch-icon">⏱</span>
        <span class="section-switch-copy">
          <strong data-lf="${state.show_together_counter ? onLabel : offLabel}">${esc(localizeFieldPhrase(state.show_together_counter ? onLabel : offLabel))}</strong>
          <small data-lf="${state.show_together_counter ? onHint : offHint}">${esc(localizeFieldPhrase(state.show_together_counter ? onHint : offHint))}</small>
        </span>
      </span>
      <span class="section-switch-track" aria-hidden="true"><i></i></span>
    </div>
    <input type="checkbox" name="show_together_counter" ${state.show_together_counter ? "checked" : ""} hidden id="showTogetherCounterInput">
    <div class="section-editor-stack ${state.show_together_counter ? "" : "is-muted"}">
      <div class="editor-card smart-card">
        <p class="ecard-title"><span class="step-badge">1</span> ${lfSpan("Da quale giorno?")}</p>
        <label>${lfSpan("Testo sopra il contatore")}<input name="counter_label" value="${esc(state.counter_label || "")}" placeholder="${esc(localizeFieldPhrase("Es. Insieme da, Ti sopporto da"))}" data-lf-placeholder="Es. Insieme da, Ti sopporto da"></label>
        <label>${lfSpan("Data speciale")}<input type="date" name="together_since" value="${esc(state.together_since || "")}"></label>
        <p class="field-hint">${lfSpan("Solo il giorno (es. primo appuntamento). Non serve ora: il conteggio parte dalla mezzanotte di quella data.")}</p>
      </div>
      <div class="editor-card smart-card">
        <p class="ecard-title"><span class="step-badge">2</span> ${lfSpan("Come mostrarlo?")}</p>
        <label class="smart-toggle"><input type="checkbox" name="show_counter_hms" ${state.show_counter_hms ? "checked" : ""}> ${lfSpan("Mostra anche ore, minuti e secondi (timer che scorre)")}</label>
        <p class="field-hint">${lfSpan("Spento (consigliato): anni · mesi · giorni, aggiornato in modo calmo.")}<br>${lfSpan("Acceso: giorni · ore · min · sec che cambiano ogni secondo — utile se vuoi l’effetto “orologio vivo”. Parte sempre dalla mezzanotte del giorno scelto sopra.")}</p>
      </div>
    </div>
  </div>`;
}

function renderOrderPanel(state){
  return `<div class="editor-panel ${activeEditorPanel === "order" ? "active" : ""}" data-editor-panel="order">
    ${renderSectionHeader(editorPanelTitle(EDITOR_PANELS.order),editorPanelSubtitle(EDITOR_PANELS.order))}
    <div class="editor-card">
      <p class="field-hint order-intro">${lfSpan("Tieni premuto ☰ e trascina — le sezioni attive si riordinano subito nell'anteprima.")}</p>
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
        <strong>${esc(localizedSectionLabel(state.type, key))}</strong>
        <small>${esc(localizedSectionSubtitle(state.type, key))}</small>
      </span>
      <span class="extras-card-action">${lfSpan(isPrimary ? "Riattiva →" : "Aggiungi →")}</span>
    </button>`;
  }).join("");
  const extrasIntro = "Le sezioni consigliate compaiono nel menu quando sono attive. Qui trovi tutte le altre (e quelle che hai spento): tocca per aggiungerle. Per toglierle di nuovo dal menu, apri la sezione e spegni Visibile in pagina.";
  return `<div class="editor-panel ${activeEditorPanel === "extras" ? "active" : ""}" data-editor-panel="extras">
    ${renderSectionHeader(t("sec.extras_title") || t("nav.extras"), t("sec.extras_sub"))}
    <div class="editor-card smart-card">
      <p class="field-hint" data-lf="${esc(extrasIntro)}">${esc(localizeFieldPhrase(extrasIntro))}</p>
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
  return sectionOrder.filter(key=>key !== "places" && !isSectionExcluded(key)).map(key=>{
    const panelId = `section-${key}`;
    const section = state.sections[key] || DEFAULT_SECTIONS[key] || {};
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
    const panelTitle = String(section?.title || "").trim() || localizedSectionLabel(state.type, key);
    return `<div class="editor-panel ${activeEditorPanel === panelId ? "active" : ""}" data-editor-panel="${esc(panelId)}" data-section-panel-key="${esc(key)}" ${hidden ? "hidden" : ""}>
      ${renderSectionHeader(panelTitle, localizedSectionSubtitle(state.type, key))}
      ${mutedNav ? `<p class="field-hint extras-hint">${lfSpan("Sezione extra — attivala con l'interruttore sotto o da Altre sezioni.")}</p>` : ""}
      ${renderSectionPanelToggle(key,enabledOn)}
      <div class="section-editor-stack ${enabledOn ? "" : "is-muted"}" data-section-stack="${esc(key)}">
        ${sectionEditor(key,section,true)}
        ${rsvpShare}
      </div>
    </div>`;
  }).join("");
}

function renderPrivacyPanel(row, state = {}){
  const anniversaryEmails = state.anniversary_emails !== false;
  const savedPin = getRememberedPin(row.id);
  const pinHintBlock = savedPin ? `
    <div class="pin-reminder-card">
      <p class="pin-reminder-label">${lfSpan("PIN su questo telefono")}</p>
      <div class="pin-reveal-row">
        <code id="savedPinValue">${esc(savedPin)}</code>
        <button type="button" class="ghost" id="copySavedPinBtn">${lfSpan("Copia")}</button>
        <button type="button" class="ghost" id="forgetSavedPinBtn">${lfSpan("Rimuovi")}</button>
      </div>
    </div>` : `
    <div class="pin-reminder-card pin-reminder-empty">
      <p class="field-hint">${lfSpan("Il PIN non si può recuperare dal server. Se l'hai dimenticato, scrivine uno nuovo sotto e tocca Salva.")}</p>
    </div>`;
  return `<div class="editor-panel ${activeEditorPanel === "privacy" ? "active" : ""}" data-editor-panel="privacy">
    ${renderSectionHeader(editorPanelTitle(EDITOR_PANELS.privacy),editorPanelSubtitle(EDITOR_PANELS.privacy))}
    <div class="editor-card smart-card">
      <p class="ecard-title">🌍 ${lfSpan("Chi può vedere la pagina?")}</p>
      <label>${lfSpan("Stato pagina")}
        <select name="public_visible" id="publicVisibleSelect">
          <option value="true" data-lf-option="✅ Pubblicata — chi ha il link la vede" ${row.public_visible ? "selected" : ""}>${esc(localizeFieldPhrase("✅ Pubblicata — chi ha il link la vede"))}</option>
          <option value="false" data-lf-option="🔒 Bozza — solo tu la modifichi" ${!row.public_visible ? "selected" : ""}>${esc(localizeFieldPhrase("🔒 Bozza — solo tu la modifichi"))}</option>
        </select>
      </label>
      <p class="field-hint">${lfSpan("Dopo aver scelto, tocca il pulsante verde Salva in basso.")}</p>
    </div>
    <div class="editor-card smart-card">
      <p class="ecard-title">🔐 ${lfSpan("PIN di apertura")}</p>
      ${pinHintBlock}
      <label>${lfSpan("Protezione")}
        <select name="pin_enabled">
          <option value="true" data-lf-option="PIN attivo" ${row.pin_enabled ? "selected" : ""}>${esc(localizeFieldPhrase("PIN attivo"))}</option>
          <option value="false" data-lf-option="Nessun PIN" ${!row.pin_enabled ? "selected" : ""}>${esc(localizeFieldPhrase("Nessun PIN"))}</option>
        </select>
      </label>
      <label>${lfSpan("Nuovo PIN")}<input name="access_pin" inputmode="numeric" autocomplete="new-password" placeholder="${esc(localizeFieldPhrase("Es. 1234 — lascia vuoto per non cambiare"))}" data-lf-placeholder="Es. 1234 — lascia vuoto per non cambiare"></label>
      <p class="field-hint">${lfSpan("Chi avvicina il tag NFC dovrà inserire questo PIN per aprire la pagina.")}</p>
    </div>
    <div class="editor-card smart-card">
      <p class="ecard-title">💫 ${lfSpan("Ricordi nel tempo")}</p>
      <label class="smart-toggle">
        <input type="checkbox" name="anniversary_emails" ${anniversaryEmails ? "checked" : ""}>
        <span><strong>${lfSpan("Email anniversario")}</strong><small>${lfSpan("Ogni anno, alla data dell'evento o del contatore «insieme da», ti inviamo un promemoria con il link alla pagina.")}</small></span>
      </label>
      <p class="field-hint">${lfSpan("Usa la data evento, «insieme da» o la data del countdown se attivi.")}</p>
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
      <li><strong>2. Template</strong><span>Tocca «Prepara tutto per me» per partire dal modello del tuo prodotto.</span></li>
      <li><strong>3. Contenuti</strong><span>Modifica testi e media. In «Altre sezioni» aggiungi solo ciò che ti serve.</span></li>
      <li><strong>4. Pubblica</strong><span>Salva e condividi il link NFC.</span></li>
    </ol>
    <button type="button" class="primary" id="onboardingStart">Inizia → Copertina</button>
  </div>`;
}

function editorProgressStep(){
  if(activeNavGroup === "page" || activeEditorPanel === "privacy" || activeEditorPanel === "overview") return 4;
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
    { n:1, label:t("nav.cover"), panel:"cover", group:"design" },
    { n:2, label:t("nav.colors"), panel:"styling", group:"design" },
    { n:3, label:t("nav.content"), panel:"content", group:"content" },
    { n:4, label:t("nav.publish"), panel:"privacy", group:"page" }
  ];
  return `<nav class="editor-progress" aria-label="${esc(t("nav.aria.progress"))}">${steps.map(step=>`<button type="button" class="editor-progress-step ${current === step.n ? "active" : ""} ${current > step.n ? "done" : ""}" data-progress-step="${step.n}" data-progress-panel="${esc(step.panel)}" data-progress-group="${esc(step.group)}"><span class="editor-progress-num">${step.n}</span><span class="editor-progress-label">${esc(step.label)}</span></button>`).join("")}</nav>`;
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
        setPreviewFabLabel();
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

function setPreviewFabLabel(){
  const fab = document.getElementById("momentsPreviewFab");
  if(!fab) return;
  fab.textContent = mobilePreviewMode ? t("shell.edit") : t("shell.preview");
  fab.setAttribute("data-i18n", mobilePreviewMode ? "shell.edit" : "shell.preview");
}

function updateSaveStatus(saved){
  const node = document.getElementById("editorSaveStatus");
  if(node){
    node.textContent = saved ? t("shell.saved") : t("shell.unsaved");
    node.classList.toggle("dirty",!saved);
  }
  const saveBar = document.getElementById("momentsSaveBar");
  saveBar?.classList.toggle("visible",!saved);
  const barMsg = saveBar?.querySelector(".save-msg");
  if(barMsg && !saved){
    barMsg.setAttribute("data-i18n-html", "shell.save_bar");
    barMsg.innerHTML = t("shell.save_bar");
  }
  document.querySelectorAll(".editor-undo-btn").forEach(button=>{
    button.hidden = saved;
    button.disabled = saved;
  });
}

function refreshNavChrome(){
  ensureMobileNav();
  const progressMap = {
    1: "nav.cover",
    2: "nav.colors",
    3: "nav.content",
    4: "nav.publish"
  };
  document.querySelectorAll(".editor-progress-step").forEach(node=>{
    const n = Number(node.dataset.progressStep);
    const label = node.querySelector(".editor-progress-label");
    if(label && progressMap[n]) label.textContent = t(progressMap[n]);
    const nav = node.closest(".editor-progress");
    if(nav) nav.setAttribute("aria-label", t("nav.aria.progress"));
  });
  const help = document.querySelector(".editor-topbar-help");
  if(help){
    help.setAttribute("data-i18n-html", "nav.help_html");
    help.innerHTML = t("nav.help_html");
  }
  const sidebar = document.querySelector("#momentEditorShell .editor-sidebar");
  if(!sidebar || !activeId) return;
  const row = rows.find(item => item.id === activeId);
  if(!row) return;
  const state = mergedState(row);
  const enabled = Object.fromEntries(Object.entries(state.sections || {}).map(([k,v])=>[k, Boolean(v?.enabled)]));
  const next = renderEditorSidebar(activeEditorPanel, state.type, state.pinned_sections || pinnedExtraSections, enabled);
  sidebar.outerHTML = next;
  const shell = document.getElementById("momentEditorShell");
  if(shell) bindEditorNavigation(shell);
  const form = document.getElementById("momentEditorForm");
  if(form){
    syncEditorKitUi(form);
    refreshSectionOrderList(form);
  }
}

function refreshShellChrome(){
  setPreviewFabLabel();
  if(document.getElementById("editorSaveStatus")){
    updateSaveStatus(!editorDirty);
  }
  const row = rows.find(item => item.id === activeId);
  if(!row || !detail) return;
  detail.querySelectorAll(".status-pill.live, .status-pill.draft").forEach(pill=>{
    pill.textContent = row.public_visible ? t("shell.published") : t("shell.draft");
  });
  detail.querySelectorAll(".status-pill.pin").forEach(pill=>{
    pill.textContent = row.pin_enabled ? t("shell.pin_on") : t("shell.pin_off");
  });
}

function revertEditorChanges(){
  if(!editorDirty || !savedEditorSnapshot || !activeId) return;
  if(!window.confirm(t("shell.confirm_undo"))) return;
  const row = rows.find(item=>item.id === activeId);
  if(!row) return;
  let savedState;
  try{
    savedState = JSON.parse(savedEditorSnapshot);
  }catch{
    return;
  }
  const panel = activeEditorPanel;
  row.page_state = savedState;
  row.title = savedState.title || row.title;
  row.moment_type = savedState.type || row.moment_type;
  row.event_type = savedState.type || row.event_type;
  row.description = savedState.description ?? row.description;
  renderDetail(activeId);
  activeEditorPanel = panel;
  setEditorPanel(panel);
  syncMobileNav(panel);
  const hint = document.getElementById("editorActionHint");
  if(hint) hint.hidden = true;
}

function renderSectionOrderItem(key,idx,momentType = currentMomentType,formNode = null){
  const label = formNode ? sectionOrderDisplayLabel(formNode, momentType, key) : localizedSectionLabel(momentType, key);
  return `<div class="section-order-item" data-section-key="${esc(key)}">
    <button type="button" class="section-drag section-drag-handle" aria-label="${esc(localizeFieldPhrase("Trascina per riordinare"))}">☰</button>
    <span class="section-order-icon">${esc(SECTION_ICONS[key] || "•")}</span>
    <span class="section-order-label">${esc(label)}</span>
    <div class="section-order-actions">
      <button type="button" class="section-move-btn" data-section-move-up="${esc(key)}" aria-label="${esc(localizeFieldPhrase("Sposta su"))}">↑</button>
      <button type="button" class="section-move-btn" data-section-move-down="${esc(key)}" aria-label="${esc(localizeFieldPhrase("Sposta giù"))}">↓</button>
    </div>
    <span class="section-order-num">#${idx+1}</span>
  </div>`;
}

function renderSectionOrderList(state){
  const keys = state ? enabledSectionKeysFromState(state) : navSectionsForEditor(currentMomentType, sectionOrder, pinnedExtraSections);
  const items = keys.length
    ? keys.map((key,idx)=>renderSectionOrderItem(key,idx, state?.type || currentMomentType)).join("")
    : `<p class="section-order-empty">${lfSpan("Nessuna sezione attiva. Attiva almeno una sezione dal menu Contenuti.")}</p>`;
  return `<div class="section-order-panel">
    <p class="section-order-hint">${lfSpan("Trascina con ☰ oppure usa ↑ ↓ per cambiare l'ordine delle sezioni attive.")}</p>
    <div class="section-order-list" id="sectionOrderList">${items}</div>
  </div>`;
}

function moveEnabledSection(formNode,key,direction){
  const enabled = enabledSectionKeysFromForm(formNode);
  const idx = enabled.indexOf(key);
  if(idx < 0) return;
  const next = idx + direction;
  if(next < 0 || next >= enabled.length) return;
  enabled.splice(idx,1);
  enabled.splice(next,0,key);
  applyEnabledSectionOrder(enabled,formNode);
  refreshSectionOrderList(formNode);
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{immediate:true});
}

function applySectionOrderFromList(formNode){
  const listNode = document.getElementById("sectionOrderList");
  if(!listNode) return;
  const keys = [...listNode.querySelectorAll(".section-order-item")].map(item=>item.dataset.sectionKey).filter(Boolean);
  if(!keys.length) return;
  applyEnabledSectionOrder(keys,formNode);
  refreshSectionOrderList(formNode);
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{immediate:true});
}

function bindSectionOrderDnD(){
  const listNode = document.getElementById("sectionOrderList");
  if(!listNode || listNode.dataset.bound === "1") return;
  listNode.dataset.bound = "1";
  let dragKey = null;
  let dragEl = null;
  let lastOverKey = null;

  listNode.addEventListener("click",event=>{
    const upBtn = event.target.closest("[data-section-move-up]");
    if(upBtn && listNode.contains(upBtn)){
      event.preventDefault();
      moveEnabledSection(document.getElementById("momentEditorForm"),upBtn.dataset.sectionMoveUp,-1);
      return;
    }
    const downBtn = event.target.closest("[data-section-move-down]");
    if(downBtn && listNode.contains(downBtn)){
      event.preventDefault();
      moveEnabledSection(document.getElementById("momentEditorForm"),downBtn.dataset.sectionMoveDown,1);
    }
  });

  listNode.addEventListener("pointerdown",event=>{
    const handle = event.target.closest(".section-drag-handle");
    if(!handle || !listNode.contains(handle)) return;
    const item = handle.closest(".section-order-item");
    if(!item) return;
    event.preventDefault();
    dragKey = item.dataset.sectionKey;
    dragEl = item;
    lastOverKey = dragKey;
    item.classList.add("dragging");
    handle.setPointerCapture(event.pointerId);
  });

  listNode.addEventListener("pointermove",event=>{
    if(!dragEl || !dragKey) return;
    const over = document.elementFromPoint(event.clientX,event.clientY)?.closest(".section-order-item");
    if(!over || !listNode.contains(over) || over === dragEl || over.dataset.sectionKey === lastOverKey) return;
    lastOverKey = over.dataset.sectionKey;
    const items = [...listNode.querySelectorAll(".section-order-item")];
    const dragIdx = items.indexOf(dragEl);
    const overIdx = items.indexOf(over);
    if(dragIdx < 0 || overIdx < 0) return;
    if(dragIdx < overIdx) over.after(dragEl);
    else over.before(dragEl);
    dragEl = listNode.querySelector(`[data-section-key="${dragKey}"]`);
  });

  const finishPointerDrag = event=>{
    if(!dragEl) return;
    dragEl.classList.remove("dragging");
    dragEl = null;
    dragKey = null;
    lastOverKey = null;
    const form = document.getElementById("momentEditorForm");
    if(form) applySectionOrderFromList(form);
    event?.preventDefault?.();
  };

  listNode.addEventListener("pointerup",finishPointerDrag);
  listNode.addEventListener("pointercancel",finishPointerDrag);

  listNode.addEventListener("dragstart",event=>{
    const handle = event.target.closest(".section-drag-handle");
    const item = handle?.closest(".section-order-item") || event.target.closest(".section-order-item");
    if(!item) return;
    dragKey = item.dataset.sectionKey;
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragKey);
  });
  listNode.addEventListener("dragend",()=>{
    dragKey = null;
    listNode.querySelector(".section-order-item.dragging")?.classList.remove("dragging");
  });
  listNode.addEventListener("dragover",event=>{
    event.preventDefault();
    const form = document.getElementById("momentEditorForm");
    const over = event.target.closest(".section-order-item");
    if(!form || !over || !dragKey || over.dataset.sectionKey === dragKey) return;
    const enabled = enabledSectionKeysFromForm(form);
    const from = enabled.indexOf(dragKey);
    const to = enabled.indexOf(over.dataset.sectionKey);
    if(from < 0 || to < 0 || from === to) return;
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
        ? t("save.visibility_live")
        : t("save.visibility_draft");
      hint.hidden = false;
    }
  });
  select.addEventListener("change",sync);
}

function promptSaveReminder(message = t("save.reminder_default")){
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
  if(!row){
    showAccountHub("products");
    return;
  }
  showEditorView();
  if(activeEditorPanel === "objects") activeEditorPanel = "cover";
  let state;
  try{
    state = mergedState(row);
  }catch(error){
    renderEditorFailure(error);
    return;
  }
  sectionOrder = [...state.sectionOrder];
  currentMomentType = normalizeMomentType(state.type);
  lastSavedMomentType = currentMomentType;
  pinnedExtraSections = [...(state.pinned_sections || [])];
  editorDirty = false;
  const publicUrl = `${PUBLIC_BASE_URL}/m/${encodeURIComponent(row.slug)}`;
  const nfcUrl = row.nfc_code ? `${PUBLIC_BASE_URL}/k/${encodeURIComponent(row.nfc_code)}` : "";
  const showWizard = needsOnboarding(row);
  let editorHtml;
  try{
    editorHtml = `
    ${adminMode ? `<p class="admin-mode-banner" id="adminModeBanner">Modalità admin — stai modificando l'oggetto di ${esc(row.owner_email || "cliente")}.</p>` : ""}
    <div class="detail-head">
      <div>
        <p class="eyebrow" data-i18n="shell.editor_page">${esc(t("shell.editor_page"))}</p>
        <h2>${esc(state.title || row.slug)}</h2>
        <p class="detail-meta">${esc(row.nfc_code || "")} · ${esc(TYPE_LABELS[state.type] || state.type)}</p>
        <div class="status-row">
          <span class="status-pill ${row.public_visible ? "live" : "draft"}">${esc(row.public_visible ? t("shell.published") : t("shell.draft"))}</span>
          <span class="status-pill pin">${esc(row.pin_enabled ? t("shell.pin_on") : t("shell.pin_off"))}</span>
        </div>
      </div>
      <div class="link-row">
        <button type="button" class="copy-button" id="editorCopyLinkBtn" data-i18n="shell.copy_link">${esc(t("shell.copy_link"))}</button>
        <button type="button" class="copy-button" id="editorSharePageBtn" data-i18n="shell.share">${esc(t("shell.share"))}</button>
      </div>
    </div>
    ${showWizard ? renderOnboardingWizard(row) : ""}
    <div class="editor-shell" id="momentEditorShell">
      <div class="editor-topbar">
        <span class="editor-save-status" id="editorSaveStatus">${esc(t("shell.saved"))}</span>
        <div class="editor-topbar-actions">
          <div class="mobile-view-toggle">
            <button type="button" class="mobile-view-btn active" data-mobile-view="edit" data-i18n="shell.edit">${esc(t("shell.edit"))}</button>
            <button type="button" class="mobile-view-btn" data-mobile-view="preview" data-i18n="shell.preview">${esc(t("shell.preview"))}</button>
          </div>
          <button type="button" class="ghost quick-publish published" id="quickPublishBtn" title="Rende la pagina visibile a chi ha il link">Pubblica pagina</button>
          <button type="button" class="ghost editor-open-link" id="editorOpenPageBtn" data-i18n="shell.open_page" data-i18n-title="shell.open_title" title="${esc(t("shell.open_title"))}">${esc(t("shell.open_page"))}</button>
          <button type="button" class="ghost editor-undo-btn" id="editorUndoBtn" hidden data-i18n="shell.undo" data-i18n-title="shell.undo_title" title="${esc(t("shell.undo_title"))}">${esc(t("shell.undo"))}</button>
          <button type="submit" form="momentEditorForm" class="primary editor-save-btn" data-i18n="shell.save">${esc(t("shell.save"))}</button>
        </div>
      </div>
      <p class="editor-action-hint" id="editorActionHint" hidden></p>
      ${renderEditorProgress()}
      <p class="editor-topbar-help" data-i18n-html="nav.help_html">${t("nav.help_html")}</p>
      <div class="editor-layout">
        ${renderEditorSidebar(activeEditorPanel, state.type, state.pinned_sections || [], Object.fromEntries(Object.entries(state.sections || {}).map(([k,v])=>[k, Boolean(v?.enabled)])))}
        <div class="editor-main">
          ${renderOverviewPanel(row, state, publicUrl)}
          <form id="momentEditorForm" class="editor-form-inner" novalidate>
            <input type="hidden" name="pinned_sections" id="pinnedSectionsInput" value="${esc((state.pinned_sections || []).join(","))}">
            ${renderCoverPanel(state)}
            ${renderDesignPanel(state)}
            ${renderCounterPanel(state)}
            ${renderOrderPanel(state)}
            ${renderSectionPanels(state,{ publicUrl, published:row.public_visible, pageTitle:state.title })}
            ${renderExtrasPanel(state)}
            ${renderGalleryFileInput("gallery")}
            ${renderGalleryFileInput("video")}
            ${renderGalleryFileInput("music")}
            ${renderGalleryFileInput("letter_future")}
            ${renderJourneyFileInput()}
            ${renderPrivacyPanel(row, state)}
            <p class="status editor-form-status" id="editorStatus"></p>
          </form>
        </div>
        <aside class="preview-card" id="momentPreview">
          <div class="preview-label">
            <span data-i18n="shell.live_preview">${esc(t("shell.live_preview"))}</span>
            <span class="preview-live-status"></span>
          </div>
          <div class="preview-live-wrap">
            <div class="preview-live-stage" id="previewLiveStage">
              <iframe class="preview-live-iframe" title="${esc(t("shell.preview_iframe"))}" data-i18n-title="shell.preview_iframe"></iframe>
            </div>
          </div>
        </aside>
      </div>
    </div>`;
  }catch(error){
    renderEditorFailure(error);
    return;
  }
  detail.innerHTML = editorHtml;
  const editorForm = document.getElementById("momentEditorForm");
  const editorShell = document.getElementById("momentEditorShell");
  mobilePreviewMode = false;
  setPreviewFabLabel();
  editorShell?.classList.remove("show-preview");
  savedEditorSnapshot = JSON.stringify(readFormState(editorForm));
  lastPreviewHash = "";
  updateSaveStatus(true);
  document.getElementById("editorUndoBtn")?.addEventListener("click",revertEditorChanges);
  if(document.body.dataset.momentsUndoBound !== "1"){
    document.body.dataset.momentsUndoBound = "1";
    document.getElementById("editorUndoBtnMobile")?.addEventListener("click",revertEditorChanges);
  }
  editorForm.addEventListener("submit",event=>saveMoment(event,row));
  // Pulsanti Salva fuori dal form: chiama direttamente saveMoment (no validation HTML)
  document.querySelectorAll('button[type="submit"][form="momentEditorForm"], .editor-save-btn, #momentsSaveBar .btn-save').forEach(button=>{
    if(button.dataset.momentsSaveBound === "1") return;
    button.dataset.momentsSaveBound = "1";
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      saveMoment({ preventDefault(){}, currentTarget:editorForm }, row);
    });
  });
  syncRsvpWhatsappWarn(editorForm);
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
  document.getElementById("applyMomentTemplate")?.addEventListener("click",()=>{
    const type = lockedMomentType(row);
    if(!confirmApplyMomentTemplate(type)) return;
    applyTemplateToForm(editorForm,type);
  });
  if(adminMode){
    document.getElementById("momentTypeSelect")?.addEventListener("change",event=>{
      const select = event.currentTarget;
      const nextType = normalizeMomentType(select.value || "free");
      const previousType = currentMomentType;
      if(nextType === previousType) return;
      if(formHasMeaningfulContent(editorForm) && !confirmMomentTypeChange(nextType, previousType)){
        select.value = previousType;
        return;
      }
      currentMomentType = nextType;
      applySuggestedLookForType(editorForm, nextType);
      syncEditorKitUi(editorForm);
      markEditorDirty(editorForm);
    });
  }
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
  const videoMedia = migrateVideoSectionMedia(state.sections.video);
  writeGalleryMedia(editorForm,"video",videoMedia);
  renderGalleryGrid(editorForm,"video");
  const musicMedia = migrateMusicSectionMedia(state.sections.music);
  writeGalleryMedia(editorForm,"music",musicMedia);
  renderGalleryGrid(editorForm,"music");
  const letterMedia = migrateLetterMediaSection(state.sections.letter_future);
  writeGalleryMedia(editorForm,"letter_future",letterMedia);
  renderGalleryGrid(editorForm,"letter_future");
  refreshMomentEntitlements(row.id).catch(()=>{});
  for(const key of LIST_SECTION_KEYS){
    const items = itemsFromSection(state.sections[key], LIST_SECTION_MODES[key]);
    writeListItems(editorForm,key,items);
    renderListItems(editorForm,key);
  }
  bindListItemsEditor(editorForm);
  bindHoroscopePeopleEditor(editorForm);
  refreshHoroscopePeopleEditor(editorForm);
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
  refreshAccountMenu();
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
  bindMomentDashboard({
    supabase,
    eventId:row.id,
    publicUrl,
    published:row.public_visible,
    slug:row.slug,
    state,
    copyText
  });
  bindRsvpWhatsappRequired(editorForm);
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
  if(showWizard && sessionStorage.getItem(templateSeedKey(row.id)) !== "done"){
    applyTemplateToForm(editorForm, currentMomentType);
    sessionStorage.setItem(templateSeedKey(row.id), "done");
    savedEditorSnapshot = JSON.stringify(readFormState(editorForm));
    editorDirty = true;
    updateSaveStatus(false);
    promptSaveReminder(t("save.reminder_model", { type: TYPE_LABELS[currentMomentType] || currentMomentType }));
  }
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

async function uploadCoverImage(file,row,formNode){
  const status = document.getElementById("coverUploadStatus");
  setUploadStatus(status,"Caricamento in corso...");
  uploadBusy = true;
  try{
    const url = await uploadImage(supabase,{scope:"moments",scopeId:row.id,file});
    setCoverUrl(formNode, url);
    const slot = formNode.querySelector("#coverFramerSlot");
    if(slot){
      slot.innerHTML = renderCoverFramer({
        cover_url:url,
        cover_focus_x:formNode.elements.cover_focus_x?.value ?? 50,
        cover_focus_y:formNode.elements.cover_focus_y?.value ?? 50,
        cover_zoom:formNode.elements.cover_zoom?.value ?? 100
      });
    }
    bindCoverFramer(formNode);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    setUploadStatus(status,t("save.reminder_cover"),"ok");
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
    refreshMomentEntitlements(row.id).catch(()=>{});
    const count = items?.length || batchSize;
    const label = key === "letter_future" ? t("save.label_letter")
      : key === "video" ? t("save.label_video")
        : key === "music" ? t("save.label_music")
          : t("save.label_gallery");
    promptSaveReminder(t("save.reminder_upload", { count, label }));
  }catch(error){
    const message = error.message || "Upload non riuscito.";
    setUploadStatus(status,message,"error");
    alert(message);
  }
}

async function uploadSectionVideo(file,row,formNode){
  uploadBusy = true;
  try{
    validateVideoFile(file);
    const url = await uploadVideo(supabase,{scope:"moments",scopeId:row.id,file});
    const urlInput = formNode.querySelector('[name="section_video_video_url"]');
    const oldUrl = urlInput?.value || "";
    if(urlInput) urlInput.value = url;
    refreshVideoSectionPreview(formNode,url);
    enableSection(formNode,"video");
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    if(oldUrl && isCloudflareMediaUrl(oldUrl) && oldUrl !== url){
      deleteStorageObject(supabase,oldUrl).catch(()=>{});
    }
  }catch(error){
    alert(error.message || "Upload video non riuscito.");
  }finally{
    uploadBusy = false;
  }
}

function refreshVideoSectionPreview(formNode,url){
  const panel = document.getElementById("videoSectionPanel");
  if(!panel) return;
  const preview = url
    ? `<div class="video-section-preview"><video src="${esc(url)}" controls playsinline preload="metadata"></video><button type="button" class="ghost video-section-remove" data-video-section-remove aria-label="Rimuovi video">Rimuovi</button></div>`
    : `<button type="button" class="gallery-add video-section-add" data-video-section-upload><span>▶</span>Carica video MP4/MOV</button>`;
  panel.querySelector(".video-section-preview,.video-section-add")?.remove();
  panel.querySelector("#sectionVideoFile")?.insertAdjacentHTML("beforebegin",preview);
}

function removeSectionVideo(formNode){
  const urlInput = formNode.querySelector('[name="section_video_video_url"]');
  const oldUrl = urlInput?.value || "";
  if(urlInput) urlInput.value = "";
  refreshVideoSectionPreview(formNode,"");
  markEditorDirty(formNode);
  schedulePreviewUpdate(formNode,{immediate:true,force:true});
  if(oldUrl && isCloudflareMediaUrl(oldUrl)){
    deleteStorageObject(supabase,oldUrl).catch(()=>{});
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
    if(strong){
      const it = input.checked ? "Contatore attivo" : "Contatore spento";
      strong.setAttribute("data-lf", it);
      strong.textContent = localizeFieldPhrase(it);
    }
    if(small){
      const it = input.checked ? "Compare sotto la copertina" : "Tocca per mostrarlo";
      small.setAttribute("data-lf", it);
      small.textContent = localizeFieldPhrase(it);
    }
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

async function handleGalleryFileInputChange(input,row,formNode){
  if(!input?.files?.length || uploadBusy) return;
  const key = String(input.id || "").replace("galleryFile_","");
  if(!key) return;
  const pendingType = input.dataset.pendingType || "";
  const replaceId = input.dataset.pendingReplaceId || "";
  input.dataset.pendingType = "";
  input.dataset.pendingReplaceId = "";
  const files = [...input.files];
  input.value = "";
  if(!files.length) return;
  const filtered = pendingType
    ? files.filter(file=>fileMatchesGalleryType(file,pendingType))
    : files;
  if(!filtered.length){
    const status = document.getElementById(`galleryUploadStatus_${key}`);
    const label = pendingType === "video" ? "video" : pendingType === "audio" ? "audio" : "foto";
    const formats = pendingType === "video"
      ? "MP4, WebM o MOV"
      : pendingType === "audio"
        ? "MP3, M4A o WAV"
        : "JPG, PNG, WebP o HEIC";
    setUploadStatus(status,`Formato non riconosciuto. Seleziona un ${label} valido (${formats}).`,"error");
    return;
  }
  const liveRow = rows.find(item=>item.id === activeId) || row;
  if(!liveRow?.id){
    alert("Pagina non selezionata. Ricarica l'editor e riprova.");
    return;
  }
  if(replaceId){
    await replaceGalleryImage(filtered[0],liveRow,formNode,key,replaceId);
    return;
  }
  await uploadGalleryImages(filtered,liveRow,formNode,key);
}

async function replaceGalleryImage(file,row,formNode,key,mediaId){
  const status = document.getElementById(`galleryUploadStatus_${key}`);
  enableSection(formNode,key);
  try{
    const result = await replaceGalleryMediaItem({
      supabase,
      row,
      formNode,
      key,
      mediaId,
      file,
      onStatus:(msg,type)=>setUploadStatus(status,msg,type),
      onBusy:busy=>{ uploadBusy = busy; }
    });
    enableSection(formNode,key);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode,{immediate:true,force:true});
    if(result?.oldUrl && isCloudflareMediaUrl(result.oldUrl) && result.oldUrl !== result.item?.url){
      deleteStorageObject(supabase,result.oldUrl).catch(()=>{});
    }
    promptSaveReminder(t("save.reminder_photo"));
  }catch(error){
    const message = error.message || "Sostituzione non riuscita.";
    setUploadStatus(status,message,"error");
    alert(message);
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
  formNode.querySelectorAll("input[id^='galleryFile_']").forEach(input=>{
    input.addEventListener("change",async event=>{
      await handleGalleryFileInputChange(event.currentTarget,row,formNode);
    });
  });
  document.getElementById("journeyStepFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    const stepId = journeyUploadStepId;
    journeyUploadStepId = null;
    event.target.value = "";
    if(!file || uploadBusy || !stepId) return;
    await uploadJourneyStepImage(file,row,formNode,stepId);
  });
  document.getElementById("musicAudioFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadMusicAudio(file,row,formNode);
  });
  document.getElementById("sectionVideoFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadSectionVideo(file,row,formNode);
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
  document.getElementById("musicPhotoFile")?.addEventListener("change",async event=>{
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file || uploadBusy) return;
    await uploadSectionPhoto("music",file,row,formNode);
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

function openGalleryFilePicker(formNode,key,type = "",{ replaceId = "", multiple } = {}){
  setEditorPanel(`section-${key}`);
  enableSection(formNode,key);
  const input = document.getElementById(`galleryFile_${key}`);
  if(!input) return;
  const accepts = { image:IMAGE_ACCEPT, video:"video/*", audio:"audio/*", pdf:"application/pdf,.pdf" };
  input.accept = accepts[type] || (key === "letter_future"
    ? `${IMAGE_ACCEPT},video/*,audio/*,application/pdf,.pdf`
    : key === "video" ? "video/*"
      : key === "music" ? "audio/*"
        : IMAGE_ACCEPT);
  input.dataset.pendingType = type || "";
  input.dataset.pendingReplaceId = replaceId || "";
  if(typeof multiple === "boolean"){
    input.multiple = multiple;
  }else{
    input.multiple = replaceId ? false : (key === "letter_future" ? type === "image" : true);
  }
  requestAnimationFrame(()=>{ input.click(); });
}

function bindMediaUploadDelegation(){
  if(!detail) return;
  if(detail.dataset.mediaBound === "1") return;
  detail.dataset.mediaBound = "1";
  detail.addEventListener("click",event=>{
    const formNode = document.getElementById("momentEditorForm");
    const row = rows.find(item=>item.id === activeId);
    if(!formNode || !row){
      if(event.target.closest("[data-gallery-add],[data-gallery-remove],[data-gallery-replace]")){
        alert("Editor non pronto. Ricarica la pagina e riprova.");
      }
      return;
    }
    const addBtn = event.target.closest("[data-gallery-add]");
    if(addBtn){
      event.preventDefault();
      openGalleryFilePicker(formNode,addBtn.dataset.galleryAdd || "gallery",addBtn.dataset.galleryType || "");
      return;
    }
    const replaceBtn = event.target.closest("[data-gallery-replace]");
    if(replaceBtn){
      event.preventDefault();
      event.stopPropagation();
      const panel = replaceBtn.closest("[data-gallery-key]");
      const key = replaceBtn.dataset.mediaSection || panel?.dataset.galleryKey;
      const mediaId = replaceBtn.dataset.mediaId || "";
      const type = replaceBtn.dataset.mediaType || "image";
      if(!key || !mediaId) return;
      openGalleryFilePicker(formNode,key,type,{ replaceId:mediaId, multiple:false });
      return;
    }
    const removeBtn = event.target.closest("[data-gallery-remove]");
    if(removeBtn){
      event.preventDefault();
      event.stopPropagation();
      const panel = removeBtn.closest("[data-gallery-key]");
      const key = removeBtn.dataset.mediaSection || panel?.dataset.galleryKey;
      if(!key) return;
      const media = readGalleryMedia(formNode,key);
      const mediaId = removeBtn.dataset.mediaId;
      let index = mediaId ? media.findIndex(item=>item.id === mediaId) : Number(removeBtn.dataset.galleryRemove);
      if(index < 0) index = Number(removeBtn.dataset.galleryRemove);
      if(!Number.isInteger(index) || index < 0 || index >= media.length) return;
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
    if(event.target.closest("[data-video-section-upload]")){
      document.getElementById("sectionVideoFile")?.click();
      return;
    }
    if(event.target.closest("[data-video-section-remove]")){
      removeSectionVideo(formNode);
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
    const sectionPhotoRemove = event.target.closest("[data-section-photo-remove]");
    if(sectionPhotoRemove){
      removeSectionPhoto(sectionPhotoRemove.dataset.sectionPhotoRemove,formNode);
      return;
    }
  });
}

function option(value,label,current){
  const it = String(label || "");
  return `<option value="${esc(value)}" data-lf-option="${esc(it)}" ${value === current ? "selected" : ""}>${esc(localizeFieldPhrase(it))}</option>`;
}

function renderGalleryUpload(section,key){
  return renderGalleryUploadPanel(section,key);
}

function renderSectionTitleField(key, section){
  const placeholder = DEFAULT_SECTIONS[key]?.title || SECTION_LABELS[key] || "";
  const hint = "Compare nel menu della pagina e come titolo della sezione.";
  return `<label>${lfSpan("Titolo sezione")}<input name="section_${esc(key)}_title" value="${esc(section.title || "")}" placeholder="Es. ${esc(placeholder)}"><span class="field-hint" data-lf="${esc(hint)}">${esc(localizeFieldPhrase(hint))}</span></label>`;
}

function sectionOrderDisplayLabel(formNode, momentType, key){
  const custom = String(formNode?.querySelector(`[name="section_${key}_title"]`)?.value || "").trim();
  if(custom) return custom;
  return localizedSectionLabel(momentType, key);
}

function sectionEditor(key,section,standalone=false){
  const safe = section || DEFAULT_SECTIONS[key] || {};
  const hints = sectionFieldHints();
  const icon = SECTION_ICONS[key] || "•";
  const guide = localizedSectionFillGuide(currentMomentType, key);
  const galleryField = key === "gallery" ? renderGalleryUpload(safe,key) : "";
  const journeyField = key === "timeline" ? renderJourneyPanel(safe) : "";
  const listHint = hints[key] && key !== "timeline"
    ? `<p class="section-hint" data-lf="${esc(hints[key])}">${esc(localizeFieldPhrase(hints[key]))}</p>` : "";
  const dedicationFields = key === "dedication" ? `
    <label>${lfSpan("Destinatario")}<input name="section_${esc(key)}_recipient" value="${esc(safe.recipient || "")}" placeholder="${esc(localizeFieldPhrase("Es. Marco, amici, futuro noi"))}" data-lf-placeholder="Es. Marco, amici, futuro noi"></label>
    <label>${lfSpan("Firma")}<input name="section_${esc(key)}_signature" value="${esc(safe.signature || "")}" placeholder="${esc(localizeFieldPhrase("Es. Con amore, i tuoi nomi"))}" data-lf-placeholder="Es. Con amore, i tuoi nomi"></label>` : "";
  const countdownFields = key === "countdown" ? `
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> ${lfSpan("Quando?")}</p>
      <label>${lfSpan("Cosa aspettate?")}<input name="section_${esc(key)}_event_label" value="${esc(safe.event_label || "")}" placeholder="${esc(localizeFieldPhrase("Es. Al nostro matrimonio"))}" data-lf-placeholder="Es. Al nostro matrimonio"></label>
      <label>${lfSpan("Data e ora")}<input type="datetime-local" name="section_${esc(key)}_target_date" value="${esc(safe.target_date || "")}"></label>
    </div>
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">2</span> ${lfSpan("Foto")}</p>
      ${renderSectionPhotoPanel(key, safe, "image_url", SECTION_PHOTO_FIELDS.countdown)}
      <p class="field-hint" data-lf="Facoltativa — appare sopra il timer nella pagina.">${esc(localizeFieldPhrase("Facoltativa — appare sopra il timer nella pagina."))}</p>
    </div>` : "";
  const musicFields = key === "music" ? `
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> ${lfSpan("Collegamenti")}</p>
      <label>${lfSpan("Link Spotify")}<input name="section_${esc(key)}_spotify_url" value="${esc(safe.spotify_url || "")}" placeholder="https://open.spotify.com/track/..."><span class="field-hint" data-lf="Link pubblico — non file caricati.">${esc(localizeFieldPhrase("Link pubblico — non file caricati."))}</span></label>
      <label>${lfSpan("Link YouTube")}<input name="section_${esc(key)}_youtube_url" value="${esc(safe.youtube_url || "")}" placeholder="https://youtube.com/watch?v=..."><span class="field-hint" data-lf="Link pubblico del video.">${esc(localizeFieldPhrase("Link pubblico del video."))}</span></label>
      ${renderMusicAudioPanel(safe)}
    </div>
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">2</span> ${lfSpan("Immagine")}</p>
      ${renderSectionPhotoPanel(key, safe, "image_url", SECTION_PHOTO_FIELDS.music)}
      <p class="field-hint" data-lf="Facoltativa — copertina del brano, locandina o foto simbolica.">${esc(localizeFieldPhrase("Facoltativa — copertina del brano, locandina o foto simbolica."))}</p>
    </div>` : "";
  const videoFields = key === "video" ? `
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> Video del ricordo</p>
      ${renderVideoSectionPanel(safe)}
    </div>` : "";
  const listItemsPanel = LIST_SECTION_KEYS.has(key) ? renderListItemsPanel(key, safe) : "";
  const letterFutureFields = key === "letter_future" ? `
    <label>${lfSpan("Destinatario")}<input name="section_${esc(key)}_recipient" value="${esc(safe.recipient || "")}" placeholder="${esc(localizeFieldPhrase("Es. noi tra 10 anni"))}" data-lf-placeholder="Es. noi tra 10 anni"></label>
    <label>${lfSpan("Data di apertura")}<input type="datetime-local" name="section_${esc(key)}_unlock_date" value="${esc(safe.unlock_date || "")}"></label>
    ${renderGalleryUploadPanel(safe, "letter_future")}` : "";
  const rsvpFields = key === "rsvp" ? `
    <div class="editor-card smart-card" data-rsvp-wa-card>
      <p class="ecard-title"><span class="step-badge">1</span> ${lfSpan("WhatsApp organizzatore")} <span class="field-required" data-lf="obbligatorio">${esc(localizeFieldPhrase("obbligatorio"))}</span></p>
      <p class="rsvp-wa-warn" id="rsvpWaWarn" data-lf="Senza WhatsApp, al Salva la sezione RSVP si disattiva da sola e esce dal menu. Inserisci il numero per tenerla attiva." ${normalizeWhatsAppDigits(safe.whatsapp_number) ? "hidden" : ""}>${esc(localizeFieldPhrase("Senza WhatsApp, al Salva la sezione RSVP si disattiva da sola e esce dal menu. Inserisci il numero per tenerla attiva."))}</p>
      <label>${lfSpan("Numero WhatsApp")}<input name="section_${esc(key)}_whatsapp_number" id="rsvpWhatsappInput" value="${esc(safe.whatsapp_number || "")}" placeholder="393331234567" inputmode="tel" autocomplete="tel"></label>
      <p class="field-hint" data-lf="Prefisso internazionale senza + (es. 39333… per Italia). Gli invitati compilano il modulo e ti inviano il messaggio su WhatsApp.">${esc(localizeFieldPhrase("Prefisso internazionale senza + (es. 39333… per Italia). Gli invitati compilano il modulo e ti inviano il messaggio su WhatsApp."))}</p>
    </div>
    ${renderRsvpFieldsEditor(safe)}` : "";
  const petFields = key === "pet" ? `
    <label>${lfSpan("Nome")}<input name="section_${esc(key)}_pet_name" value="${esc(safe.pet_name || "")}" placeholder="${esc(localizeFieldPhrase("Es. Luna"))}" data-lf-placeholder="Es. Luna"></label>
    <label>${lfSpan("Emoji")}<input name="section_${esc(key)}_pet_emoji" value="${esc(safe.pet_emoji || "🐾")}" maxlength="4" placeholder="🐾"></label>
    ${renderSectionPhotoPanel(key, safe, "pet_photo", SECTION_PHOTO_FIELDS.pet)}` : "";
  const quoteFields = key === "quote" ? `
    <label>${lfSpan("Autore")}<input name="section_${esc(key)}_author" value="${esc(safe.author || "")}" placeholder="${esc(localizeFieldPhrase("Es. William Shakespeare"))}" data-lf-placeholder="Es. William Shakespeare"></label>` : "";
  const signatureFields = key === "signature" ? `
    <label>${lfSpan("Nome firma")}<input name="section_${esc(key)}_sign_name" value="${esc(safe.sign_name || "")}" placeholder="${esc(localizeFieldPhrase("Es. Marco & Giulia"))}" data-lf-placeholder="Es. Marco & Giulia"></label>
    <label>${lfSpan("Sottotitolo")}<input name="section_${esc(key)}_sign_subtitle" value="${esc(safe.sign_subtitle || "")}" placeholder="${esc(localizeFieldPhrase("Es. Per sempre"))}" data-lf-placeholder="Es. Per sempre"></label>` : "";
  const horoscopeFields = key === "horoscope" ? `
    <div class="editor-card">
      <p class="ecard-title"><span class="step-badge">1</span> Persone e segni</p>
      ${renderHoroscopePeoplePanel(safe)}
    </div>` : "";
  const bodyLabelIt = key === "quote" ? "Citazione" : key === "dedication" || key === "letter_future" ? "Testo della lettera" : key === "pet" ? "Racconto" : "Contenuto";
  const bodyLabel = lfSpan(bodyLabelIt);
  const writeHere = localizeFieldPhrase("Scrivi qui...");
  const bodyField = key === "timeline" || key === "gallery" || key === "video" || key === "countdown" || key === "rsvp" || key === "guestbook" || key === "horoscope" || LIST_SECTION_KEYS.has(key)
    ? (key === "countdown" || key === "rsvp" || key === "guestbook" || key === "horoscope" ? `<details class="design-advanced editor-card"><summary>${lfSpan("Testo extra (facoltativo)")}</summary><label>${bodyLabel}<textarea name="section_${esc(key)}_body" placeholder="${esc(writeHere)}" data-lf-placeholder="Scrivi qui...">${esc(safe.body || "")}</textarea></label></details>` : "")
    : `<label>${bodyLabel}<textarea name="section_${esc(key)}_body" placeholder="${esc(writeHere)}" data-lf-placeholder="Scrivi qui...">${esc(safe.body || "")}</textarea></label>`;
  const titleField = renderSectionTitleField(key, safe);
  const guideHint = `<p class="field-hint" data-lf-section-guide="${esc(key)}">${esc(guide)}</p>`;
  const fields = `
    ${titleField}
    ${bodyField}
    ${listItemsPanel}
    ${listHint}
    ${dedicationFields}
    ${countdownFields}
    ${musicFields}
    ${videoFields}
    ${letterFutureFields}
    ${rsvpFields}
    ${horoscopeFields}
    ${petFields}
    ${quoteFields}
    ${signatureFields}
    ${journeyField}
    ${galleryField}`;
  if(standalone){
    if(key === "gallery"){
      return `<div class="editor-card"><p class="ecard-title">${icon} ${lfSpan("Galleria foto")}</p>${guideHint}${titleField}${galleryField}</div>`;
    }
    if(key === "video"){
      return `<div class="editor-card"><p class="ecard-title">${icon} ${lfSpan("Video")}</p>${guideHint}${titleField}${videoFields}</div>`;
    }
    if(key === "timeline"){
      return `<div class="editor-card"><p class="ecard-title">${icon} ${lfSpan("Tappe del percorso")}</p>${guideHint}${titleField}${journeyField}</div>`;
    }
    if(key === "countdown"){
      return `<div class="editor-card"><p class="ecard-title">${icon} ${lfSpan("Conto alla rovescia")}</p>${guideHint}${titleField}</div>${countdownFields}${bodyField}`;
    }
    if(key === "rsvp"){
      return `<div class="editor-card"><p class="ecard-title">${icon} ${lfSpan("RSVP invitati")}</p>${guideHint}${titleField}${rsvpFields}${bodyField}</div>`;
    }
    if(key === "horoscope"){
      return `<div class="editor-card"><p class="ecard-title">${icon} ${lfSpan("Oroscopo")}</p>${guideHint}${titleField}${horoscopeFields}${bodyField}</div>`;
    }
    if(isSectionExcluded(key)) return "";
    return `<div class="editor-card"><p class="ecard-title">${icon} <span data-lf-section-guide-title="${esc(key)}">${esc(guide.split(".")[0])}</span></p>${fields.replace(galleryField,"").replace(journeyField,"")}</div>`;
  }
  const fillGuide = `<div class="section-fill-guide"><p data-lf-section-guide="${esc(key)}">${esc(guide)}</p></div>`;
  return `<details class="section-box section-box-${esc(key)}" data-section-key="${esc(key)}" ${safe.enabled ? "open" : ""}>
    <summary><span class="section-icon">${esc(icon)}</span><label><input type="checkbox" name="section_${esc(key)}_enabled" ${safe.enabled ? "checked" : ""} onclick="event.stopPropagation()"> <span>${esc(SECTION_LABELS[key])}</span></label></summary>
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

function isRsvpSectionEnabled(formNode){
  return Boolean(formNode?.querySelector('[name="section_rsvp_enabled"]')?.checked);
}

function syncRsvpWhatsappRequiredAttr(formNode){
  const input = formNode?.querySelector('[name="section_rsvp_whatsapp_number"]');
  if(!input) return;
  const enabled = isRsvpSectionEnabled(formNode);
  // Mai HTML required: con pannello nascosto il browser blocca Salva senza messaggio.
  // Obbligo WhatsApp solo in saveMoment() quando RSVP è attivo.
  input.required = false;
  input.removeAttribute("required");
  input.setAttribute("aria-required", enabled ? "true" : "false");
  input.setCustomValidity("");
}

function syncRsvpWhatsappWarn(formNode){
  const input = formNode?.querySelector('[name="section_rsvp_whatsapp_number"]');
  const warn = formNode?.querySelector("#rsvpWaWarn");
  const card = formNode?.querySelector("[data-rsvp-wa-card]");
  if(!input) return;
  syncRsvpWhatsappRequiredAttr(formNode);
  if(!isRsvpSectionEnabled(formNode)){
    if(warn) warn.hidden = true;
    card?.classList.remove("is-missing-wa");
    return;
  }
  const ok = normalizeWhatsAppDigits(input.value).length >= 10;
  if(warn) warn.hidden = ok;
  card?.classList.toggle("is-missing-wa", !ok);
}

function bindRsvpWhatsappRequired(formNode){
  const input = formNode?.querySelector('[name="section_rsvp_whatsapp_number"]');
  if(!input || input.dataset.waBound === "1") return;
  input.dataset.waBound = "1";
  const sync = ()=>{
    syncRsvpWhatsappWarn(formNode);
    markEditorDirty(formNode);
    schedulePreviewUpdate(formNode);
  };
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  syncRsvpWhatsappWarn(formNode);
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
    letter.media = migrateLetterMediaSection(letter)
      .map(item=>({ ...item, url:stripBlob(item.url) }))
      .filter(item=>item.url);
    const first = letter.media[0];
    if(first){
      letter.media_type = first.type;
      letter.media_url = first.url;
      letter.media_title = first.title || "";
    }else{
      letter.media_type = "";
      letter.media_url = "";
      letter.media_title = "";
    }
  }
  if(sections.gallery?.media){
    sections.gallery.media = sections.gallery.media
      .filter(item=>item.type === "image" && !String(item?.url || "").startsWith("blob:"));
    sections.gallery.images = sections.gallery.media.map(item=>item.url);
  }
  if(sections.video){
    sections.video.video_url = stripBlob(sections.video.video_url);
  }
  if(sections.music){
    sections.music.audio_url = stripBlob(sections.music.audio_url);
    sections.music.image_url = stripBlob(sections.music.image_url);
  }
  for(const key of LIST_SECTION_KEYS){
    if(sections[key]?.items){
      sections[key].items = sections[key].items.filter(item=>!String(item?.url || item?.image_url || "").startsWith("blob:"));
    }
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
    sections[key] = readSectionFromForm(form, key, formNode);
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
  const musicMedia = readGalleryMedia(formNode,"music");
  const musicFirst = musicMedia[0];
  sections.music = {
    ...sections.music,
    media:musicMedia,
    audio_url:musicFirst?.url || "",
    audio_title:musicFirst?.title || "",
    audio_description:musicFirst?.description || "",
    image_url:String(form.get("section_music_image_url") || sections.music.image_url || "").trim()
  };
  const videoMedia = readGalleryMedia(formNode,"video");
  const videoFirst = videoMedia[0];
  sections.video = {
    ...sections.video,
    media:videoMedia,
    video_url:videoFirst?.url || "",
    video_title:videoFirst?.title || "",
    video_description:videoFirst?.description || ""
  };
  for(const key of LIST_SECTION_KEYS){
    sections[key] = {
      ...sections[key],
      items:readListItems(formNode,key)
    };
  }
  sections.letter_future = {
    ...sections.letter_future,
    media:readGalleryMedia(formNode,"letter_future")
  };
  const letterFirst = sections.letter_future.media[0];
  sections.letter_future.media_type = letterFirst?.type || "";
  sections.letter_future.media_url = letterFirst?.url || "";
  sections.letter_future.media_title = letterFirst?.title || "";
  return {
    title:String(form.get("title") || "").trim(),
    type:normalizeMomentType(form.get("moment_type")),
    subtitle:String(form.get("subtitle") || "").trim(),
    // name distinto da eventuali altri "description" (es. ticket assistenza)
    description:String(form.get("page_description") || form.get("description") || "").trim(),
    pill:String(form.get("pill") || "").trim(),
    cover_url:String(form.get("cover_url") || "").trim(),
    cover_focus_x:Number(form.get("cover_focus_x") || 50),
    cover_focus_y:Number(form.get("cover_focus_y") || 50),
    cover_zoom:Math.min(200, Math.max(100, Number(form.get("cover_zoom") || 100))),
    profile_photo:"",
    colorPalette:canonicalizePalette(String(form.get("color_palette") || "verde")),
    themeVariant:String(form.get("theme_variant") || "chiaro"),
    heroStyle:String(form.get("hero_style") || "classico"),
    heroCut:String(form.get("hero_cut") || "dritto"),
    heroFade:String(form.get("hero_fade") || "on") !== "off",
    fontPair:String(form.get("font_pair") || "classic"),
    pageDecor:"none",
    show_together_counter:form.get("show_together_counter") === "on",
    together_since:String(form.get("together_since") || "").trim(),
    counter_label:String(form.get("counter_label") || "").trim(),
    show_counter_hms:form.get("show_counter_hms") === "on",
    anniversary_emails:form.get("anniversary_emails") === "on",
    theme:String(form.get("page_theme") || "classic"),
    sectionOrder:sectionOrder.filter(key => !isSectionExcluded(key)),
    pinned_sections:String(form.get("pinned_sections") || "")
      .split(",")
      .map(value=>value.trim())
      .filter(key => key && !isSectionExcluded(key)),
    sections: (()=>{
      const next = { ...sections };
      for(const key of Object.keys(next)){
        if(isSectionExcluded(key) && next[key]) next[key] = { ...next[key], enabled:false };
      }
      return next;
    })()
  };
}

function markEditorDirty(formNode){
  // Dirty immediato: evita JSON.stringify a ogni keystroke (costoso su form grandi)
  if(!editorDirty){
    editorDirty = true;
    updateSaveStatus(false);
    const flag = document.getElementById("unsavedFlag");
    if(flag) flag.hidden = false;
  }
  clearTimeout(markEditorDirty.timer);
  markEditorDirty.timer = setTimeout(()=>{
    if(!formNode) return;
    try{
      const snapshot = JSON.stringify(readFormState(formNode));
      editorDirty = snapshot !== savedEditorSnapshot;
      updateSaveStatus(!editorDirty);
      const flag = document.getElementById("unsavedFlag");
      if(flag) flag.hidden = !editorDirty;
    }catch{
      /* ignore parse errors during typing */
    }
  },900);
}

function shouldLivePreview(){
  if(window.matchMedia("(max-width:768px)").matches){
    return Boolean(document.getElementById("momentEditorShell")?.classList.contains("show-preview"));
  }
  return Boolean(document.getElementById("momentPreview"));
}

function schedulePreviewUpdate(formNode,options = {}){
  if(!options.force && !shouldLivePreview()) return;
  clearTimeout(previewDebounceTimer);
  const delay = options.immediate ? 100 : 700;
  previewDebounceTimer = setTimeout(()=>{
    let state;
    try{
      state = readFormState(formNode);
    }catch{
      return;
    }
    const hash = JSON.stringify(state);
    if(!options.force && hash === lastPreviewHash) return;
    lastPreviewHash = hash;
    renderPreview(state,{ force:options.force });
  },delay);
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

function ensurePreviewShell(preview){
  let stage = preview.querySelector("#previewLiveStage");
  if(!stage){
    preview.innerHTML = `<div class="preview-label">
      <span data-i18n="shell.live_preview">${esc(t("shell.live_preview"))}</span>
      <span class="preview-live-status"></span>
    </div>
    <div class="preview-live-wrap">
      <div class="preview-live-stage" id="previewLiveStage">
        <iframe class="preview-live-iframe" title="${esc(t("shell.preview_iframe"))}" data-i18n-title="shell.preview_iframe"></iframe>
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
        description:state.description || state.subtitle,
        slug:rows.find(item=>item.id === activeId)?.slug || "",
        page_state:state
      })
    });
    if(requestId !== previewFetchId) return;
    if(response.status === 429) throw new Error("Troppe anteprime — attendi un attimo.");
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
}

async function saveMoment(event,row){
  event.preventDefault();
  const formNode = event.currentTarget || document.getElementById("momentEditorForm");
  if(!formNode) return;
  let state;
  try{
    state = sanitizeStateForSave(readFormState(formNode));
  }catch(error){
    showEditorSaveFeedback(error.message || t("save.check_fields"),"error");
    return;
  }
  if(!adminMode){
    state.type = lockedMomentType(row);
  }
  const pin = String(new FormData(formNode).get("access_pin") || "").trim();
  const publicVisible = new FormData(formNode).get("public_visible") === "true";
  const pinEnabled = new FormData(formNode).get("pin_enabled") === "true";
  if(!state.title) return showEditorSaveFeedback(t("save.need_title"),"error");
  if(state.sections?.letter_future?.enabled){
    const letter = state.sections.letter_future;
    const hasLetter = Boolean(String(letter.body || "").trim() || letter.unlock_date || migrateLetterMediaSection(letter).length);
    if(!hasLetter){
      return showEditorSaveFeedback(t("save.letter_empty"),"error");
    }
    if(letter.media?.some(item=>String(item?.url || "").startsWith("blob:"))){
      return showEditorSaveFeedback(t("save.letter_blob"),"error");
    }
  }
  // Senza WhatsApp: spegni RSVP in automatico (niente blocco, UX semplice)
  let rsvpAutoOff = false;
  if(state.sections?.rsvp){
    // Preferisci il valore live del campo (iOS / pannelli nascosti)
    const liveWa = String(formNode.querySelector('[name="section_rsvp_whatsapp_number"]')?.value || "").trim();
    const wa = normalizeWhatsAppDigits(liveWa || state.sections.rsvp.whatsapp_number);
    state.sections.rsvp.whatsapp_number = wa;
    if(formNode.querySelector('[name="section_rsvp_whatsapp_number"]') && wa){
      formNode.querySelector('[name="section_rsvp_whatsapp_number"]').value = wa;
    }
    if(state.sections.rsvp.enabled && (!wa || wa.length < 10)){
      state.sections.rsvp.enabled = false;
      rsvpAutoOff = true;
      const enabledInput = formNode.querySelector('[name="section_rsvp_enabled"]');
      if(enabledInput){
        enabledInput.checked = false;
        syncSectionToggleButtons(formNode, "rsvp");
      }
      if(pinnedExtraSections.includes("rsvp")){
        pinnedExtraSections = pinnedExtraSections.filter(item => item !== "rsvp");
        syncPinnedSectionsInput(formNode);
      }
      state.pinned_sections = [...pinnedExtraSections];
      syncRsvpWhatsappWarn(formNode);
      syncEditorKitUi(formNode);
    }
  }
  showEditorSaveFeedback(rsvpAutoOff ? t("save.saving_rsvp_off") : t("save.saving"),"");
  try{
    let pinHash = null;
    if(pin){
      try{
        pinHash = await momentPinHash(row.slug,validatePin(pin));
        rememberPin(row.id,pin);
      }catch(pinError){
        return showEditorSaveFeedback(pinError.message || t("save.pin_invalid"),"error");
      }
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
      showEditorSaveFeedback(error.message || t("save.fail"),"error");
      return;
    }
    savedEditorSnapshot = JSON.stringify(state);
    lastPreviewHash = savedEditorSnapshot;
    lastSavedMomentType = normalizeMomentType(state.type);
    currentMomentType = lastSavedMomentType;
    editorDirty = false;
    updateSaveStatus(true);
    const barMsg = document.querySelector("#momentsSaveBar .save-msg");
    if(barMsg){
      barMsg.setAttribute("data-i18n-html", "shell.save_bar");
      barMsg.innerHTML = t("shell.save_bar");
    }
    localStorage.setItem(onboardingKey(row.id),"done");
    showEditorSaveFeedback(
      rsvpAutoOff
        ? t("save.ok_rsvp_off")
        : t("save.ok"),
      "ok"
    );
    const hint = document.getElementById("editorActionHint");
    if(hint) hint.hidden = true;
    // Soft update: niente reload completo dell'editor (più fluido)
    Object.assign(row,{
      title:state.title,
      description:state.description,
      moment_type:state.type,
      event_type:state.type,
      public_visible:publicVisible,
      pin_enabled:pinEnabled,
      page_state:state
    });
    const rowIndex = rows.findIndex(item=>item.id === row.id);
    if(rowIndex >= 0) rows[rowIndex] = row;
    refreshObjectsSwitcher();
    const titleNode = detail.querySelector(".detail-head h2");
    if(titleNode) titleNode.textContent = state.title || row.slug;
    detail.querySelectorAll(".status-pill.live, .status-pill.draft").forEach(pill=>{
      const isLive = publicVisible;
      pill.className = `status-pill ${isLive ? "live" : "draft"}`;
      pill.textContent = isLive ? t("shell.published") : t("shell.draft");
    });
    detail.querySelectorAll(".status-pill.pin").forEach(pill=>{
      pill.textContent = pinEnabled ? t("shell.pin_on") : t("shell.pin_off");
    });
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
      ? t("save.fail_network")
      : (error?.message || t("save.fail"));
    showEditorSaveFeedback(msg,"error");
  }
}

supabase = createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
bindUploadClient(supabase);
warmUploadPipeline();
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
  if(!email) return setStatus(statusNode,t("auth.msg.email_required"),"error");
  setStatus(statusNode,t("auth.msg.forgot_sending"));
  const { error } = await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectTo("/moments.html")});
  setStatus(statusNode,error ? (error.message || t("auth.msg.forgot_fail")) : t("auth.msg.forgot_sent"), error ? "error" : "ok");
});

recoveryForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  setStatus(statusNode,t("auth.msg.password_updating"));
  const { error } = await supabase.auth.updateUser({password:document.getElementById("momentsRecoveryPassword").value});
  if(error) return setStatus(statusNode,error.message || t("auth.msg.password_update_fail"),"error");
  recoveryMode = false;
  showAuthTab("login");
  setStatus(statusNode,t("auth.msg.password_updated"),"ok");
});

loginForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  setStatus(statusNode,t("auth.msg.login_busy"));
  try{
    const { data,error } = await supabase.auth.signInWithPassword({
      email:document.getElementById("momentsEmail").value.trim().toLowerCase(),
      password:document.getElementById("momentsPassword").value
    });
    if(error) return setStatus(statusNode,error.message || t("auth.msg.login_fail"),"error");
    const user = data.session?.user || data.user;
    if(!user) return setStatus(statusNode,t("auth.msg.session_missing"),"error");
    await showApp(user);
    setStatus(statusNode,"");
  }catch(error){
    console.error(error);
    setStatus(statusNode,error.message || t("auth.msg.login_unexpected"),"error");
  }
});

document.getElementById("signupNextStep")?.addEventListener("click",async()=>{
  const code = normalizeCode(document.getElementById("momentsSignupCode").value);
  if(!isValidMomentCode(code)) return setStatus(statusNode,t("auth.msg.code_invalid_example"),"error");
  setStatus(statusNode,t("auth.msg.code_checking"));
  try{
    const { data,error } = await supabase.rpc("peek_moment_activation_code",{ p_code:code });
    if(error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if(!row?.product_type){
      return setStatus(statusNode,t("auth.msg.code_not_found"),"error");
    }
    if(String(row.status || "") === "claimed"){
      return setStatus(statusNode,t("auth.msg.code_claimed"),"error");
    }
    if(row.status && String(row.status) !== "available"){
      return setStatus(statusNode,t("auth.msg.code_unavailable"),"error");
    }
    setStatus(statusNode,"");
    setSignupStep(2);
    await refreshActivationCodeTypeHint(code, document.getElementById("momentsSignupTypeHint"));
  }catch(error){
    console.error(error);
    setStatus(statusNode,error.message || t("auth.msg.code_check_fail"),"error");
  }
});

document.getElementById("signupPrevStep")?.addEventListener("click",()=>setSignupStep(1));

signupForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  const email = document.getElementById("momentsSignupEmail").value.trim().toLowerCase();
  const code = normalizeCode(document.getElementById("momentsSignupCode").value);
  const title = document.getElementById("momentsSignupTitle").value.trim();
  const pin = document.getElementById("momentsSignupPin").value.trim();
  const legalOk = Boolean(document.getElementById("momentsSignupLegal")?.checked);
  if(!isValidMomentCode(code)) return setStatus(statusNode,t("auth.msg.code_invalid"),"error");
  if(!title) return setStatus(statusNode,t("auth.msg.page_title_required"),"error");
  if(!legalOk) return setStatus(statusNode,t("auth.msg.legal_required"),"error");
  try{ validatePin(pin); }catch(error){ return setStatus(statusNode,error.message,"error"); }
  storePendingMomentActivation({ code, title, pin });
  setStatus(statusNode,t("auth.msg.signup_busy"));
  const { data,error } = await supabase.auth.signUp({
    email,
    password:document.getElementById("momentsSignupPassword").value,
    options:{
      emailRedirectTo:authRedirectTo("/moments.html"),
      data:{
        full_name:document.getElementById("momentsSignupName").value.trim(),
        product_area:"moments",
        pending_moment_code:code,
        pending_moment_title:title
      }
    }
  });
  if(error) return setStatus(statusNode,error.message || t("auth.msg.signup_fail"),"error");
  if(data.session?.user){
    try{
      const item = await activateCode({code,title,pin});
      clearPendingMomentActivation();
      activeId = item.event_id || "";
      rememberPin(activeId,pin);
      setStatus(statusNode,t("auth.msg.signup_ok_linked"),"ok");
    }catch(activationError){
      console.error(activationError);
      setStatus(statusNode,activationError.message || t("auth.msg.signup_ok_unlink"),"error");
    }
    await showApp(data.session.user);
    if(activeId) showPinSuccessBanner(activeId,pin,title);
  }else{
    setStatus(statusNode,t("auth.msg.signup_confirm_email"),"ok");
  }
});

document.getElementById("momentsLogout")?.addEventListener("click",async()=>{
  await supabase.auth.signOut();
  activeId = "";
  rows = [];
  showAuthTab("login");
  showAuth(t("auth.msg.session_closed"));
});

window.addEventListener("beforeunload",event=>{
  if(editorDirty) event.preventDefault();
});

/* i18n: register + bind AFTER lets/consts init (TDZ-safe). Never block boot. */
registerMessages("it", AUTH_MESSAGES_IT);
registerMessages("en", AUTH_MESSAGES_EN);
registerMessages("it", SHELL_MESSAGES_IT);
registerMessages("en", SHELL_MESSAGES_EN);
registerMessages("it", SAVE_MESSAGES_IT);
registerMessages("en", SAVE_MESSAGES_EN);
registerMessages("it", NAV_MESSAGES_IT);
registerMessages("en", NAV_MESSAGES_EN);
registerMessages("it", SECTION_MESSAGES_IT);
registerMessages("en", SECTION_MESSAGES_EN);
applyDocumentLang(getUiLocale());

function syncLangSwitchers(locale = getUiLocale()){
  document.querySelectorAll("[data-lang-switch]").forEach(root=>{
    root.setAttribute("aria-label", t("lang.switch"));
    root.querySelectorAll("[data-set-locale]").forEach(btn=>{
      const code = btn.getAttribute("data-set-locale");
      const active = code === locale;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  });
  applyChromeI18n(document);
  try{
    refreshShellChrome();
    refreshNavChrome();
    syncFieldChromeI18n(document.getElementById("momentEditorForm") || document);
    const editorForm = document.getElementById("momentEditorForm");
    if(editorForm){
      for(const key of LIST_SECTION_KEYS) renderListItems(editorForm, key);
    }
    if(currentUser) refreshAccountMenu();
    if(appView === "account") renderAccountPanels();
    if(document.getElementById("emptyActivationForm")) renderEmptyState();
  }catch(error){
    console.warn("i18n refresh", error);
  }
}

function bindLangSwitchers(){
  document.querySelectorAll("[data-set-locale]").forEach(btn=>{
    if(btn.dataset.langBound === "1") return;
    btn.dataset.langBound = "1";
    btn.addEventListener("click",()=>{
      const code = btn.getAttribute("data-set-locale");
      if(!code || code === getUiLocale()) return;
      setUiLocale(code);
    });
  });
  onUiLocaleChange(syncLangSwitchers);
  syncLangSwitchers();
}

bindLangSwitchers();

try{
  const { data,error } = await supabase.auth.getSession();
  if(error) throw error;
  if(data.session?.user){
    await showApp(data.session.user);
  }else{
    showAuth();
    const params = new URLSearchParams(location.search);
    if(!params.get("code") && params.get("tab") !== "signup"){
      showAuthTab("login");
    }
  }
}catch(error){
  console.error(error);
  showAuth();
  showAuthTab("login");
  setStatus(statusNode,t("auth.msg.session_check_fail"),"error");
}

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
