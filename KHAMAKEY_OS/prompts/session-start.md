# Prompt — Inizio sessione AI

Copia-incolla all'inizio di ogni nuova chat (Cursor, Codex, Claude Code).

---

## Template completo

```text
Progetto: KhamaKey v41 — khamakey-v41-consolidated
Repo: github.com/kpfarm/khamakey-v41 (branch main)

Root:
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated

Prima di iniziare:
1. Leggi KHAMAKEY_OS/00-START-HERE.md
2. Completa bootstrap e handshake
3. git pull origin main
4. Leggi KHAMAKEY_OS/MASTER_INDEX.md
5. Leggi KHAMAKEY_OS/PROJECT_STATE.md
6. Leggi KHAMAKEY_OS/AGENTS.md
7. Leggi CODEX-COLLAB.md (lock attivi)
8. Leggi il doc in KHAMAKEY_OS/docs/ relativo al task

Regola collaborazione:
- Prima di modificare, dichiara file sporchi/non tracciati e ultimi commit locali.
- Non sovrascrivere lavoro di altri agenti.
- Se tocchi file contesi, coordina lock in CODEX-COLLAB.md.
- A fine sessione indica cosa e' deployato, cosa e' solo locale e cosa resta fuori.

Task di questa sessione: [descrivi in 1-2 frasi]

Non toccare: [es. worker.js Stripe, sql v68]

File probabili: [es. pages/admin.js, KHAMAKEY_OS/docs/05-admin.md]

A fine sessione:
- Aggiorna docs/ + PROJECT_STATE.md + CHANGELOG.md
- Riga log in docs/13-roadmap.md
- Commit piccolo con soli file del task
- Push solo se il branch non contiene lavoro altrui non coordinato
- Rilascia lock se preso
```

---

## Template breve (task piccolo)

```text
KhamaKey v41 — leggi KHAMAKEY_OS/00-START-HERE.md e completa il bootstrap
Task: [descrizione]
Non toccare: [aree lockate]
Comunica file sporchi, lock e commit locali prima di modificare.
```

---

## Template post-modifica significativa

```text
Ho completato: [descrizione]

Aggiorna automaticamente:
- KHAMAKEY_OS/docs/[area].md
- KHAMAKEY_OS/PROJECT_STATE.md (se cambia versione)
- KHAMAKEY_OS/CHANGELOG.md
- KHAMAKEY_OS/docs/13-roadmap.md (log sessione)
```

---

## Template multi-agente (feature grande)

```text
Feature: [es. sistema coupon]

Fase 1 — Codex/Claude: logica backend + SQL
Fase 2 — Cursor: UI editor + admin
Fase 3 — Chiunque: aggiorna docs/03-editor.md, docs/07-database.md, docs/13-roadmap.md

Lock richiesto su: [area in CODEX-COLLAB.md]
```
