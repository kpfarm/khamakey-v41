/** Estrazione e applicazione traduzioni pagina Business — editor + Worker. */
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./khamakey-i18n.js";

export const TARGET_LOCALES = ["en", "fr", "de", "es"];
export const AUTO_LOCALES = [DEFAULT_LOCALE, ...TARGET_LOCALES];

const FIELD_KEYS = [
  "nome", "desc", "aboutTitle", "aboutText",
  "bookingTitle", "bookingDesc", "welcomeTitle", "welcomeIntro"
];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function addString(map, path, value) {
  const text = cleanText(value);
  if (!text || text.length < 2) return;
  map[path] = text;
}

function hashText(text) {
  let hash = 0;
  const value = String(text || "");
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function normalizeCatalogItem(item = {}) {
  return {
    nome: item.nome || item.name || "",
    desc: item.desc || item.description || "",
    ingredienti: item.ingredienti || item.ingredients || ""
  };
}

function walkCatalog(map, prefix, catalogs = []) {
  catalogs.forEach((rawCat, ci) => {
    addString(map, `${prefix}.${ci}.nome`, rawCat?.nome);
    const items = rawCat?.voci || rawCat?.piatti || [];
    items.forEach((rawItem, vi) => {
      const item = normalizeCatalogItem(rawItem);
      addString(map, `${prefix}.${ci}.voci.${vi}.nome`, item.nome);
      addString(map, `${prefix}.${ci}.voci.${vi}.desc`, item.desc);
      addString(map, `${prefix}.${ci}.voci.${vi}.ingredienti`, item.ingredienti);
    });
  });
}

/** Estrae stringhe italiane traducibili da uno stato editor. */
export function extractTranslatableStrings(state = {}) {
  const map = {};
  const fields = state.fields || {};
  FIELD_KEYS.forEach(key => addString(map, `fields.${key}`, fields[key]));

  walkCatalog(map, "cats", state.cats);
  walkCatalog(map, "extraCatalogs", state.extraCatalogs);

  (state.promoItems || []).forEach((item, i) => {
    addString(map, `promoItems.${i}.title`, item?.title);
    addString(map, `promoItems.${i}.desc`, item?.desc);
    addString(map, `promoItems.${i}.label`, item?.label);
    addString(map, `promoItems.${i}.cta`, item?.cta);
    addString(map, `promoItems.${i}.note`, item?.note);
  });

  (state.eventItems || []).forEach((item, i) => {
    addString(map, `eventItems.${i}.title`, item?.title);
    addString(map, `eventItems.${i}.desc`, item?.desc);
    addString(map, `eventItems.${i}.location`, item?.location);
  });

  (state.documentItems || []).forEach((item, i) => {
    addString(map, `documentItems.${i}.title`, item?.title);
    addString(map, `documentItems.${i}.desc`, item?.desc);
  });

  (state.welcomeQuickItems || []).forEach((item, i) => {
    addString(map, `welcomeQuickItems.${i}.title`, item?.title);
    addString(map, `welcomeQuickItems.${i}.text`, item?.text);
  });

  (state.welcomePlaces || []).forEach((item, i) => {
    addString(map, `welcomePlaces.${i}.title`, item?.title);
    addString(map, `welcomePlaces.${i}.desc`, item?.desc);
  });

  (state.welcomeDocs || []).forEach((item, i) => {
    addString(map, `welcomeDocs.${i}.title`, item?.title);
    addString(map, `welcomeDocs.${i}.desc`, item?.desc);
  });

  return map;
}

function setByPath(target, path, value) {
  const parts = path.split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const index = Number(nextKey);
    if (Number.isInteger(index) && !Number.isNaN(index)) {
      if (!Array.isArray(node[key])) node[key] = [];
      if (!node[key][index]) node[key][index] = {};
      node = node[key][index];
      i += 1;
      continue;
    }
    if (!node[key] || typeof node[key] !== "object") node[key] = {};
    node = node[key];
  }
  const last = parts[parts.length - 1];
  if (node && typeof node === "object") node[last] = value;
}

/** Applica traduzioni { path: text } su una copia dello stato editor. */
export function applyTranslations(state = {}, translations = {}) {
  const next = structuredClone(state);
  Object.entries(translations || {}).forEach(([path, value]) => {
    const text = cleanText(value);
    if (!text) return;
    setByPath(next, path, text);
  });
  return next;
}

export function buildTranslationPayload(strings = {}) {
  return Object.fromEntries(
    Object.entries(strings).map(([path, text]) => [path, { text, hash: hashText(text) }])
  );
}

export function localeMeta(code) {
  return SUPPORTED_LOCALES.find(item => item.code === code) || { code, label: code, flag: code.toUpperCase() };
}

export function emptyI18nState() {
  return {
    enabled: false,
    fallback: "en",
    locales: [...AUTO_LOCALES],
    updatedAt: "",
    translations: {},
    snapshots: {}
  };
}
