# Changelog — KhamaKey

Storico modifiche significative. Per dettaglio release per versione vedi [`changelog/`](changelog/).

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.0.0/).

---

## [Unreleased]

### Added
- **KhamaKey OS** — sistema operativo del progetto (`KHAMAKEY_OS/`)
  - `MASTER_INDEX.md` — punto di ingresso unico per tutte le AI
  - `PROJECT_STATE.md` — stato live del progetto
  - `AGENTS.md` + `CLAUDE.md` — regole condivise Cursor/Codex/Claude
  - `docs/00`–`15` — manuale ufficiale (migrazione graduale)
  - `decisions/`, `prompts/`, `changelog/`, `assets/`
  - Regole Cursor in `.cursor/rules/khamakey-os.mdc`

---

## [v106] — 2026-07-09

### Changed
- Admin UX: menu 4 intenti, modalità semplice, copy umano rete partner
- Guide contestuali (`admin-guide.js`)

---

## [v103] — 2026-07-09

### Added
- Email ordine con codici NFC post-checkout Shopify
- Stripe Checkout + webhook ingest
- Integration Hub (Stripe, PayPal, Resend)

---

## [v99] — 2026-07-09

### Added
- Catalogo vendita Moments + sync Shopify
- Webhook ordini Shopify
- `SHOPIFY-SETUP.md`

---

## [v68 SQL] — 2026-07-09

### Added
- Rete rivenditori: tier, listini, consegne, RPC

---

## [v41] — 2026-07-06

### Added
- Progetto consolidato da Pages v40 + Worker v22/v23
- URL centralizzati in `config.js`
- Git + GitHub (`kpfarm/khamakey-v41`)
