# KhamaKey OS

**Sistema operativo del progetto KhamaKey** — un unico cervello condiviso tra Obsidian, Cursor, Codex e Claude Code.

---

## Cos'è

KhamaKey OS non è un vault Obsidian separato. È la **struttura organizzativa** che contiene:

- **Stato live** del progetto (`PROJECT_STATE.md`)
- **Manuale ufficiale** numerato (`docs/00` → `docs/15`)
- **Regole AI** condivise (`AGENTS.md`, `CLAUDE.md`)
- **Decisioni** architetturali (`decisions/`)
- **Prompt** riutilizzabili (`prompts/`)
- **Codice** (in migrazione verso `app/`)

Una sola cartella. Nessuna copia. Tutti gli strumenti lavorano sugli stessi file.

---

## Come aprire

### Cursor
Apri la root del repo (o direttamente `KHAMAKEY_OS/` come workspace secondario):

```text
khamakey-v41-consolidated/
```

Le regole in `KHAMAKEY_OS/.cursor/rules/` si applicano automaticamente.

### Obsidian
Apri come vault la cartella `KHAMAKEY_OS/` oppure l'intera root del repo.  
I link `[[docs/03-editor]]` funzionano con i file `.md` in `docs/`.

### Codex / Claude Code
All'inizio di ogni sessione, incolla il prompt da [`prompts/session-start.md`](prompts/session-start.md).

---

## Flusso di lavoro AI

```text
1. Leggi MASTER_INDEX.md
2. Leggi PROJECT_STATE.md
3. Leggi AGENTS.md
4. Leggi il doc in docs/ relativo al tuo task
5. Modifica il codice (../pages/, ../worker/, ../sql/)
6. Aggiorna docs/ + PROJECT_STATE.md + CHANGELOG.md
```

---

## Fasi di implementazione

| Fase | Stato | Descrizione |
|------|-------|-------------|
| **1 — Cervello** | ✅ In corso | Struttura cartelle + file fondamentali |
| **2 — Cervello unico** | ⬜ | Stessa cartella in Obsidian + editor AI |
| **3 — Regole** | ✅ | AGENTS.md + regole Cursor |
| **4 — Knowledge Base** | 🟡 | Migrazione graduale in `docs/` |
| **5 — Automazione** | ⬜ | Aggiornamento doc automatico post-modifica |

---

## Struttura

```text
KHAMAKEY_OS/
├── MASTER_INDEX.md       ← inizia sempre da qui
├── PROJECT_STATE.md      ← stato live
├── README.md             ← questo file
├── AGENTS.md             ← regole tutte le AI
├── CLAUDE.md             ← regole Claude Code / Codex
├── CHANGELOG.md          ← storico modifiche OS + piattaforma
│
├── app/                  ← codice (transizione da ../pages, ../worker, ../sql)
├── docs/                 ← manuale 00–15
├── decisions/            ← ADR (Architecture Decision Records)
├── prompts/              ← prompt sessione
├── changelog/            ← dettaglio release per versione
├── assets/               ← media statici
└── .cursor/rules/        ← regole Cursor
```

---

## Principi

1. **Una fonte di verità** — niente duplicati tra chat e file
2. **Documentazione prima del codice** — leggi prima di modificare
3. **Aggiorna dopo** — ogni modifica significativa aggiorna il doc correlato
4. **Migrazione graduale** — non rompere il codice esistente
5. **Versioni allineate** — `?v=N` su Pages + `WORKER_VERSION` insieme

---

##Collegamenti

- Repo: [github.com/kpfarm/khamakey-v41](https://github.com/kpfarm/khamakey-v41)
- Deploy Pages: `khamakey-app.pages.dev`
- Deploy Worker: `khamakey-nfc.khamakey-nfc.workers.dev`
- Supabase: progetto `cuxlwaocjqwzluycznyp`
