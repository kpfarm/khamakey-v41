/** Lingue condivise KhamaKey — Business editor, admin, pagine pubbliche, catalogo. */
export const SUPPORTED_LOCALES = [
  { code: "it", label: "Italiano", flag: "IT", default: true },
  { code: "en", label: "English", flag: "EN" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "de", label: "Deutsch", flag: "DE" },
  { code: "es", label: "Español", flag: "ES" }
];

export const DEFAULT_LOCALE = "it";

export function normalizeLocale(value) {
  const code = String(value || DEFAULT_LOCALE).trim().toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.some(item => item.code === code) ? code : DEFAULT_LOCALE;
}

export function localeLabel(code) {
  return SUPPORTED_LOCALES.find(item => item.code === code)?.label || code;
}

/** Traduzione con fallback IT → chiave grezza. */
export function tt(lang, key, dictionary = KHAMakeyI18N) {
  const locale = normalizeLocale(lang);
  return dictionary[locale]?.[key] || dictionary[DEFAULT_LOCALE]?.[key] || key;
}

/** Etichette UI comuni + Moments (estendere per Worker / Shopify). */
export const KHAMakeyI18N = {
  it: {
    activate: "Attiva la tua pagina",
    orderConfirmed: "Ordine confermato",
    orderCode: "Codice ordine",
    activationHint: "Riceverai il codice di attivazione NFC via email.",
    shopNow: "Acquista",
    language: "Lingua"
  },
  en: {
    activate: "Activate your page",
    orderConfirmed: "Order confirmed",
    orderCode: "Order code",
    activationHint: "You will receive your NFC activation code by email.",
    shopNow: "Shop now",
    language: "Language"
  },
  fr: {
    activate: "Activez votre page",
    orderConfirmed: "Commande confirmée",
    orderCode: "Code commande",
    activationHint: "Vous recevrez votre code d'activation NFC par email.",
    shopNow: "Acheter",
    language: "Langue"
  },
  de: {
    activate: "Seite aktivieren",
    orderConfirmed: "Bestellung bestätigt",
    orderCode: "Bestellcode",
    activationHint: "Sie erhalten Ihren NFC-Aktivierungscode per E-Mail.",
    shopNow: "Kaufen",
    language: "Sprache"
  },
  es: {
    activate: "Activa tu página",
    orderConfirmed: "Pedido confirmado",
    orderCode: "Código de pedido",
    activationHint: "Recibirás tu código de activación NFC por email.",
    shopNow: "Comprar",
    language: "Idioma"
  }
};
