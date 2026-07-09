# 14 — FAQ

## Progetto e setup

### Quale cartella devo aprire?
```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```
Non usare le cartelle v34–v40 in `outputs/`.

### Da dove inizia un agente AI?
1. `KHAMAKEY_OS/MASTER_INDEX.md`
2. `KHAMAKEY_OS/PROJECT_STATE.md`
3. `KHAMAKEY_OS/AGENTS.md`
4. Il doc in `docs/` relativo al task

### Come evito conflitti tra agenti?
Leggi `CODEX-COLLAB.md` → Lock attivi. Un agente per `worker.js` alla volta.

---

## Deploy

### In che ordine deployo?
1. Supabase (se nuove migrazioni)
2. Worker (se cambia renderer NFC)
3. Pages (frontend)

### Come faccio cache bust?
Incrementa `?v=NN` su HTML/JS + `WORKER_VERSION` in `worker.js`.

### Dove metto i secrets?
Solo su Cloudflare: `npx wrangler secret put NOME_SECRET`

---

## Sviluppo

### Ho modificato un campo della pagina pubblica. Cosa aggiorno?
I **4 punti**: `editor.html` UI, `editor.html` anteprima, `app.js` whitelist, `worker.js` renderer.

### Dove sta il CSS della pagina pubblica?
`pages/public-page.css` — sincronizzare con Worker via `sync_public_css.py`.

### Come testo in locale?
```bash
cd pages && python3 -m http.server 8080
cd worker && npx wrangler dev
```

---

## Integrazioni

### Shopify non riceve ordini?
Verifica webhook in Shopify Admin + secrets Worker + log in Supabase.

### Stripe non funziona?
Probabilmente mancano `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`. Vedi `STRIPE-PERSONAL-SETUP.md`.

### Email ordine non parte?
Verifica `RESEND_API_KEY` in Worker + `activation_email_sent_at` dedup.

---

## KhamaKey OS

### Cos'è KhamaKey OS?
Il sistema operativo del progetto: documentazione + regole AI + stato live in `KHAMAKEY_OS/`.

### Posso aprirlo in Obsidian?
Sì — apri `KHAMAKEY_OS/` (o l'intera root) come vault.

### I file legacy (ROADMAP.md, CODEX-COLLAB.md) sono ancora validi?
Sì, durante la transizione. Verranno migrati gradualmente in `docs/`.
