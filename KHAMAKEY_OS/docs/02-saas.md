# 02 — SaaS / Piattaforma

## Stack

| Layer | Tecnologia | Ruolo |
|-------|------------|-------|
| Frontend | HTML/CSS/JS statico | Editor, admin, moments |
| Hosting frontend | Cloudflare Pages | `khamakey-app` |
| Backend API | Cloudflare Worker | Pagine pubbliche, webhook, upload |
| Database | Supabase (Postgres) | Auth, dati, RLS |
| Media | Cloudflare R2 | Foto, video, audio |
| Email | Resend | Prenotazioni + ordini |
| Pagamenti | Stripe (Business), Shopify (Moments) | Checkout |

---

## Auth e permessi

- **Supabase Auth** con PKCE
- Tabella `platform_members` con ruoli:
  - `admin.full` — accesso completo admin
  - `moments.read` / `moments.write` — gestione Moments
  - `inventory.read` / `inventory.write` — magazzino NFC
  - `agents.write` — gestione rivenditori

---

## Multi-agente

Collaborazione tra Cursor, Codex e umani:

- Lock per area in [`../../CODEX-COLLAB.md`](../../CODEX-COLLAB.md)
- Log sessioni in [`13-roadmap.md`](13-roadmap.md)
- Regole AI in [`../AGENTS.md`](../AGENTS.md)

---

## Versioning

Un solo contatore release piattaforma:

- `?v=NN` su tutti i file HTML/JS in `pages/`
- `WORKER_VERSION` in `worker/worker.js`
- Incrementare **insieme** ad ogni release

| Componente | Versione attuale |
|------------|------------------|
| Admin | v106 |
| Editor Business | v103 |
| Moments | v93 |
| Worker | v103 |

---

## Configurazione

File centrale: `pages/config.js`

```javascript
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
WORKER_BASE_URL
PAGES_BASE_URL
```

Secrets **solo** su Cloudflare Worker (`wrangler secret put`).

---

## KhamaKey OS

Questo sistema (`KHAMAKEY_OS/`) è il cervello condiviso del progetto.  
Vedi [`../README.md`](../README.md) per il flusso di lavoro.
