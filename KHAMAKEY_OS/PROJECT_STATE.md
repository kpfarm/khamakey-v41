# KhamaKey — Stato del progetto

> **Leggi questo file per primo** in ogni sessione AI.  
> Ultimo aggiornamento: **2026-07-11** (security hardening — vedi sotto, **NON ANCORA DEPLOYATO**)

---

## ⚠️ Modifiche non deployate (2026-07-11, Claude Code + follow-up Codex)

Audit di sicurezza + fix applicati **solo ai file del repo**: nessun `git commit`, nessun `wrangler deploy`, nessuna SQL applicata su Supabase. Prima che Codex/Cursor tocchino `worker/worker.js`, `sql/`, `pages/_headers`, leggere questo.

### 🔴 ORDINE DI DEPLOY OBBLIGATORIO — non invertire

Il `worker.js` attuale chiama `get_public_moment` passando **sempre 3 argomenti** (incluso `p_visitor_key`, aggiunto da Codex in v75). Su Supabase **non è applicato nulla** di v75/v76 al momento.

1. **Prima**: `sql/apply-all.psql` su Supabase (include v75 con la funzione a 3 argomenti + wrapper compatibile a 2)
2. **Poi**: `wrangler deploy` del Worker da `worker/`

Se si deploya il Worker **prima** della SQL, ogni pagina Moments pubblica (`/m/`, RSVP, guestbook, PIN gate) smette di rispondere fino a quando la SQL non viene applicata — l'RPC a 3 argomenti non esisterebbe ancora lato database. Verificare anche i secret Worker nuovi prima del deploy: `RESEND_WEBHOOK_SECRET`, opzionale `PAYPAL_ENV`.

File modificati: `sql/apply-all.psql`, `sql/README.md`, `sql/khamakey-security-hardening-v75.sql` (nuovo, poi rifinito da Codex — lockout PIN per slug+visitatore), `sql/khamakey-rate-limit-v76.sql` (nuovo), `sql/khamakey-rate-limit-cleanup-v77.sql` (nuovo, Claude Code), `worker/worker.js`, `worker/wrangler.toml`, `worker/.env.example`, `pages/_headers`.

Cosa contengono (in ordine di severità):
- **`get_public_moment` non restituisce più `state`/titolo/indirizzo se il PIN è errato o assente** — prima li restituiva sempre, il PIN era solo un flag lato client. Nessun PIN esistente invalidato (stesso schema hash).
- Rate limit lockout su tentativi PIN Moments per slug + visitatore (20/15min), su RSVP/guestbook/prenotazioni (5/15min), upload media (30/h), analytics pubblici (120/15min), traduzioni OpenAI (10/h) — tutto via Postgres, zero infra nuova. Pulizia automatica giornaliera (v77) agganciata al cron esistente, così le tabelle di rate-limit non crescono senza limite.
- RLS abilitata su `platform_webhook_events` (mancava); `business_page_i18n` pubblico ristretto alle sole aziende con i18n abilitato.
- Firma webhook verificata per Resend (Svix) e PayPal (verify-webhook-signature); confronto chiave cron reso a tempo costante.
- CSP aggiunta sia su `pages/_headers` sia sulle pagine pubbliche renderizzate dal Worker (`html()`), che prima non avevano alcun header di sicurezza.

**Prima di deployare**, impostare i nuovi secret Worker: `RESEND_WEBHOOK_SECRET` (dashboard Resend), opzionale `PAYPAL_ENV=sandbox` in test. Poi: `sql/apply-all.psql` su Supabase (v75+v76 sono in coda, idempotenti) e `wrangler deploy` da `worker/`.

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
| **Worker NFC** | **v118** | Restyling premium CSS Moments adattivo (matrimonio vs viaggi) |
| **SQL Supabase** | **v77 (in coda, non applicato)** | v75 hardening PIN/RLS/i18n, v76 rate limiting, v77 pulizia periodica — vedi nota sopra |
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
| 5 | SQL v75/v76 (security hardening) non applicate su Supabase | Fix PIN/RLS/rate-limit non attivi in prod | Eseguire `sql/apply-all.psql` |
| 6 | `worker.js` modificato (PIN, rate limit, CSP, webhook) non deployato | Repo diverso da produzione live; **richiede v75 a 3 argomenti già applicata su Supabase, altrimenti rompe `/m/`, RSVP, guestbook** | SQL prima (`apply-all.psql`), poi `wrangler deploy`, dopo aver impostato `RESEND_WEBHOOK_SECRET` |
| 7 | Modifiche 2026-07-11 non committate su git | Perse se qualcuno sovrascrive la working tree | Commit + push prima di far partire un altro agente |

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
