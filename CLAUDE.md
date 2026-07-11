# KhamaKey — Claude Entry Point

Claude must treat `KHAMAKEY_OS/` as the project vault and source of truth.

Start every session from this root:

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

Read first:

1. `KHAMAKEY_OS/MASTER_INDEX.md`
2. `KHAMAKEY_OS/PROJECT_STATE.md`
3. `KHAMAKEY_OS/CLAUDE.md`
4. `CODEX-COLLAB.md`
5. The relevant chapter in `KHAMAKEY_OS/docs/`

Use this startup prompt when opening a new Claude session:

```text
Project: KhamaKey v41 consolidated
Root: /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated

Before starting, read:
1. KHAMAKEY_OS/MASTER_INDEX.md
2. KHAMAKEY_OS/PROJECT_STATE.md
3. KHAMAKEY_OS/CLAUDE.md
4. CODEX-COLLAB.md

Task:
[write the task here]

Do not use older v34-v40 copies.
After significant changes, update KHAMAKEY_OS docs and state files.
```
