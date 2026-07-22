# KhamaKey OS — Master Index

> **Punto di ingresso unico** per Obsidian, Cursor, Codex e Claude Code.  
> Ogni sessione AI inizia da qui.

---

## Ordine di lettura obbligatorio

Prima di modificare codice o documentazione, leggi prima [`00-START-HERE.md`](00-START-HERE.md), poi continua **in questo ordine**:

| # | File / cartella | Scopo |
|---|-----------------|-------|
| 1 | [`PROJECT_STATE.md`](PROJECT_STATE.md) | Stato attuale: versioni, sprint, problemi aperti |
| 2 | [`README.md`](README.md) | Cos'è KhamaKey OS e come usarlo |
| 3 | [`AGENTS.md`](AGENTS.md) | Regole condivise per tutte le AI |
| 4 | [`CLAUDE.md`](CLAUDE.md) | Istruzioni specifiche Claude Code / Codex |
| 5 | [`docs/`](docs/) | Manuale ufficiale del progetto |

---

## Mappa rapida

```text
KHAMAKEY_OS/
├── MASTER_INDEX.md      ← sei qui
├── PROJECT_STATE.md     ← stato live del progetto
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── CHANGELOG.md
│
├── app/                 ← codice (fase migrazione: vedi app/README.md)
├── docs/                ← manuale numerato 00–15
├── decisions/           ← decisioni architetturali immutabili
├── prompts/             ← prompt riutilizzabili per sessioni AI
├── changelog/           ← storico release dettagliato
├── assets/              ← immagini, loghi, mockup
└── .cursor/             ← regole Cursor
```

---

## Documentazione per area

| Area | File |
|------|------|
| Visione e modello prodotto | [`docs/00-visione.md`](docs/00-visione.md) |
| Brand | [`docs/01-brand.md`](docs/01-brand.md) |
| SaaS / piattaforma | [`docs/02-saas.md`](docs/02-saas.md) |
| Editor Business + Moments | [`docs/03-editor.md`](docs/03-editor.md) |
| Area cliente | [`docs/04-area-cliente.md`](docs/04-area-cliente.md) |
| Admin | [`docs/05-admin.md`](docs/05-admin.md) |
| Rivenditori | [`docs/06-rivenditori.md`](docs/06-rivenditori.md) |
| Database / Supabase | [`docs/07-database.md`](docs/07-database.md) |
| Cloudflare | [`docs/08-cloudflare.md`](docs/08-cloudflare.md) |
| Shopify | [`docs/09-shopify.md`](docs/09-shopify.md) |
| Etsy / marketplace | [`docs/10-etsy.md`](docs/10-etsy.md) |
| Produzione NFC | [`docs/11-produzione.md`](docs/11-produzione.md) |
| Marketing | [`docs/12-marketing.md`](docs/12-marketing.md) |
| Roadmap | [`docs/13-roadmap.md`](docs/13-roadmap.md) |
| FAQ | [`docs/14-faq.md`](docs/14-faq.md) |
| Decisioni | [`docs/15-decisioni.md`](docs/15-decisioni.md) |
| Copywriting e Vendita | [`docs/16-sales-copy-love.md`](docs/16-sales-copy-love.md) |
| Creative Engine Antigravity | [`docs/17-creative-engine-antigravity.md`](docs/17-creative-engine-antigravity.md) |
| Audit Admin | [`docs/18-admin-audit.md`](docs/18-admin-audit.md) |
| Piano Admin Console Operativa | [`docs/19-admin-console-operativa.md`](docs/19-admin-console-operativa.md) |
| Attivazione Business + Magazzino v147/v148 | [`docs/20-business-activation-inventory-v147-v148.md`](docs/20-business-activation-inventory-v147-v148.md) |
| **Checklist operabilità Business + Admin** | [`docs/21-checklist-operabilita-business-admin.md`](docs/21-checklist-operabilita-business-admin.md) |
| Officina NFC Moments | [`docs/21-moments-officina-nfc.md`](docs/21-moments-officina-nfc.md) |
| Ops secrets / Auth checklist | [`docs/22-ops-secrets-auth-checklist.md`](docs/22-ops-secrets-auth-checklist.md) |
| Smoke test Moments | [`docs/23-smoke-moments.md`](docs/23-smoke-moments.md) |
| **Basi solide per ~10k Moments** | [`docs/24-pronti-per-10k-moments.md`](docs/24-pronti-per-10k-moments.md) |
| Monitoraggio Moments | [`docs/25-monitoraggio-moments.md`](docs/25-monitoraggio-moments.md) |
| **i18n Moments IT/EN — inventario** | [`docs/26-moments-i18n-inventory.md`](docs/26-moments-i18n-inventory.md) |

## Prompt operativi

| Uso | File |
|-----|------|
| Avvio sessione agente | [`prompts/session-start.md`](prompts/session-start.md) |
| Nuovo agente / nuova chat | [`prompts/new-agent-brief.md`](prompts/new-agent-brief.md) |

---

## Codice sorgente (transizione)

Durante la **Fase 1**, il codice resta nella root del repo:

| Componente | Percorso attuale |
|------------|------------------|
| Frontend Pages | `../pages/` |
| Cloudflare Worker | `../worker/` |
| Migrazioni SQL | `../sql/` |

Vedi [`app/README.md`](app/README.md) per il piano di migrazione in `app/`.

---

## Documenti legacy (ancora validi)

Questi file nella root del repo restano attivi finché non migrati in `docs/`:

| File legacy | Destinazione OS |
|-------------|-----------------|
| `ROADMAP.md` | `docs/13-roadmap.md` (mirror) |
| `CODEX-COLLAB.md` | `AGENTS.md` + `docs/02-saas.md` |
| `INTEGRATIONS-ROADMAP.md` | `docs/09-shopify.md` + `docs/08-cloudflare.md` |
| `SHOPIFY-SETUP.md` | `docs/09-shopify.md` |
| `STRIPE-PERSONAL-SETUP.md` | `docs/09-shopify.md` (sezione Stripe) |

---

## Regola d'oro dopo ogni modifica significativa

1. Aggiorna il doc in `docs/` relativo all'area toccata
2. Aggiorna `PROJECT_STATE.md` se cambia versione, sprint o priorità
3. Aggiungi riga in `CHANGELOG.md`
4. Aggiungi riga in `docs/13-roadmap.md` (log sessioni)

---

*KhamaKey OS v1 — creato 2026-07-09*
