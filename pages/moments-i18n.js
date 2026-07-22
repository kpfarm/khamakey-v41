/**
 * Moments editor UI locale (IT / EN) — ADR-007 / docs/27-moments-i18n-rules.md
 *
 * Step 3: infrastructure only. Dictionaries grow in steps 5–7.
 * Default always "it". Preference only via setUiLocale (explicit user action).
 */

export const UI_LOCALE_STORAGE_KEY = "khamakey.moments.uiLocale";
export const UI_LOCALES = Object.freeze(["it", "en"]);

/** Italian is source of truth. EN may omit keys → fallback IT. */
export const messages = {
  it: {
    "boot.opening": "Apertura in corso…",
    "boot.wait": "Attendere qualche istante.",
    "common.save": "Salva",
    "common.cancel": "↩ Annulla",
    "common.close": "Chiudi",
    "common.copy": "Copia",
    "common.loading": "Caricamento...",
    "lang.it": "Italiano",
    "lang.en": "English",
    "lang.switch": "Lingua"
  },
  en: {
    "boot.opening": "Opening…",
    "boot.wait": "Just a moment.",
    "common.save": "Save",
    "common.cancel": "↩ Undo",
    "common.close": "Close",
    "common.copy": "Copy",
    "common.loading": "Loading...",
    "lang.it": "Italiano",
    "lang.en": "English",
    "lang.switch": "Language"
  }
};

const listeners = new Set();

export function normalizeUiLocale(value) {
  const code = String(value || "").trim().toLowerCase().slice(0, 2);
  return UI_LOCALES.includes(code) ? code : "it";
}

/** Read preference. Missing/invalid → always "it" (no Accept-Language). */
export function getUiLocale() {
  try {
    return normalizeUiLocale(localStorage.getItem(UI_LOCALE_STORAGE_KEY));
  } catch {
    return "it";
  }
}

/**
 * Persist explicit choice and notify listeners.
 * @param {"it"|"en"|string} locale
 * @returns {"it"|"en"}
 */
export function setUiLocale(locale) {
  const next = normalizeUiLocale(locale);
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, next);
  } catch {
    /* private mode / blocked storage — still apply in-memory via listeners */
  }
  applyDocumentLang(next);
  for (const fn of listeners) {
    try { fn(next); } catch (error) { console.warn("moments-i18n listener", error); }
  }
  return next;
}

export function onUiLocaleChange(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyDocumentLang(locale = getUiLocale()) {
  const code = normalizeUiLocale(locale);
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = code;
  }
  return code;
}

/**
 * Translate UI chrome key. Missing EN → IT. Missing both → key (dev signal).
 * Vars: t("hello.name", { name: "Ada" }) with "{name}" in string.
 */
export function t(key, vars) {
  const k = String(key || "");
  const locale = getUiLocale();
  const table = messages[locale] || messages.it;
  let text = table[k];
  if (text == null || text === "") {
    text = messages.it[k];
  }
  if (text == null || text === "") {
    return k;
  }
  if (vars && typeof vars === "object") {
    return String(text).replace(/\{(\w+)\}/g, (_, name) => {
      const value = vars[name];
      return value == null ? "" : String(value);
    });
  }
  return String(text);
}

/** Merge more keys later (steps 5–7) without replacing the module. */
export function registerMessages(locale, dict) {
  const code = normalizeUiLocale(locale);
  if (!messages[code]) messages[code] = {};
  Object.assign(messages[code], dict || {});
}

/**
 * Apply data-i18n* attributes when present (used from step 4+).
 * - data-i18n="key" → textContent
 * - data-i18n-html="key" → innerHTML (trusted dictionary only)
 * - data-i18n-placeholder="key" → placeholder
 * - data-i18n-aria="key" → aria-label
 * - data-i18n-title="key" → title
 */
export function applyChromeI18n(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
}
