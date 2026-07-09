# KhamaKey v41 — progetto consolidato

Versione unificata del progetto KhamaKey (Cloudflare Pages + Worker + Supabase), basata su:

- **Pages v40** — app editor, admin, moments, prodotti magazzino
- **Worker v22/v23** — pagine pubbliche `/p/`, moments `/m/`, NFC `/k/`, analytics, prenotazioni

Gli artefatti originali in `outputs/` **non sono stati modificati**.

## Struttura

```text
khamakey-v41-consolidated/
├── pages/          Frontend statico (Cloudflare Pages: khamakey-app)
├── worker/         Cloudflare Worker (khamakey-nfc)
├── sql/            Migrazioni Supabase v37 → v40
└── README.md
```

## Database (Supabase)

Applica gli script SQL **in ordine** dalla cartella `sql/`:

1. `khamakey-moments-admin-v37.sql`
2. `khamakey-moments-platform-v38.sql`
3. `khamakey-moments-activation-v39.sql`
4. `khamakey-moments-products-v40.sql`
5. `khamakey-moments-activate-fix-v41.sql` — fix attivazione
6. `khamakey-moments-inventory-v42.sql` — linea prodotto, lotti, statistiche
7. `khamakey-moments-admin-customers-v43.sql` — clienti admin, provisioning, save editor admin

Se hai già applicato versioni precedenti, esegui solo quelle mancanti (vedi `sql/README.md`).

## Configurazione frontend

Modifica `pages/config.js`:

- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — connessione Supabase
- `WORKER_BASE_URL` — URL del worker (link pubblici NFC e pagine)
- `PAGES_BASE_URL` — URL Cloudflare Pages (riferimento interno)

## Deploy completo (checklist)

Ordine consigliato: **Supabase → Pages → Worker**.

### 1. Supabase (una tantum o dopo nuove migrazioni)

1. Apri [Supabase SQL Editor](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/sql/new)
2. Esegui i file in `sql/` che non hai ancora applicato (v37 → v43)
3. Verifica che gli admin abbiano `moments.write` / `admin.full` in `platform_members`

### 2. Cloudflare Pages (frontend)

```bash
cd /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/pages
npx wrangler pages deploy . --project-name khamakey-app
```

**Alternativa dashboard:** Workers & Pages → `khamakey-app` → **Create deployment** → carica lo zip.

Crea/aggiorna lo zip:

```bash
cd pages && zip -r ../khamakey-cloudflare-pages-v43.zip . -x "*.DS_Store"
```

Controlla `pages/config.js` prima del deploy:

- `WORKER_BASE_URL` → `https://khamakey-nfc.khamakey-nfc.workers.dev`
- `PAGES_BASE_URL` → `https://khamakey-app.pages.dev`

### 3. Cloudflare Worker (pagine pubbliche `/p/`, `/m/`, NFC)

```bash
cd /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/worker
npx wrangler deploy
```

I secret vanno impostati **una volta** (o quando cambiano):

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put ANALYTICS_INGEST_KEY
npx wrangler secret put VISITOR_SALT
```

In `wrangler.toml` verifica `PAGES_ASSET_BASE = "https://khamakey-app.pages.dev"`.

### 4. Verifica post-deploy

| URL | Cosa controllare |
|-----|------------------|
| https://khamakey-app.pages.dev/ | Login editor business |
| https://khamakey-app.pages.dev/admin.html | Admin v43, Clienti Moments |
| https://khamakey-app.pages.dev/moments.html | Login + editor Moments |
| https://khamakey-nfc...workers.dev/m/{slug} | Pagina pubblica Moment |
| https://khamakey-nfc...workers.dev/p/{slug} | Pagina pubblica business |

Hard refresh (`Cmd+Shift+R`) se vedi CSS/JS vecchi — release corrente **v99** (Sprint E Shopify).

Setup negozio: vedi **[SHOPIFY-SETUP.md](SHOPIFY-SETUP.md)**.

---

## Far ritrovare Codex ai progressi

### Cartella unica (obbligatoria)

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

**Non usare** le vecchie cartelle v34–v40 in `outputs/`.

### All’inizio di ogni sessione Codex, incolla:

```text
Progetto KhamaKey — usa SOLO questa root:
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated

Leggi prima: ROADMAP.md, CODEX-COLLAB.md, README.md (sezione deploy).

Stato attuale:
- SQL applicati fino a v43 su Supabase
- Admin: Business e Moments separati, magazzino NFC, clienti Moments
- Moments editor v43, worker redesign pagina /m/

Task: [descrivi cosa vuoi fare]

Non toccare: cartelle originali v34-v40 in outputs/
```

### File che Codex deve leggere

| File | Perché |
|------|--------|
| `ROADMAP.md` | Fasi, modello Business/Moments, log sessioni |
| `CODEX-COLLAB.md` | Chi fa cosa, regola dei 4 punti, convenzioni |
| `sql/README.md` | Migrazioni già definite |
| `README.md` | Deploy e struttura |

Dopo ogni sessione (Cursor o Codex), aggiungi una riga in **Log sessioni** dentro `ROADMAP.md`.

### Script Codex (skill release)

Dalla root v41, **prima di creare lo zip**:

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/sync_public_css.py \
  /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/pages

python3 ~/.codex/skills/khamakey-release-workflow/scripts/verify_release.py \
  /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

Pacchetto zip automatico:

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/package_release.py \
  /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

> Lo skill Codex punta ancora a `khamakey-test-app` — nella sessione specifica sempre la root **v41-consolidated** (vedi `CODEX-COLLAB.md`).

### Git (backup su GitHub)

Repository git inizializzato con commit iniziale. Per collegare GitHub e pushare:

**Vedi [GITHUB.md](GITHUB.md)** — istruzioni passo-passo.

```bash
# Dopo aver creato il repo vuoto su github.com/new:
git remote add origin git@github.com:TUO-USERNAME/khamakey-v41.git
git push -u origin main
```

---

## Deploy Cloudflare Pages

La cartella `pages/` non richiede build.

```bash
cd pages
npx wrangler pages deploy . --project-name khamakey-app
```

Oppure carica uno zip dalla dashboard: **Workers & Pages → khamakey-app → Create deployment**.

Per creare lo zip di deploy (già incluso come `khamakey-cloudflare-pages-v41.zip` nella root del progetto):

```bash
cd pages && zip -r ../khamakey-cloudflare-pages-v41.zip . -x "*.DS_Store"
```

## Deploy Cloudflare Worker

```bash
cd worker
cp .env.example .dev.vars   # solo per sviluppo locale
# Bucket R2 per foto, video e audio (una tantum):
npx wrangler r2 bucket create khamakey-media
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put ANALYTICS_INGEST_KEY
npx wrangler secret put VISITOR_SALT
# opzionale per prenotazioni email:
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler deploy
```

Aggiorna `PAGES_ASSET_BASE` in `wrangler.toml` se usi un dominio custom per Pages.

## Flussi principali

| Percorso | Servizio | Descrizione |
|----------|----------|-------------|
| `/` | Pages | App editor clienti |
| `/admin.html` | Pages | Pannello admin (moments, prodotti, CRM) |
| `/moments.html` | Pages | Area utente Moments |
| `/p/{slug}` | Worker | Pagina pubblica business |
| `/m/{slug}` | Worker | Pagina pubblica Moment (con PIN opzionale) |
| `/k/{code}` | Worker | Redirect NFC → business o moment |
| `/event` | Worker | Analytics eventi |
| `/booking` | Worker | Invio prenotazioni (Resend) |
| `POST /api/media/upload` | Worker + R2 | Upload foto, video, audio (Moments + Business) |
| `/cdn/{path}` | Worker + R2 | CDN pubblico per i file caricati |

## Correzioni incluse in v41

- URL worker/pages centralizzati in `config.js` (niente hardcode sparsi)
- Worker: CSS snapshot e link attivazione Moments configurabili via `PAGES_ASSET_BASE`
- Moments: slug e hash PIN allineati al `public_slug` del prodotto (fix attivazione)
- SQL v40: grant/revoke corretti per `activate_moment_code` a 5 parametri
- `_headers`: cache per CSS/JS su Pages
- `wrangler.toml` e `.env.example` per il worker

## Test locale

```bash
# Pages
cd pages && python3 -m http.server 8080

# Worker
cd worker && npx wrangler dev
```

## Raccomandazioni

- Verifica che `WORKER_BASE_URL` in `config.js` corrisponda al dominio worker in produzione
- Dopo il deploy Pages, aggiorna `PAGES_ASSET_BASE` nel worker
- Conferma che le RLS Supabase consentano `moments.read/write` e `inventory.read/write` agli admin
- Valuta un dominio custom (`app.khamakey.com` + `nfc.khamakey.com`) per sostituire gli URL `.pages.dev` / `.workers.dev`
