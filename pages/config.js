export const SUPABASE_URL = "https://cuxlwaocjqwzluycznyp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xsF5dF1UxUxUSE1EF6tz1w_qM6qiv1h";

/** Worker pubblico: pagine /p/, /m/, redirect NFC /k/, CDN media /cdn/ */
export const WORKER_BASE_URL = "https://khamakey-nfc.khamakey-nfc.workers.dev";

/** Cloudflare Pages: app editor, admin, moments, asset CSS snapshot */
export const PAGES_BASE_URL = "https://khamakey-app.pages.dev";

/**
 * URL di ritorno per signup, conferma email e reset password (Supabase Auth).
 * Fino a domini custom attivi: sempre Pages .dev, non app.khamakey.it.
 */
export function authRedirectTo(path = "") {
  if (typeof location !== "undefined" && location.protocol === "file:") return undefined;
  if (typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    return `${location.origin}${path}`;
  }
  return `${PAGES_BASE_URL}${path}`;
}
