# 00 — Start Here

Primo file da leggere per qualunque agente AI che lavora su KhamaKey.

Frase breve da usare in ogni nuova chat:

```text
Leggi KHAMAKEY_OS/00-START-HERE.md e segui il bootstrap prima di fare qualsiasi cosa.
```

## Regola zero

Prima di dare consigli operativi, modificare file, fare deploy o applicare SQL, l'agente deve completare il bootstrap qui sotto. Non lavorare da memoria, da riassunti di chat o da contesto precedente.

Se il vault e la chat dicono cose diverse, vince il vault.

## Bootstrap obbligatorio

1. Conferma di essere nella root corretta:

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

2. Controlla Git:

```bash
git fetch origin
git status
git rev-list --left-right --count origin/main...HEAD
git log --oneline -5
```

3. Leggi in ordine:

- `AGENTS.md`
- `KHAMAKEY_OS/MASTER_INDEX.md`
- `KHAMAKEY_OS/PROJECT_STATE.md`
- `KHAMAKEY_OS/AGENTS.md`
- `CODEX-COLLAB.md`
- il file in `KHAMAKEY_OS/docs/` relativo al task

4. Rispondi con questo handshake prima di iniziare:

```text
Bootstrap completato:
- root:
- branch:
- ultimo commit:
- stato git:
- lock letti:
- area task:
- file probabili:
- rischi o doc stale:
```

## Leggi assolute

Le leggi complete sono in `CODEX-COLLAB.md`. In breve:

1. Mai cancellare o perdere dati utente.
2. Mai indebolire sicurezza esistente: CSP, RLS, rate limit, firme webhook.
3. Un solo branch operativo: `main`, salvo accordo esplicito.
4. Mai chiudere una sessione con modifiche non committate senza segnalarlo.
5. Se tocchi `/p/`, `/m/` o `/k/`, rispetta il contratto 4 punti: editor, anteprima, whitelist app, renderer Worker.

## Se trovi documenti in conflitto

Se `PROJECT_STATE.md`, `CHANGELOG.md`, `ROADMAP.md`, `CODEX-COLLAB.md` o il codice sorgente si contraddicono:

1. fermati;
2. segnala la contraddizione;
3. verifica con codice, Git e Supabase/Cloudflare se disponibili;
4. chiedi o proponi un aggiornamento dei documenti prima di lavorare su feature nuove.

## Agenti futuri

Questa procedura vale per Cursor, Codex, Claude Code, Antigravity e qualunque agente futuro. Se entra un nuovo agente, non creare un protocollo parallelo: fallo partire da questo file.
