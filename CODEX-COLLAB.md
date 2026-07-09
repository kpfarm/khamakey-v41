# Collaborazione Cursor + Codex su KhamaKey v41

Questo documento definisce come lavorare sullo stesso progetto senza sovrapposizioni.

## Root del progetto (unica fonte)

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

**Non modificare** le cartelle v34–v40 originali in `outputs/`.

## Divisione del lavoro

| Area | Chi | File principali |
|------|-----|-----------------|
| Editor business (UI, blocchi, anteprima) | Codex o Cursor | `pages/editor.html` |
| Contratto dati pubblici + salvataggio | Cursor | `pages/app.js` |
| Renderer pagine pubbliche NFC | Cursor | `worker/worker.js` |
| Admin piattaforma | Entrambi | `pages/admin.html`, `pages/admin.js` |
| Moments (utente finale) | Cursor | `pages/moments.js`, `pages/moments.css` |
| SQL / Supabase | Cursor | `sql/*.sql` |
| Deploy e pacchetti | Codex (skill) | script in `~/.codex/skills/khamakey-release-workflow/` |

## Regola d’oro (da rispettare sempre)

Ogni campo che influenza la **pagina pubblica** deve essere aggiornato in **4 punti**:

1. Controllo nell’editor (`editor.html`)
2. Anteprima (`renderPublicPreview()` in `editor.html`)
3. Whitelist in `publicStateFromEditor()` (`app.js`)
4. Renderer Worker (`worker/worker.js`)

Per **Moments**, aggiornare anche:

- `moments.js` (editor utente)
- `worker/worker.js` (`renderMomentPage`)

## Workflow Codex consigliato

Prima di ogni sessione Codex, indicare:

```text
Progetto: khamakey-v41-consolidated
Task: [es. migliorare sezione catalogo nell'editor]
Non toccare: worker.js (a meno che non cambi il contratto pubblico)
```

Dopo le modifiche Codex, eseguire dalla root v41:

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/sync_public_css.py pages
python3 ~/.codex/skills/khamakey-release-workflow/scripts/verify_release.py .
```

Aggiornare lo skill Codex: usare `pages/` al posto di `khamakey-test-app` e `worker/` al posto di `khamakey-cloudflare-worker`.

## Workflow Cursor (questa chat)

1. Leggere `ROADMAP.md` per la fase corrente
2. Implementare fix e feature nella cartella v41
3. Aggiornare `ROADMAP.md` spuntando le voci completate
4. Non creare commit salvo richiesta esplicita

## Convenzioni versione

- Incrementare `?v=` nei file HTML quando si cambiano CSS/JS
- Worker: aggiornare `WORKER_VERSION` in `worker/worker.js`
- Nuovi pacchetti: `khamakey-cloudflare-pages-vNN.zip` nella root v41

## Comunicazione tra sessioni

Lasciare note brevi in `ROADMAP.md` sotto **Log sessioni** con data, autore (Cursor/Codex) e cosa è stato fatto.

## Lock attivi (2026-07-09)

Evitare conflitti tra agenti Cursor/Codex che lavorano sullo stesso repo:

| Area | Owner / stato | Non toccare senza coordinamento |
|------|----------------|----------------------------------|
| **Rete rivenditori v68** | Cursor — applicato Supabase + admin v105 | `sql/khamakey-reseller-network-v68.sql`, tab Rete rivenditori |
| **Stripe secrets Worker** | Da configurare (account personale temp) | `wrangler secret put STRIPE_*` — vedi `STRIPE-PERSONAL-SETUP.md` |
| **Stripe webhook / ingest** | Predisposto v103, hook provvigioni v69 pianificato | `worker/worker.js` handler Stripe, `ingest_stripe_checkout_event` |
| **Shopify Moments** | Operativo | webhook Shopify, catalogo vendita |
| **Editor Business public contract** | Codex/Cursor condiviso | `publicStateFromEditor`, renderer Worker NFC |

### Messaggio tipo per nuova sessione agente

```text
Progetto: khamakey-v41-consolidated
Task: [es. configurare Stripe personale test]
Lock: non modificare admin rete rivenditori / SQL v68
Riferimenti: STRIPE-PERSONAL-SETUP.md, ROADMAP Sprint F
```
