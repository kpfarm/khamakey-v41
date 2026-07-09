# ADR-004: KhamaKey OS

**Data:** 2026-07-09  
**Stato:** Accettata

## Contesto

La conoscenza del progetto è sparsa tra chat AI, file root (`ROADMAP.md`, `CODEX-COLLAB.md`) e memoria degli agenti. Ogni nuova sessione riparte da zero.

## Decisione

Creare `KHAMAKEY_OS/` come **sistema operativo del progetto**:

- `MASTER_INDEX.md` — punto di ingresso
- `PROJECT_STATE.md` — stato live
- `docs/00–15` — manuale ufficiale
- `AGENTS.md` + `CLAUDE.md` — regole condivise
- Stessa cartella per Obsidian, Cursor, Codex, Claude Code

Migrazione **graduale**: codice resta in `pages/`, `worker/`, `sql/` finché non si sposta in `app/`.

## Conseguenze

- Ogni AI legge lo stesso cervello prima di lavorare
- Documentazione si aggiorna insieme al codice
- File legacy restano validi durante la transizione
- Obsidian diventa centro di controllo senza duplicare file
