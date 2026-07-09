# KhamaKey — Istruzioni Claude Code / Codex

> Estende [`AGENTS.md`](AGENTS.md) con workflow specifici per Claude Code e OpenAI Codex.

---

## Root obbligatoria

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

**Non usare** le cartelle v34–v40 in `outputs/`.

---

## Avvio sessione

Copia da [`prompts/session-start.md`](prompts/session-start.md) oppure:

```text
Progetto: khamakey-v41-consolidated
Repo: github.com/kpfarm/khamakey-v41 (branch main)

Prima di iniziare:
1. Leggi KHAMAKEY_OS/MASTER_INDEX.md
2. Leggi KHAMAKEY_OS/PROJECT_STATE.md
3. Leggi CODEX-COLLAB.md (lock attivi)

Task: [descrivi in 1-2 frasi]
Non toccare: [aree lockate]
File probabili: [es. pages/admin.js]

A fine sessione: aggiorna docs/, PROJECT_STATE, CHANGELOG, commit + push.
```

---

## Skill release (Codex)

Percorsi corretti per v41:

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/sync_public_css.py \
  /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/pages

python3 ~/.codex/skills/khamakey-release-workflow/scripts/verify_release.py \
  /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

> Lo skill di default punta a `khamakey-test-app` — **sempre** specificare la root v41-consolidated.

Pacchetto zip:

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/package_release.py \
  /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

---

## Contratto pagina pubblica

Se modifichi campi visibili su `/p/` o `/m/`:

1. Verifica anteprima in `editor.html` / `moments.js`
2. Verifica whitelist in `publicStateFromEditor()` (`app.js`)
3. Verifica renderer in `worker/worker.js`
4. Esegui `sync_public_css.py` se tocchi CSS pubblico
5. Esegui `verify_release.py` prima del deploy

---

## File da leggere per dominio

| Task | Leggi prima |
|------|-------------|
| Editor Business | `docs/03-editor.md` |
| Moments | `docs/03-editor.md` + `docs/04-area-cliente.md` |
| Admin | `docs/05-admin.md` |
| Shopify / Stripe | `docs/09-shopify.md` + `../STRIPE-PERSONAL-SETUP.md` |
| Database | `docs/07-database.md` + `sql/README.md` |
| Deploy | `docs/08-cloudflare.md` |
| Rivenditori | `docs/06-rivenditori.md` |

---

## Fine sessione Codex

1. `git status` + `git diff` — niente segreti
2. Aggiorna `KHAMAKEY_OS/docs/` relativo al task
3. Aggiorna `PROJECT_STATE.md` se cambia versione
4. Riga log in `docs/13-roadmap.md`
5. Commit + push su `main`

Messaggio commit esempio:

```text
feat(admin): descrizione breve del perché

Aggiorna docs/05-admin.md e PROJECT_STATE.
```
