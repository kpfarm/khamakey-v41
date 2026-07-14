import {
  applyTranslations,
  extractTranslatableStrings,
  TARGET_LOCALES,
  emptyI18nState
} from "./business-i18n.js";
import { getUploadClient } from "./media-upload.js";
import { WORKER_BASE_URL } from "./config.js";

let pageI18n = emptyI18nState();
let workerBaseUrl = WORKER_BASE_URL;
let intlRunning = false;
let intlSyncTimer = null;
let intlSourceStrings = {};

const intlModal = document.getElementById("intlModal");
const intlProgressBar = document.getElementById("intlProgressBar");
const intlProgressLabel = document.getElementById("intlProgressLabel");
const intlProgressSub = document.getElementById("intlProgressSub");
const intlModalProgress = document.getElementById("intlModalProgress");
const intlModalSuccess = document.getElementById("intlModalSuccess");
const intlHeroPending = document.getElementById("intlHeroPending");
const intlHeroDone = document.getElementById("intlHeroDone");

function hooks() {
  return window.__khamakeyEditor || {};
}

function showToast(message, type = "ok") {
  hooks().showToast?.(message, type);
}

function collectState(includePublicSnapshot = false) {
  return hooks().collectState?.(includePublicSnapshot) || {};
}

function applyState(state) {
  hooks().applyState?.(state);
}

function buildPublicSnapshot() {
  return hooks().buildPublicSnapshot?.() || null;
}

function changed() {
  hooks().changed?.();
}

function setFieldValue(id, value) {
  hooks().setFieldValue?.(id, value);
}

function renderPublicPreview() {
  hooks().renderPublicPreview?.();
}

function enableAllLanguageToggles() {
  ["langIt", "langEn", "langFr", "langDe", "langEs"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });
  setFieldValue("defaultLang", "it");
}

function setPublicLang(locale) {
  if (hooks().setPublicLang) hooks().setPublicLang(locale);
}

function getPublicLang() {
  return hooks().getPublicLang?.() || "";
}

function updateIntlHero() {
  const enabled = Boolean(pageI18n.enabled);
  if (intlHeroPending) intlHeroPending.hidden = enabled;
  if (intlHeroDone) intlHeroDone.hidden = !enabled;
  const mainBtn = document.getElementById("btnInternationalMain");
  const switchLabel = document.getElementById("intlSwitchLabel");
  if (mainBtn) {
    mainBtn.classList.toggle("active", enabled);
    mainBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    mainBtn.title = enabled
      ? "Multilingua attivo: la pagina pubblica mostra il selettore lingua."
      : "Attiva il multilingua.";
  }
  if (switchLabel) {
    switchLabel.textContent = enabled ? "Multilingua attivo" : "Multilingua disattivo";
  }
  const welcomeLangField = document.getElementById("welcomeLangField");
  const intlStatusField = document.getElementById("intlStatusField");
  if (welcomeLangField) welcomeLangField.hidden = enabled;
  if (intlStatusField) intlStatusField.hidden = !enabled;
}

function hydrateI18nFromState(state = {}) {
  pageI18n = { ...emptyI18nState(), ...(state.i18n || {}) };
  intlSourceStrings = extractTranslatableStrings(state);
  updateIntlHero();
}

function attachI18nToState(state = {}) {
  return {
    ...state,
    i18n: {
      ...pageI18n,
      enabled: Boolean(pageI18n.enabled),
      fallback: pageI18n.fallback || "en",
      locales: pageI18n.locales || ["it", "en", "fr", "de", "es"],
      updatedAt: pageI18n.updatedAt || new Date().toISOString(),
      translations: pageI18n.translations || {},
      snapshots: pageI18n.snapshots || {}
    }
  };
}

function buildLocalizedSnapshots(translations = {}) {
  const backup = collectState();
  const snapshots = {};
  const savedPublicLang = getPublicLang();
  for (const locale of TARGET_LOCALES) {
    applyState(applyTranslations(backup, translations[locale] || {}));
    enableAllLanguageToggles();
    setPublicLang(locale);
    renderPublicPreview();
    const snapshot = buildPublicSnapshot();
    if (snapshot) {
      snapshots[locale] = { ...snapshot, version: "107" };
    }
  }
  applyState(backup);
  setPublicLang(savedPublicLang);
  renderPublicPreview();
  return snapshots;
}

function animateProgress(target, label, sub = "") {
  if (intlProgressBar) intlProgressBar.style.width = `${target}%`;
  if (intlProgressLabel) intlProgressLabel.textContent = `${target}%`;
  if (intlProgressSub && sub) intlProgressSub.textContent = sub;
}

function openIntlModal() {
  if (!intlModal) return;
  intlModal.hidden = false;
  intlModalProgress.hidden = false;
  intlModalSuccess.hidden = true;
  animateProgress(8, "8%", "Sto preparando le traduzioni...");
}

function closeIntlModal() {
  if (intlModal) intlModal.hidden = true;
}

async function authToken() {
  const client = getUploadClient();
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || "";
}

async function callInternationalize(strings) {
  const token = await authToken();
  if (!token) throw new Error("Accedi di nuovo per attivare le lingue.");
  const businessId = window.__khamakeyBusinessId || "";
  if (!businessId) throw new Error("Attività non collegata. Ricarica la pagina.");

  const response = await fetch(`${workerBaseUrl}/api/business/internationalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ business_id: businessId, strings })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Traduzione non riuscita.");
  return data;
}

async function callSyncTranslations(strings) {
  const token = await authToken();
  if (!token) return null;
  const businessId = window.__khamakeyBusinessId || "";
  if (!businessId || !Object.keys(strings).length) return null;
  const response = await fetch(`${workerBaseUrl}/api/business/sync-translations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ business_id: businessId, strings })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Aggiornamento traduzioni non riuscito.");
  return data;
}

function mergeTranslations(existing = {}, patch = {}) {
  const next = { ...existing };
  Object.entries(patch).forEach(([locale, map]) => {
    next[locale] = { ...(next[locale] || {}), ...(map || {}) };
  });
  return next;
}

async function runInternationalize({ quiet = false } = {}) {
  if (intlRunning) return;
  const strings = extractTranslatableStrings(collectState());
  if (!Object.keys(strings).length) {
    showToast("Aggiungi almeno nome o descrizione prima.", "err");
    return;
  }

  intlRunning = true;
  const mainBtn = document.getElementById("btnInternationalMain");
  const switchLabel = document.getElementById("intlSwitchLabel");
  if (mainBtn) {
    mainBtn.disabled = true;
    mainBtn.title = "Sto creando e salvando le traduzioni.";
  }
  if (switchLabel) {
    switchLabel.textContent = "Attivazione multilingua...";
  }
  if (!quiet) openIntlModal();

  try {
    animateProgress(18, "18%", "Sto preparando le traduzioni...");
    const progressTimer = setInterval(() => {
      const current = Number(String(intlProgressLabel?.textContent || "18").replace("%", "")) || 18;
      if (current < 42) animateProgress(current + 4, `${current + 4}%`, "Sto preparando le traduzioni...");
    }, 900);

    const data = await callInternationalize(strings);
    clearInterval(progressTimer);
    animateProgress(58, "58%", "Sto controllando che tutto sia corretto...");

    const translations = data.translations || {};
    const snapshots = buildLocalizedSnapshots(translations);
    animateProgress(86, "86%", "Quasi pronto...");

    pageI18n = {
      enabled: true,
      fallback: "en",
      locales: ["it", "en", "fr", "de", "es"],
      updatedAt: new Date().toISOString(),
      translations,
      snapshots
    };
    intlSourceStrings = { ...strings };
    enableAllLanguageToggles();
    updateIntlHero();

    const nextState = attachI18nToState(collectState(true));
    applyState(nextState);
    changed();
    animateProgress(100, "100%", "Pagina pronta!");

    if (!quiet) {
      intlModalProgress.hidden = true;
      intlModalSuccess.hidden = false;
    } else {
      closeIntlModal();
      showToast("Le traduzioni sono state aggiornate.", "ok");
    }
  } catch (error) {
    closeIntlModal();
    showToast(error.message || "Traduzione non riuscita.", "err");
  } finally {
    intlRunning = false;
    const mainBtn = document.getElementById("btnInternationalMain");
    if (mainBtn) mainBtn.disabled = false;
    updateIntlHero();
  }
}

function dirtyIntlStrings() {
  const current = extractTranslatableStrings(collectState());
  const dirty = {};
  Object.entries(current).forEach(([path, text]) => {
    if (intlSourceStrings[path] !== text) dirty[path] = text;
  });
  return dirty;
}

async function runIntlBackgroundSync() {
  if (!pageI18n.enabled || intlRunning) return;
  const dirty = dirtyIntlStrings();
  if (!Object.keys(dirty).length) return;
  try {
    const data = await callSyncTranslations(dirty);
    if (!data?.translations) return;
    pageI18n.translations = mergeTranslations(pageI18n.translations, data.translations);
    pageI18n.snapshots = buildLocalizedSnapshots(pageI18n.translations);
    pageI18n.updatedAt = new Date().toISOString();
    Object.assign(intlSourceStrings, dirty);
    const nextState = attachI18nToState(collectState(true));
    applyState(nextState);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "khamakey:dirty", state: nextState }, "*");
    }
    showToast("Le traduzioni sono state aggiornate.", "ok");
  } catch (error) {
    console.warn("intl background sync", error);
  }
}

function scheduleIntlBackgroundSync() {
  if (!pageI18n.enabled) return;
  clearTimeout(intlSyncTimer);
  intlSyncTimer = setTimeout(runIntlBackgroundSync, 12000);
}

function bindButtons() {
  ["btnInternationalMain", "btnInternationalRefresh"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", () => runInternationalize({ quiet: id === "btnInternationalRefresh" }));
  });
  document.getElementById("intlModalDone")?.addEventListener("click", closeIntlModal);
  document.getElementById("intlModalBackdrop")?.addEventListener("click", event => {
    if (event.target.id === "intlModalBackdrop" && !intlRunning) closeIntlModal();
  });
}

window.__khamakeyIntl = {
  hydrateI18nFromState,
  attachI18nToState,
  scheduleIntlBackgroundSync,
  getState: () => pageI18n
};

window.addEventListener("message", event => {
  const validOrigin = location.protocol === "file:" ? event.origin === "null" : event.origin === location.origin;
  if (!validOrigin || event.source !== window.parent) return;
  if (event.data?.type === "khamakey:load-state") {
    if (event.data.workerUrl) workerBaseUrl = event.data.workerUrl;
    hydrateI18nFromState(event.data.state || {});
  }
});

window.addEventListener("khamakey:intl-dirty", scheduleIntlBackgroundSync);

bindButtons();
updateIntlHero();
