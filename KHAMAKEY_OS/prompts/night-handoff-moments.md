# Handoff notte — Editor Moments (2026-07-10)

> Per l'utente e per gli altri agenti AI al rientro.

## Completato stanotte

| Release | Cosa |
|---------|------|
| **v107** | RSVP backend + pannello risposte + export CSV |
| **v108** | Libro degli ospiti + moderazione editor |
| **v109** | Anniversari email (cron 07:00 UTC) + toggle in Pubblica |
| **v110** | Dashboard organizzatore + email lettera al futuro |

## Deploy produzione

- SQL v70–v73 applicati su Supabase `cuxlwaocjqwzluycznyp`
- Worker live: `v110-moment-editor-dashboard` (verifica `/health`)
- Pages: deploy da branch `cursor/moments-editor-v110`

## Branch Git

`cursor/moments-editor-v110` — contiene solo file Moments/Worker/SQL/docs (no `editor.html` Business).

## Lock attivo

**Moments editor** — owner: notte 2026-07-10 — rilasciare dopo merge su `main`.

## Prossimi step consigliati (domani)

1. Smoke test iPhone su matrimonio + RSVP + guestbook
2. Merge branch → `main` + redeploy Pages produzione
3. Landing Moments dedicata (marketing)
4. Notifica push opzionale oltre email (fase 2)

## Test rapidi

```bash
# Health Worker
curl https://khamakey-nfc.khamakey-nfc.workers.dev/health

# Cron anniversari (richiede ingest key)
curl -X POST https://khamakey-nfc.khamakey-nfc.workers.dev/api/cron/moment-anniversaries \
  -H "x-khamakey-cron-key: INGEST_KEY"
```

## File nuovi principali

- `pages/moment-rsvp-responses.js`
- `pages/moment-guestbook-kit.js`
- `pages/moment-editor-dashboard.js`
- `sql/khamakey-moments-rsvp-v70.sql` … `v73`
