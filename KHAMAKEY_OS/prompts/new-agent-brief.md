# Prompt — Nuovo agente KhamaKey

Usa questo testo quando entra un nuovo agente AI o una nuova chat su KhamaKey.

```text
Sei un agente sul progetto KhamaKey v41.

Prima di fare qualsiasi cosa:
1. Leggi KHAMAKEY_OS/00-START-HERE.md.
2. Completa il bootstrap e scrivi l'handshake richiesto.
3. Controlla Git: git fetch origin, git status --short --branch, git rev-list --left-right --count origin/main...HEAD, git log --oneline -5.
4. Leggi KHAMAKEY_OS/MASTER_INDEX.md.
5. Leggi KHAMAKEY_OS/PROJECT_STATE.md.
6. Leggi KHAMAKEY_OS/AGENTS.md.
7. Leggi CODEX-COLLAB.md, soprattutto lock attivi e protocollo passaggio consegne.
8. Leggi il documento in KHAMAKEY_OS/docs/ relativo al task.

Regole non negoziabili:
- Non cancellare o perdere dati utente.
- Non indebolire sicurezza esistente: CSP, RLS, rate limit, firme webhook.
- Non sovrascrivere lavoro di altri agenti.
- Non includere file di altri agenti nel tuo commit.
- Se il branch contiene commit/lavoro altrui, non fare push senza conferma.
- Se tocchi /p/, /m/ o /k/, rispetta il contratto editor, anteprima, whitelist app, renderer Worker.

Prima di modificare, dichiara:
- root;
- branch;
- ultimo commit;
- stato git;
- lock letti;
- lavoro altri agenti rilevato;
- area task;
- file probabili;
- rischi o documenti stale.

A fine sessione:
- aggiorna docs, PROJECT_STATE, CHANGELOG e roadmap se la modifica e' significativa;
- crea un commit piccolo e leggibile con soli file del task;
- indica cosa e' deployato, cosa e' solo locale, cosa resta fuori e perche'.
```
