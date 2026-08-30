export const SUPABASE_URL = "https://cuxlwaocjqwzluycznyp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xsF5dF1UxUxUSE1EF6tz1w_qM6qiv1h";

/** Worker pubblico: pagine /p/, /m/, redirect NFC /k/, CDN media /cdn/ */
export const WORKER_BASE_URL = "https://link.khamakeymoments.com";

/** Cloudflare Pages: app editor, admin, moments, asset CSS snapshot */
export const PAGES_BASE_URL = "https://app.khamakeymoments.com";

/** Path canonico Moments dopo conferma email / recovery (live: /moments, non Business /). */
export const MOMENTS_AUTH_PATH = "/moments";

/**
 * URL di ritorno per signup, conferma email e reset password (Supabase Auth).
 * Preferisce l'origine corrente se già sul dominio custom; altrimenti PAGES_BASE_URL.
 * Per Moments usare sempre MOMENTS_AUTH_PATH — mai "/" (quella è la shell Business).
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

/** Redirect Auth Moments: sempre app.khamakeymoments.com/moments (mai Site URL Business). */
export function momentsAuthRedirectTo() {
  return authRedirectTo(MOMENTS_AUTH_PATH) || `${PAGES_BASE_URL}${MOMENTS_AUTH_PATH}`;
}
