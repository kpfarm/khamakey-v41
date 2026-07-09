# Codice sorgente — KhamaKey

> **Fase 1 (transizione):** il codice resta nella root del repo.  
> Questa cartella diventerà `app/` quando la migrazione sarà completa.

---

## Mappa attuale

| Componente | Percorso | Deploy |
|------------|----------|--------|
| **Frontend** | [`../pages/`](../pages/) | Cloudflare Pages → `khamakey-app` |
| **Worker** | [`../worker/`](../worker/) | Cloudflare Workers → `khamakey-nfc` |
| **Database** | [`../sql/`](../sql/) | Supabase SQL Editor |

---

## Struttura target (Fase 4+)

```text
app/
├── pages/          ← da ../pages/
├── worker/         ← da ../worker/
└── sql/            ← da ../sql/
```

La migrazione avverrà con **symlink o spostamento graduale** senza rompere i deploy esistenti.

---

## File chiave

### Frontend (`pages/`)

| File | Ruolo |
|------|-------|
| `config.js` | URL Supabase, Worker, Pages |
| `app.js` | Auth, business list, `publicStateFromEditor()` |
| `editor.html` | Editor Business + anteprima |
| `moments.html` + `moments.js` | Editor Moments |
| `admin.html` + `admin.js` | Pannello admin |
| `public-page.css` | CSS pagina pubblica (sync con Worker) |

### Worker (`worker/`)

| File | Ruolo |
|------|-------|
| `worker.js` | Renderer `/p/`, `/m/`, `/k/`, API, webhook |
| `wrangler.toml` | Config deploy + `PAGES_ASSET_BASE` |

### SQL (`sql/`)

Migrazioni versionate `v37` → `v68`. Vedi [`../sql/README.md`](../sql/README.md).

---

## Deploy

```bash
# Pages
cd ../pages && npx wrangler pages deploy . --project-name khamakey-app

# Worker
cd ../worker && npx wrangler deploy
```

---

## Test locale

```bash
cd ../pages && python3 -m http.server 8080
cd ../worker && npx wrangler dev
```
