# 08 — Cloudflare

## Componenti

| Servizio | Progetto | Cartella |
|----------|----------|----------|
| **Pages** | `khamakey-app` | `pages/` |
| **Worker** | `khamakey-nfc` | `worker/` |
| **R2** | `khamakey-media` | — (via Worker) |

---

## Cloudflare Pages

Hosting statico per editor, admin, moments.

```bash
cd pages
npx wrangler pages deploy . --project-name khamakey-app
```

URL: `https://khamakey-app.pages.dev`

### Config
- `pages/config.js` — URL Supabase e Worker
- `pages/_headers` — cache CSS/JS
- `pages/netlify.toml` / `wrangler.jsonc` — redirect e headers

---

## Cloudflare Worker

Renderer pagine pubbliche + API + webhook.

```bash
cd worker
npx wrangler deploy
```

URL: `https://khamakey-nfc.khamakey-nfc.workers.dev`

### `WORKER_VERSION`
Definito in `worker/worker.js` — attuale: `v103-shopify-email-stripe-complete`.

### `PAGES_ASSET_BASE`
In `wrangler.toml` — punta a `https://khamakey-app.pages.dev` per CSS snapshot.

---

## Endpoint Worker

| Endpoint | Metodo | Ruolo |
|----------|--------|-------|
| `/p/{slug}` | GET | Pagina business |
| `/m/{slug}` | GET | Pagina Moments |
| `/k/{code}` | GET | Redirect NFC |
| `/event` | POST | Analytics |
| `/booking` | POST | Prenotazioni (Resend) |
| `POST /api/media/upload` | POST | Upload R2 |
| `GET /cdn/{path}` | GET | Serve media |
| Webhook Shopify | POST | Ordini |
| Webhook Stripe | POST | Checkout |

---

## Secrets (Worker)

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put ANALYTICS_INGEST_KEY
npx wrangler secret put VISITOR_SALT
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Shopify secrets (se configurati)
```

**Mai** nel codice sorgente.

---

## R2 Storage

```bash
npx wrangler r2 bucket create khamakey-media
```

Upload limitato per tipo e dimensione. CDN pubblico su `/cdn/`.

---

## Ordine deploy

1. **Supabase** — se nuove migrazioni SQL
2. **Worker** — se cambia renderer NFC (`/p/`, `/m/`, `/k/`)
3. **Pages** — frontend editor/admin

Hard refresh (`Cmd+Shift+R`) dopo deploy per cache bust.

---

## Test locale

```bash
cd pages && python3 -m http.server 8080
cd worker && npx wrangler dev
```

Dev vars: `worker/.env.example` → `.dev.vars` (solo locale).

---

## Dominio custom (futuro)

- `app.khamakey.com` → Pages
- `nfc.khamakey.com` → Worker

Aggiornare `config.js` e `PAGES_ASSET_BASE` dopo switch.
