# KhamaKey — Stato del progetto

> **Leggi questo file per primo** in ogni sessione AI.  
> Ultimo aggiornamento: **2026-07-10**

---

## Versioni attuali

| Componente | Versione | Note |
|------------|----------|------|
| **Admin** | v106 | Menu 4 intenti, modalità semplice, guide contestuali |
| **Editor Business** | v103 | Wizard settore, upload media, prenotazioni email |
| **Moments editor** | v110 | Dashboard organizzatore + RSVP/guestbook stats |
| **Worker NFC** | v110 | `WORKER_VERSION = v110-moment-editor-dashboard` + cron letter unlock |
| **SQL Supabase** | v73 | RSVP, guestbook, anniversari, letter unlock |
| **Prossima release Moments** | **v111** | Incrementare `?v=` su moments.html + `WORKER_VERSION` insieme |

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
