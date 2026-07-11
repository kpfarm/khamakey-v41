# KhamaKey — Stato del progetto

> **Leggi questo file per primo** in ogni sessione AI.  
> Ultimo aggiornamento: **2026-07-11** (security hardening — **DEPLOYATO e verificato in produzione**)

---

## ✅ Security hardening deployato (2026-07-11)

Audit di sicurezza (Claude Code) + follow-up (Codex, Antigravity). Tutto committato su `main`, SQL v37→v78 applicata su Supabase (`cuxlwaocjqwzluycznyp`), Worker deployato (`v118-moments-premium-css`). Verificato con smoke test su un evento reale, non solo assunto.

### 🔴 Incidente in produzione, risolto in giornata

`get_public_moment` (v75, versione Codex) aveva un bug reale: colonna `slug` ambigua tra output della funzione e tabella `moment_pin_attempts` → **HTTP 500 su ogni pagina Moments con PIN attivo** (RSVP, guestbook, page view inclusi), dal momento in cui v75 è stata applicata stamattina fino alla scoperta via smoke test nel pomeriggio. Fix: `sql/khamakey-pin-ambiguity-fix-v78.sql` (`#variable_conflict use_column`), applicato e verificato — pagina PIN-gated ora risponde 401 con form PIN, nessun contenuto trapelato, RSVP risponde 404 corretto invece di 500. **Lezione**: da ora, ogni migrazione che tocca `get_public_moment` o simili va testata con uno slug reale prima di considerarla chiusa, non solo con `execute_sql` su input sintetici.

### Cosa contiene l'hardening (in ordine di severità)

- **`get_public_moment` non restituisce più `state`/titolo/indirizzo se il PIN è errato o assente** — prima li restituiva sempre, il PIN era solo un flag lato client. Nessun PIN esistente invalidato (stesso schema hash).
- Rate limit lockout su tentativi PIN Moments per slug + visitatore (20/15min), su RSVP/guestbook/prenotazioni (5/15min), upload media (30/h), analytics pubblici (120/15min), traduzioni OpenAI (10/h) — tutto via Postgres, zero infra nuova. Pulizia automatica giornaliera (v77) agganciata al cron esistente.
- RLS abilitata su `platform_webhook_events` (mancava); `business_page_i18n` pubblico ristretto alle sole aziende con i18n abilitato.
- Firma webhook verificata per Resend (Svix) e PayPal (verify-webhook-signature); confronto chiave cron reso a tempo costante.
- CSP + HSTS aggiunte sia su `pages/_headers` sia sulle pagine pubbliche renderizzate dal Worker (`html()`), verificate live via header HTTP reali dopo il deploy.

### ⚠️ Trovato ma non ancora risolto: `platform_supported_locales` senza RLS

L'advisory di sicurezza di Supabase segnala che `platform_supported_locales` (lingue it/en/fr/de/es) **non ha Row Level Security attiva** — chiunque con la anon key può leggere e scrivere su questa tabella senza restrizioni. Impatto basso (dati non sensibili, 5 righe di config), ma da chiudere. SQL di fix pronta, in attesa di conferma utente prima di applicarla (vedi conversazione 2026-07-11).

### Secrets Worker ancora da impostare (non bloccanti)

`RESEND_WEBHOOK_SECRET` (dashboard Resend → webhook → signing secret), opzionale `PAYPAL_ENV=sandbox` in test. Finché mancano, i relativi endpoint rispondono 503 invece di accettare payload non verificati (comportamento sicuro di default).

---

## Coordinamento agenti AI

| Agente / track | File principali | Non toccare |
|----------------|-----------------|-------------|
| **Business editor** | `pages/editor.html`, `pages/editor-ui.css`, `pages/public-page.css`, `pages/app.js` (iframe Business) | `pages/moments.html`, `pages/moments.js`, RSVP/guestbook Moments |
| **Moments editor** | `pages/moments.html`, `pages/moments.js`, `pages/moment-*.js`, Worker sezioni `/m/` | Wizard/collaudo/catalogo Business in `editor.html` |
| **Admin / piattaforma** | `pages/admin.html`, `sql/`, `worker/worker.js` (hub) | — |

**Regole:** incrementare `?v=` solo sul componente modificato; aggiornare questa tabella versioni dopo ogni release.

---

## Versioni attuali

| Componente | Versione | Note |
|------------|----------|------|
| **Admin** | v106 | Menu 4 intenti, modalità semplice, guide contestuali |
| **Editor Business** | **v117** | Analytics affidabili (RPC v74), order_sent, consenso cookie click |
| **Moments editor** | v110+ | Dashboard organizzatore — **agente dedicato** |
| **Worker NFC** | **v118** | Deployato — restyling CSS Moments + security hardening, verificato live |
| **SQL Supabase** | **v78 (applicata e verificata)** | v75-v77 hardening/rate-limit, v78 fix urgente ambiguità colonna — vedi nota sopra |
| **Prossima release Business** | **v118** | `editor.html` + `index.html` `?v=` + `buildPublicSnapshot().version` |

---

## Funzionalità completate

### Piattaforma core
- [x] Progetto consolidato `pages/` + `worker/` + `sql/`
- [x] Auth Supabase (PKCE), RLS admin e clienti
- [x] URL centralizzati in `pages/config.js`
- [x] Upload media R2 (foto, video, audio) via Worker
- [x] Pagina pubblica Business `/p/` e Moments `/m/` + NFC `/k/`

### Business
- [x] Editor con anteprima live, sezioni a card
- [x] Wizard onboarding per settore (5 template)
- [x] Prenotazioni con email automatica Resend
- [x] Catalogo prodotti con varianti

### Moments
- [x] Editor parità UX Business (sidebar, topbar, wizard post-attivazione)
- [x] 21 categorie evento + template bilanciati per tipo
- [x] Temi visivi (classic, celebration, minimal, memorial)
- [x] RSVP configurabile per tipo evento
- [x] Attivazione codici NFC + PIN opzionale

### Admin
- [x] Pannelli Business e Moments separati
- [x] Magazzino NFC, lotti, codici, clienti Moments
- [x] Catalogo vendita Shopify (sync bozza → live)
- [x] Integration Hub (Shopify, Stripe, PayPal, Resend)
- [x] Rete rivenditori v68 (tier, listini, consegne)
- [x] UX v106: menu intenti, modalità semplice, guide

### Integrazioni
- [x] Shopify: sync catalogo + webhook ordini
- [x] Email ordine con codici NFC post-checkout Shopify
- [x] Stripe Checkout + webhook ingest (predisposto)
- [x] i18n v66 (IT EN FR DE ES)

---

## Funzionalità in sviluppo

| Area | Stato | Priorità |
|------|-------|----------|
| Stripe secrets in produzione | Predisposto, secrets da configurare | Alta |
| Portale rivenditori self-service | Da costruire (`reseller.html`) | Media |
| Tabella risposte RSVP backend | Completato v70 — applicare SQL in prod | Alta |
| Catalogo multilingua completo | Admin predisposto, sync Shopify parziale | Media |
| Smoke test wizard 5 settori | Checklist aperta | Bassa |
| **KhamaKey OS** (questo sistema) | Fase 1 — struttura creata | Alta |

---

## Problemi aperti

| # | Problema | Impatto | Azione |
|---|----------|---------|--------|
| 1 | `STRIPE_SECRET_KEY` non in produzione | Pagamenti Business bloccati | Vedi `STRIPE-PERSONAL-SETUP.md` |
| 2 | `RESEND_API_KEY` da verificare in prod | Email ordini potrebbero non partire | `wrangler secret put` |
| 3 | Documentazione sparsa tra chat e file root | Perdita contesto tra sessioni AI | **KhamaKey OS** (in corso) |
| 4 | Skill Codex punta a path vecchi | Rischio deploy su cartella sbagliata | Specificare sempre root v41 |
| 5 | `platform_supported_locales` senza RLS | Chiunque con anon key può leggere/scrivere la tabella lingue | SQL di fix pronta, in attesa di conferma utente |
| 6 | `RESEND_WEBHOOK_SECRET` non ancora impostato | Webhook Resend risponde 503 finché non configurato (sicuro, non urgente) | `wrangler secret put RESEND_WEBHOOK_SECRET` |

---

## Priorità correnti

1. **KhamaKey OS** — centralizzare conoscenza e regole AI
2. **Stripe in produzione** — account personale temporaneo OK
3. **Portale rivenditori** — brief personalizzazione Business
4. **RSVP backend** — raccolta risposte strutturata

---

## Prossimo obiettivo

> Completare **Fase 1 KhamaKey OS**: struttura cartelle, file fondamentali, migrazione graduale documentazione da `ROADMAP.md` e guide setup verso `docs/`.

Poi: configurare Stripe secrets e smoke test flusso ordine Moments end-to-end.

---

## Lock attivi (multi-agente)

Vedi [`../CODEX-COLLAB.md`](../CODEX-COLLAB.md) sezione **Lock attivi**.

| Area | Stato |
|------|-------|
| Rete rivenditori v68 | Libero per fix minori |
| Stripe secrets Worker | Da configurare |
| Admin UX v106 | Libero |
| Editor contratto pubblico | Condiviso — coordinarsi |

---

## Root del progetto

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

Repo: `github.com/kpfarm/khamakey-v41` — branch `main`

---

## Deploy rapido

```bash
# Pages (da pages/)
npx wrangler pages deploy . --project-name khamakey-app

# Worker (da worker/)
npx wrangler deploy
```

Ordine release: **Worker prima** se cambia renderer NFC, poi **Pages**.
