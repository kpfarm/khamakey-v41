# Collaborazione multi-agente su KhamaKey v41

Come lavorare **più chat Cursor**, **Codex** e **umani** sullo stesso repo senza sovrascriversi a vicenda.

---

## Root del progetto (unica fonte)

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

**Non modificare** le cartelle v34–v40 originali in `outputs/`.

Repo GitHub: `github.com/kpfarm/khamakey-v41` — branch principale: **`main`**.

---

## Regola d’oro (pagina pubblica)

Ogni campo che influenza la **pagina pubblica** va aggiornato in **4 punti**:

1. Controllo nell’editor (`pages/editor.html`)
2. Anteprima (`renderPublicPreview()` in `editor.html`)
3. Whitelist in `publicStateFromEditor()` (`pages/app.js`)
4. Renderer Worker (`worker/worker.js`)

Per **Moments**, aggiornare anche:

- `pages/moments.js` (editor utente)
- `worker/worker.js` (`renderMomentPage`)

---

## Workflow — inizio di ogni sessione agente

```bash
cd /path/to/khamakey-v41-consolidated
git pull origin main
git status
```

Poi leggere, in ordine:

1. **`KHAMAKEY_OS/MASTER_INDEX.md`** → punto di ingresso OS
2. **`KHAMAKEY_OS/PROJECT_STATE.md`** → stato live (versioni, priorità)
3. **`CODEX-COLLAB.md`** → sezione **Lock attivi**
4. **`ROADMAP.md`** o **`KHAMAKEY_OS/docs/13-roadmap.md`** → log sessioni
5. Doc di dominio in **`KHAMAKEY_OS/docs/`** o legacy (`STRIPE-PERSONAL-SETUP.md`, ecc.)

### Prendere un lock (se tocchi area sensibile)

Prima di modificare file lockati:

1. Aggiornare la tabella **Lock attivi** (owner = nome task + data)
2. Commit leggero: `chore: lock [area] per [task]`
3. Push — così gli altri agenti vedono il lock su Git

### Rilasciare un lock (a fine task)

1. Cambiare stato lock in **libero** o rimuovere la riga
2. Commit: `chore: release lock [area]`
3. Push

---

## Workflow — fine di ogni sessione agente

1. Verificare diff (`git status`, `git diff`) — **mai** committare `.env`, `.dev.vars`, chiavi API
2. Aggiornare **`ROADMAP.md`** (tabella log in fondo) con data, autore, cosa è stato fatto
3. Rilasciare lock se ne avevi preso uno
4. **Commit + push** su `main` (standard di progetto)
5. Se è una **release**:
   - incrementare `?v=N+1` su HTML/JS toccati
   - allineare `WORKER_VERSION` in `worker/worker.js` se serve
   - deploy: **Worker prima** se cambia renderer NFC, poi **Cloudflare Pages** (`pages/`)

---

## Aprire una nuova chat Cursor (template per l’utente)

Copia-incolla questo messaggio all’inizio di ogni nuova chat agente:

```text
Progetto: khamakey-v41-consolidated
Repo: github.com/kpfarm/khamakey-v41 (branch main)

Prima di iniziare:
- git pull origin main
- leggi KHAMAKEY_OS/MASTER_INDEX.md
- leggi KHAMAKEY_OS/PROJECT_STATE.md
- leggi CODEX-COLLAB.md (lock attivi)

Task di questa sessione: [descrivi in 1-2 frasi]

Non toccare: [es. worker.js Stripe, admin rete rivenditori, sql v68]

File probabili: [es. pages/admin.js, KHAMAKEY_OS/docs/05-admin.md]

A fine sessione: aggiorna KHAMAKEY_OS/docs/, PROJECT_STATE, CHANGELOG, commit + push, rilascia lock se preso.
```

Più il messaggio è specifico, meno rischio che un altro agente lavori sulle stesse righe.

---

## Divisione del lavoro (aree tipiche)

| Area | File principali | Note |
|------|-----------------|------|
| Editor Business | `pages/editor.html`, `editor-ui.css` | UI + anteprima; rispettare contratto 4 punti |
| Salvataggio / app | `pages/app.js`, `pages/index.html` | Auth, business list, publicState |
| Renderer NFC pubblico | `worker/worker.js` | `/p/`, `/k/`, `/m/` |
| Admin piattaforma | `pages/admin.html`, `admin.js`, `admin.css`, `admin-guide.js` | UX team interno |
| Moments utente | `pages/moments.js`, `moments.css`, `moments.html` | Editor eventi |
| SQL / Supabase | `sql/*.sql` | Nuovi file versionati vNN; applicare in prod con attenzione |
| Integrazioni | `worker/worker.js`, doc in `INTEGRATIONS-ROADMAP.md` | Secrets solo su Cloudflare |
| Deploy Pages | `pages/` → `npx wrangler pages deploy . --project-name khamakey-app` | Dalla cartella `pages/` |
| Deploy Worker | `worker/` → `npx wrangler deploy` | Dalla cartella `worker/` |

---

## Lock attivi

> Aggiornare questa tabella **su Git** quando si inizia o finisce un task che tocca l’area.

| Area | Owner / stato | File / azioni da non toccare senza lock |
|------|----------------|----------------------------------------|
| **Rete rivenditori v68** | Applicato (v105) — libero per fix minori | `sql/khamakey-reseller-network-v68.sql`, tab admin Rete rivenditori |
| **Stripe secrets Worker** | Da configurare (account personale temp) | `wrangler secret put STRIPE_*` — vedi `STRIPE-PERSONAL-SETUP.md` |
| **Stripe webhook / ingest** | Predisposto v103 | handler Stripe in `worker/worker.js`, RPC `ingest_stripe_checkout_event` |
| **Shopify Moments** | Operativo | webhook ordini, catalogo vendita, sync bozze |
| **Editor Business — contratto pubblico** | Condiviso | `publicStateFromEditor`, renderer `/p/` nel Worker |
| **Admin UX / guide** | v106 — menu intenti + modalità semplice | `admin.html`, `admin.js`, `admin.css`, `admin-guide.js` — coordinarsi se stesso pannello |

Quando **nessuno** sta lavorando su un’area, lasciare **libero** o **—** nella colonna Owner.

---

## Evitare conflitti (checklist rapida)

| ✅ Fai | ❌ Non fare |
|--------|-------------|
| `git pull` all’inizio | Lavorare su copie locali vecchie |
| Task piccolo e file mirati | Refactor globale “tanto ci sono” |
| Lock + commit prima di grossi cambi | Due agenti su `worker.js` in parallelo |
| Log in ROADMAP a fine sessione | Chiudere chat senza push |
| Chiedere all’utente se lock occupato | `git push --force` su main |
| Escludere export chat da git | Committare `CHAT-EXPORT*.md` |

---

## Comunicazione tra sessioni

Tabella **Log** in fondo a `ROADMAP.md`:

```markdown
| 2026-07-09 | Cursor (chat admin UX) | v104 admin guide + filtri |
```

Una riga basta: data, chi (Cursor/Codex/nome), cosa.

---

## Workflow Codex (Claude Code / skill release)

Prima di ogni sessione Codex:

```text
Progetto: khamakey-v41-consolidated
Task: [es. migliorare sezione catalogo nell'editor]
Non toccare: [aree lockate in CODEX-COLLAB.md]
```

Dopo modifiche che toccano anteprima pubblica:

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/sync_public_css.py pages
python3 ~/.codex/skills/khamakey-release-workflow/scripts/verify_release.py .
```

Percorsi skill: `pages/` (non `khamakey-test-app`), `worker/` (non `khamakey-cloudflare-worker`).

---

## Convenzioni versione

- Un solo contatore release piattaforma: `?v=NN` su HTML/JS
- Admin attuale: **v105** — prossima release piattaforma: **v106**
- Worker: `WORKER_VERSION` in `worker/worker.js` (attuale v103)
- Dettaglio completo: `.cursor/rules/git-commit-workflow.mdc`

---

## Due agenti in parallelo — scenario sicuro

| Agente A | Agente B | OK? |
|----------|----------|-----|
| Admin ordini (`admin.js`) | Stripe setup (secrets + doc) | ✅ file diversi |
| `moments.js` template matrimonio | SQL v69 nuovo file | ✅ |
| `worker.js` Shopify | `worker.js` Stripe | ❌ stesso file — sequenziale |
| Admin catalogo | Admin catalogo | ❌ coordinarsi o lock |

In dubbio: **un agente per file condiviso per volta**, oppure branch feature + PR (avanzato).

---

## Riferimenti rapidi

| Documento | Contenuto |
|-----------|-----------|
| `KHAMAKEY_OS/MASTER_INDEX.md` | Punto di ingresso OS — ordine lettura |
| `KHAMAKEY_OS/PROJECT_STATE.md` | Stato live: versioni, sprint, priorità |
| `KHAMAKEY_OS/AGENTS.md` | Regole condivise tutte le AI |
| `KHAMAKEY_OS/docs/` | Manuale ufficiale 00–15 |
| `ROADMAP.md` | Sprint, checklist, log sessioni (legacy) |
| `CODEX-COLLAB.md` | Lock, regola 4 punti, convenzioni |
| `INTEGRATIONS-ROADMAP.md` | Stripe, PayPal, Resend, i18n |
| `STRIPE-PERSONAL-SETUP.md` | Setup Stripe temporaneo |
| `SHOPIFY-SETUP.md` | Catalogo e webhook Shopify |
| `.cursor/rules/git-commit-workflow.mdc` | Commit, versioni, deploy |
