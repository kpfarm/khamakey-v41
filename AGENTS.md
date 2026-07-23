# KhamaKey — Agent Entry Point

This project uses `KHAMAKEY_OS/` as the operating vault for all AI agents.

**First instruction for every agent:** read `KHAMAKEY_OS/00-START-HERE.md` and complete its bootstrap before doing anything else.

**Absolute rules (no exceptions, for every agent — Cursor, Codex, Claude, Antigravity, anything future):** never delete or lose user data; never weaken an existing security control (CSP, RLS, rate limiting, webhook signature checks) as a side effect of an unrelated change; never break the NFC → editor → `/m/` `/k/` chain; never break media uploads (R2 handlers/endpoints). Full detail in `CODEX-COLLAB.md` → "Regole assolute".

Before changing code or documentation, read these files in order:

1. `KHAMAKEY_OS/MASTER_INDEX.md`
2. `KHAMAKEY_OS/PROJECT_STATE.md`
3. `KHAMAKEY_OS/README.md`
4. `KHAMAKEY_OS/AGENTS.md`
5. `CODEX-COLLAB.md`
6. The relevant file in `KHAMAKEY_OS/docs/`

Work from this root only:

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

Do not use older `v34`-`v40` project copies.

For public page changes, keep the four-point contract aligned:

1. Editor UI
2. Editor preview
3. `pages/app.js` public state whitelist
4. `worker/worker.js` public renderer

After significant changes, update the relevant `KHAMAKEY_OS/docs/` chapter, `KHAMAKEY_OS/PROJECT_STATE.md`, and `KHAMAKEY_OS/CHANGELOG.md`.
