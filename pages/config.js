export const SUPABASE_URL = "https://cuxlwaocjqwzluycznyp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xsF5dF1UxUxUSE1EF6tz1w_qM6qiv1h";

/** Worker pubblico: pagine /p/, /m/, redirect NFC /k/, CDN media /cdn/ */
export const WORKER_BASE_URL = "https://link.khamakeymoments.com";

/** Cloudflare Pages: app editor, admin, moments, asset CSS snapshot */
export const PAGES_BASE_URL = "https://app.khamakeymoments.com";

/**
 * URL di ritorno per signup, conferma email e reset password (Supabase Auth).
 * Preferisce l'origine corrente se già sul dominio custom; altrimenti PAGES_BASE_URL.
 */
export function authRedirectTo(path = "") {
  if (typeof location !== "undefined" && location.protocol === "file:") return undefined;
  if (typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    return `${location.origin}${path}`;
  }
  if (typeof location !== "undefined" && location.hostname.endsWith("khamakeymoments.com")) {
    return `${location.origin}${path}`;
  }
  return `${PAGES_BASE_URL}${path}`;
}
