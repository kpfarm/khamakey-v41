# Collaborazione multi-agente su KhamaKey v41

Come lavorare **più chat Cursor**, **Codex**, **Antigravity**, altri agenti AI e **umani** sullo stesso repo senza sovrascriversi a vicenda e senza compromettere il sistema.

---

## 🔒 Regole assolute — vincolanti per ogni agente, senza eccezioni

Queste regole valgono per Cursor, Codex, Claude, Antigravity e qualunque altro agente AI che si aggiunga in futuro a questo progetto. Non sono suggerimenti: se un cambiamento le viola, va fermato e corretto, non discusso dopo.

### 1. Mai cancellare o perdere dati utente

**Nessuna modifica, migrazione o refactor può cancellare dati inseriti dagli utenti** — pagine Business, eventi Moments, ordini, messaggi guestbook, risposte RSVP, media caricati, clienti, contatti. Questo include:
- Vietato `drop table`/`drop column` su tabelle con dati reali senza backup esplicito e conferma dell'utente umano
- Vietato `delete`/`truncate` non filtrato o con filtro troppo ampio
- Le migrazioni devono essere additive quando toccano dati utente: aggiungi colonne/tabelle, non rimuovere quelle esistenti, salvo istruzione esplicita dell'utente
- **Eccezione dichiarata**: tabelle di sola infrastruttura tecnica create per essere pulite periodicamente (es. `moment_pin_attempts`, `platform_rate_limits` — contatori di rate-limiting, non contenuto utente) possono avere cleanup automatico, ma solo se lo scopo di pulizia periodica è documentato nel file SQL stesso fin dalla creazione della tabella

In caso di dubbio se qualcosa sia "dato utente": trattalo come tale e chiedi conferma prima di toccarlo.

### 2. Mai indebolire la sicurezza — ogni cambiamento deve dare beneficio, mai crearlo o toglierlo

Un cambiamento è accettabile solo se **risolve un problema reale o aggiunge un beneficio esplicitamente richiesto**. Non è mai accettabile se, come effetto collaterale, indebolisce una protezione già esistente:

- **CSP**: se un asset esterno serve, aggiungi l'origine esatta e specifica (`https://cdn-specifico.com`). **Mai usare wildcard come `https:` o `*`** per "far passare" un errore — quello annulla la protezione per chiunque altro. Se non sai quale origine ti serve davvero, fermati e documenta la necessità invece di allargare la policy.
- **RLS**: mai disabilitare Row Level Security su una tabella esistente, mai sostituire una policy restrittiva con `using (true)` per comodità.
- **Verifica firme webhook, rate limiting, RPC di sicurezza** (`get_public_moment`, `check_rate_limit`, ecc.): non toccare la logica di verifica senza motivo esplicito; se serve un fix, mantieni lo stesso livello di protezione o aumentalo, mai il contrario.
- Se un controllo di sicurezza sta bloccando un lavoro legittimo, la soluzione è **restringere la richiesta al minimo necessario e documentato**, non allargare il controllo.

**Prima di modificare `worker.js` (CSP, auth, rate limit), `sql/*.sql` (RLS, funzioni SECURITY DEFINER) o `pages/_headers`**: leggi la sezione "Security hardening" in `KHAMAKEY_OS/PROJECT_STATE.md`. Se la tua modifica tocca uno di questi controlli, scrivi nel commit **perché** — non basta che funzioni, deve essere chiaro cosa e perché è cambiato.

### 3. Se un controllo di sicurezza ti blocca, non aggirarlo in silenzio

Se una CSP, una RLS, un rate limit o una verifica firma ti impedisce di completare un task: fermati, scrivi nel commit (o segnala all'utente) qual è il blocco esatto e quale origine/permesso minimo ti servirebbe. Non allargare la policy "per provare" e non commitare la versione allargata senza spiegazione — è successo il 2026-07-11 (CSP allargata a `https:` wildcard su `worker.js`/`pages/_headers` senza commit, poi corretta) ed è esattamente il comportamento da evitare.

---

## Ingresso di un nuovo agente nel progetto (onboarding)

Quando un agente nuovo (umano o AI) inizia a lavorare su questo repo per la prima volta:

0. Legge `KHAMAKEY_OS/00-START-HERE.md` e completa il bootstrap/handshake prima di fare qualunque altra cosa.
1. Legge, in ordine: questo file (soprattutto le **Regole assolute** sopra) → `KHAMAKEY_OS/PROJECT_STATE.md` → `KHAMAKEY_OS/MASTER_INDEX.md` → `ROADMAP.md`
2. Fa `git fetch origin && git status && git rev-list --left-right --count origin/main...HEAD` prima di toccare qualunque file (vedi sezione "Allineamento branch" sotto)
3. Se il suo task tocca un'area con lock attivo (tabella sotto): coordina prima di modificare
4. Ogni suo commit deve poter essere spiegato in una frase: cosa cambia e perché — se non lo sa dire, non è pronto per committare
5. A fine sessione: commit + push (mai lavoro non salvato), aggiorna `ROADMAP.md` e `PROJECT_STATE.md` con cosa ha fatto

Questo vale anche per agenti "di design" (es. Antigravity) che normalmente toccano solo CSS/asset grafici: se il loro lavoro tocca `worker.js`, `pages/_headers` o qualunque file con logica di sicurezza, si applicano comunque le **Regole assolute** sopra.

Frase breve da usare con qualunque agente:

```text
Leggi KHAMAKEY_OS/00-START-HERE.md e segui il bootstrap prima di fare qualsiasi cosa.
```

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

## Allineamento branch e conflitti (regole dopo l'incidente 2026-07-11)

Il 2026-07-11 si è scoperto che il lavoro da v112 a v118 **più** tutto l'hardening di sicurezza esisteva solo come working tree non committata, su un branch (`cursor/moments-editor-v110`) fermo da giorni e mai allineato a `main`. Nessun conflitto reale, ma solo fortuna: se quella cartella si fosse persa, sarebbe sparito tutto. Da qui queste regole, vincolanti per ogni agente (Cursor, Codex, Claude):

### Regola d'oro: mai chiudere una sessione con modifiche non committate

Non esistono eccezioni per "task ancora in corso" — si committa comunque, anche a metà, con un messaggio che dice esplicitamente `WIP` o `non testato`. Working tree non salvata = lavoro che non esiste per gli altri agenti e a rischio perdita.

### Un solo branch vivo: `main`

- Task piccoli/sequenziali (la maggioranza): commit diretti su `main`.
- Task lunghi o rischiosi che richiedono un branch separato: il branch va **fuso o fast-forwardato su `main` prima di chiudere la sessione**, non lasciato lì "per dopo". Se non si fa in tempo entro la sessione, scriverlo esplicitamente in `PROJECT_STATE.md` con la data, così la sessione successiva sa che deve riconciliare.

### Inizio sessione — controllo allineamento (aggiunta al workflow esistente)

Prima di leggere qualunque doc, verificare la relazione col branch principale:

```bash
git fetch origin
git status
git rev-list --left-right --count origin/main...HEAD
```

Leggere il risultato: `0  0` = allineato, procedi. `0  N` = sei avanti di N commit non pushati, valuta se pusharli subito. `N  0` = sei indietro, fai `git pull` prima di toccare qualsiasi file. `N  M` (entrambi diversi da zero) = **divergenza reale** — vedi sotto.

### Se emerge un conflitto o una divergenza reale

Quando `git pull`/merge segnala conflitto, o `git rev-list` mostra commit diversi su entrambi i lati:

1. **Fermarsi. Non risolvere alla cieca, non forzare (`--force`, `-X ours/theirs` senza guardare), non scegliere in automatico "la versione più recente".**
2. Mostrare all'utente i file in conflitto e un riassunto di cosa cambia in ciascuna versione.
3. Chiedere come vuole risolvere — specialmente su `worker.js`, `sql/`, `pages/editor.html` (file grandi, tante mani).
4. Solo dopo la conferma, applicare il merge e ricommittare.

### Checklist deploy (SQL → Worker → Pages, mai al contrario)

Prima di ogni deploy in produzione, confermare in quest'ordine:

1. SQL applicata su Supabase (verificare, non assumere)
2. Secrets Worker aggiornati se servono (`wrangler secret put ...`)
3. `wrangler deploy` (Worker) — solo se cambia il renderer NFC/API
4. `wrangler pages deploy` (Pages)
5. Smoke test: `/p/`, `/m/`, `/k/`, RSVP, guestbook, PIN gate

Se un agente non può completare uno di questi passaggi (manca un accesso, una credenziale), **scriverlo esplicitamente in `PROJECT_STATE.md`** invece di saltarlo in silenzio.

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
| **Rete rivenditori v68** | Libero per fix minori | `sql/khamakey-reseller-network-v68.sql`, tab admin Rete rivenditori |
| **Stripe secrets Worker** | Da configurare (account personale temp) | `wrangler secret put STRIPE_*` — vedi `STRIPE-PERSONAL-SETUP.md` |
| **Stripe webhook / ingest** | Predisposto — libero | handler Stripe in `worker/worker.js`, RPC `ingest_stripe_checkout_event` |
| **Shopify Moments** | Operativo — libero | webhook ordini, catalogo vendita, sync bozze |
| **Editor Business — contratto pubblico** | Condiviso | `publicStateFromEditor`, renderer `/p/` nel Worker |
| **Admin / Officina Moments** | **Libero** (live **v170**) | `admin.html`, `moments-admin.html`, `admin.js`, `admin.css`, `admin-guide.js`, `admin-moment-labels.js` — coordinarsi se stesso pannello |
| **Moments editor** | **Libero** (live **v166**) | `moments.js`, `moments.html`, `moment-*.js` — prendere lock prima di refactor ampi |
| **Security hardening (audit 2026-07-11)** | Completato e deployato (vedi `PROJECT_STATE.md`) | Regole assolute CSP/RLS/dati restano vincolanti |
| **`worker/worker.js`** | **Libero** (live **v157-nav-contrast**) — file più conteso | Chi tocca `worker.js` prende lock esplicito e non parallelizza |
| **Editor Business — upload media** | Completato v124 — libero | PDF catalogo / docs base64→R2 ancora pendenti (`docs/03-editor.md`) |
| **Business WIP locale (working tree)** | **Non toccare** senza owner | `editor.html`, `editor-*.js`, SQL v147/v148 untracked, demo landing — commit separati |

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

### Protocollo minimo di passaggio consegne

Ogni agente deve lasciare agli altri abbastanza contesto per non riportare il progetto indietro e per non pubblicare cambiamenti non compresi.

All'inizio:

1. leggere `KHAMAKEY_OS/00-START-HERE.md`;
2. controllare `git status --short --branch`;
3. leggere gli ultimi 5 commit;
4. leggere i lock attivi;
5. dichiarare quali file sporchi/non tracciati sembrano di altri agenti.

Durante:

1. non sovrascrivere file sporchi non propri;
2. non usare `git checkout`, `reset`, merge automatici o risoluzioni "ours/theirs" senza spiegare il conflitto;
3. se serve toccare un file conteso (`worker.js`, `sql/`, `admin.js`, `moments.js`), prendere o chiedere lock.

Alla fine:

1. aggiornare documenti e roadmap;
2. fare commit piccolo e leggibile con soli file del task;
3. dire se e' stato fatto deploy;
4. dire se il branch e' avanti/indietro o contiene lavoro di altri;
5. dire esplicitamente cosa non e' stato incluso nel commit.

Se un agente non puo' completare push/deploy/test perche' il ramo contiene lavoro altrui o mancano permessi, non deve "chiudere in silenzio": deve scriverlo nel riepilogo finale e, se rilevante, in `PROJECT_STATE.md`.

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

- Un solo contatore release piattaforma: `?v=NN` su HTML/JS (bump solo se cambia runtime)
- **SSOT live** (2026-07-21): Admin/Officina **v170** · Moments **v166** · Worker **v157-nav-contrast** · Business shell `APP_VERSION` **167** · SQL **v160**
- Worker: `WORKER_VERSION` in `worker/worker.js`
- Tabella ufficiale: `KHAMAKEY_OS/PROJECT_STATE.md` → se diverge, vince il codice
- Dettaglio workflow: `.cursor/rules/git-commit-workflow.mdc`

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
