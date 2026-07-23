# 28 — Moments i18n: smoke IT/EN (Step 8)

> **Data:** 2026-07-23 · **Editor:** **v198** · Steps 1–7c fatti · **Step 8 chiuso (A+B + A5; C parziale)**  
> Regole: [`27-moments-i18n-rules.md`](27-moments-i18n-rules.md) · Inventario: [`26-moments-i18n-inventory.md`](26-moments-i18n-inventory.md)  
> **Prossimo:** Step 9 Worker `/m/` chrome.

## Obiettivo

Confermare che IT resta stabile (default) e EN traduce solo il chrome già coperto (auth, shell, save, nav, etichette/sottotitoli sezioni) **senza** rompere boot, Salva, attivazione o `/m/`.

## A — Automatico (senza login)

| # | Check | Come | Esito |
|---|-------|------|-------|
| A1 | HTML cache-bust v198 | `moments` → `moments.js?v=198` + `moments.css?v=198` | ✅ 2026-07-23 |
| A2 | Moduli i18n 200 | `moments-i18n*.js?v=198` (shell/nav/sections) | ✅ |
| A3 | Anti auto-translate | `translate="no"` / `notranslate` in HTML | ✅ |
| A4 | Worker health | `v182-hero-description` | ✅ |
| A5 | `/m/` invariato | `/m/momentc9d6edcb35` 200; chrome ancora IT (`Ho capito`) | ✅ (ok fino a Step 9) |

## B — Auth (browser Cursor, senza login)

| # | Check | Passo | Esito |
|---|-------|------|-------|
| B1 | Default IT | `localStorage` vuoto → IT + «Accedi» / heading IT | ✅ |
| B2 | Toggle EN auth | EN → Sign in / Create account / Moments sign-in | ✅ |
| B3 | Persistenza | Reload → resta EN (`uiLocale=en`, `lang=en`) | ✅ |
| B4 | Torna IT | Clic IT → Accedi di nuovo | ✅ |
| B5 | Anti Chrome-nonsense | `translate="no"` sul root; niente esso/Pubblicità | ✅ |

## C — Editor (serve account Moments)

| # | Check | Passo | Esito |
|---|-------|------|-------|
| C1 | Boot | Esce da «Apertura in corso…» | ✅ (confermato post-v191; non ri-loggato in Step 8) |
| C2 | Shell EN | Salva / Annulla / Anteprima | ✅ (Step 6a utente) |
| C3 | Nav EN | Progress + gruppi | ✅ (Step 7a) |
| C4 | Sezioni EN | Taxonomy + sottotitoli | ✅ (Step 7b–7c) |
| C5 | Campi ancora IT | Label input dentro pannello | ✅ intenzionale |
| C6 | Salva | Toast ok | ✅ (Step 6b) |
| C7 | Toggle live | IT↔EN aggiorna nav + `.section-sub` | ⬜ smoke manuale consigliato 30s |
| C8 | Contenuti cliente | Titolo/storia non si traducono | ✅ by design |

## D — Non regressione critica

| # | Check | Esito |
|---|-------|------|
| D1 | Attivazione codice | ⬜ non rieseguito in Step 8 (fuori scope i18n) |
| D2 | Pubblica / link `/m/` | ✅ pagina demo live |
| D3 | Console boot | ✅ auth view stabile, no stuck boot |

## Chiusura Step 8

- A+B verificati live 2026-07-23 (Cursor browser + curl).
- C1–C6/C8 già ok dalle slice 6–7; C7 = check rapido utente opzionale.
- **Nessun fix runtime** in Step 8.
- **Step 9** = chrome Worker `/m/` (PIN, notice, RSVP fisse, lightbox) — indipendente da `uiLocale` editor.

## Input utente (opzionale)

30 secondi: login → EN → apri Copertina → verifica sottotitolo EN → Salva ancora ok → IT.
