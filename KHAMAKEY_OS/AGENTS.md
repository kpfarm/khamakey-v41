# KhamaKey — Regole per agenti AI

> Valido per **Cursor**, **Codex**, **Claude Code**, **Antigravity** e qualsiasi altro agente sul progetto, presente o futuro.

## 00 — Bootstrap obbligatorio

Ogni agente deve leggere [`00-START-HERE.md`](00-START-HERE.md) e completare l'handshake prima di fare qualsiasi cosa. Questo evita di lavorare da memoria, da chat vecchie o da documentazione stale.

## 🔒 Le due regole che vengono prima di tutto

1. **Mai cancellare o perdere dati utente** — nessuna migrazione, refactor o pulizia tocca dati reali (pagine, eventi, ordini, messaggi, media, clienti) senza conferma esplicita dell'utente umano.
2. **Mai indebolire un controllo di sicurezza esistente** (CSP, RLS, rate limit, verifica firma webhook) come effetto collaterale di un altro task. Ogni cambiamento deve dare un beneficio reale o risolvere un bug — mai il contrario, nemmeno "temporaneamente per far funzionare qualcos'altro".

Dettaglio completo, esempi ed eccezioni dichiarate: [`../CODEX-COLLAB.md`](../CODEX-COLLAB.md) → sezione "Regole assolute".

---

## Prima di iniziare (obbligatorio)

```bash
cd /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
git pull origin main
git status
```

Poi leggi, **in ordine**:

1. [`MASTER_INDEX.md`](MASTER_INDEX.md)
2. [`PROJECT_STATE.md`](PROJECT_STATE.md)
3. [`../CODEX-COLLAB.md`](../CODEX-COLLAB.md) — lock attivi
4. Il file in `docs/` relativo al tuo task

---

## Dopo ogni modifica significativa (obbligatorio)

1. Aggiorna il documento in `docs/` dell'area toccata
2. Aggiorna [`PROJECT_STATE.md`](PROJECT_STATE.md) se cambiano versioni, sprint o priorità
3. Aggiungi riga in [`CHANGELOG.md`](CHANGELOG.md)
4. Aggiungi riga nel log di [`docs/13-roadmap.md`](docs/13-roadmap.md)
5. Rilascia lock se ne avevi preso uno
6. Commit + push (salvo richiesta esplicita di non committare)

---

## Regola d'oro — pagina pubblica (4 punti)

Ogni campo che influenza `/p/`, `/k/` o `/m/` va aggiornato in **4 punti**:

| # | File | Cosa |
|---|------|------|
| 1 | `pages/editor.html` | Controllo UI + anteprima |
| 2 | `pages/editor.html` | `renderPublicPreview()` |
| 3 | `pages/app.js` | `publicStateFromEditor()` whitelist |
| 4 | `worker/worker.js` | Renderer pubblico |

Per **Moments**, aggiungere anche:

- `pages/moments.js` (editor utente)
- `worker/worker.js` → `renderMomentPage`

## Linee guida grafiche (Moments)
- Le modifiche grafiche su Moments devono seguire il **Design System Adattivo** descritto in [`docs/01-brand.md`](docs/01-brand.md).
- Non hardcodare stili specifici per un solo tipo di evento; usa le variabili e le classi dinamiche per mantenere il design flessibile tra tutte le categorie.

---

## Divisione aree

| Area | File principali |
|------|-----------------|
| Editor Business | `pages/editor.html`, `editor-ui.css` |
| App / auth | `pages/app.js`, `pages/index.html` |
| Renderer pubblico | `worker/worker.js` |
| Admin | `pages/admin.html`, `admin.js`, `admin.css`, `admin-guide.js` |
| Moments | `pages/moments.js`, `moments.css`, `moments.html` |
| SQL | `sql/*.sql` (nuovi file versionati vNN) |
| Integrazioni | `worker/worker.js` + doc in `docs/09-shopify.md` |

---

## Lock e conflitti

- Controlla **Lock attivi** in `CODEX-COLLAB.md` prima di toccare aree sensibili
- Mai `git push --force` su `main`
- Un agente per file condiviso (`worker.js`) alla volta
- Non committare: `.env`, `.dev.vars`, export chat, chiavi API

---

## Versioning

- Un solo contatore release: `?v=NN` su HTML/JS
- Allineare `WORKER_VERSION` in `worker/worker.js` quando cambia il renderer
- Admin attuale: **v106** — prossima: **v107**
- Worker attuale: **v103**

```bash
# Release checklist
# 1. Incrementa ?v= su tutti i file HTML/JS toccati
# 2. Aggiorna WORKER_VERSION se serve
# 3. Deploy Worker prima (se renderer cambia), poi Pages
# 4. Aggiorna PROJECT_STATE.md + CHANGELOG.md
```

---

## Deploy

```bash
# Pages
cd pages && npx wrangler pages deploy . --project-name khamakey-app

# Worker
cd worker && npx wrangler deploy
```

Secrets **solo** su Cloudflare (`wrangler secret put`), mai nel codice.

---

## Cosa non fare

| ❌ Evita | ✅ Preferisci |
|---------|--------------|
| Lavorare su copie vecchie | `git pull` all'inizio |
| Refactor globale non richiesto | Task piccolo, file mirati |
| Due agenti su `worker.js` | Sequenziale o lock |
| Ignorare documentazione | Aggiorna `docs/` dopo modifica |
| Usare cartelle v34–v40 | Solo `khamakey-v41-consolidated` |
| Allargare una CSP/RLS con wildcard per far passare un errore | Aggiungere l'origine/permesso esatto e minimo, documentando perché |
| `delete`/`drop` su dati utente per "ripulire" | Chiedere conferma prima, sempre |

---

## Template fine sessione (log)

Aggiungi in `docs/13-roadmap.md`:

```markdown
| 2026-07-09 | Cursor | v107: descrizione breve di cosa è stato fatto |
```
