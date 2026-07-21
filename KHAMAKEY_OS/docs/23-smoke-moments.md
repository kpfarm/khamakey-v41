# 23 — Smoke test Moments (stabilità)

> Obiettivo: verificare end-to-end che Moments non sia rotto in produzione.  
> Data avvio: 2026-07-21 · Worker atteso: `v161-legal` · Editor: `v175`

## A — Verifiche automatiche (senza account)

| # | Check | Come | Esito |
|---|-------|------|-------|
| A1 | Worker health | `GET https://link.khamakeymoments.com/health` → `version` = `v161-legal`, Resend/Shopify active | ✅ 2026-07-21 |
| A2 | Privacy live | `https://app.khamakeymoments.com/moments-privacy` → 200 (`.html` fa 308) | ✅ Pages deploy 2026-07-21 |
| A3 | Termini live | `https://app.khamakeymoments.com/moments-terms` → 200 | ✅ |
| A4 | CSS legale | `moments-legal.css?v=175` → 200 | ✅ |
| A5 | App Moments | `moments` / `moments.html` con `?v=175` + consenso signup + auth-legal | ✅ |
| A6 | `/m/` 404 | slug inesistente → 404 HTML | ✅ |
| A7 | PIN gate reale | `/m/momentc9d6edcb35` → **401** form PIN + link Privacy/Termini (no leak contenuti) | ✅ |
| A8 | API senza PIN | RSVP/guestbook su pagina PIN-gated → 404 sicuro | ✅ |
| A9 | Pages deploy | Deploy da `git archive HEAD:pages` (senza WIP Business) | ✅ |

## B — Flusso account (serve login Moments)

Usa un account di prova o il tuo. Preferisci un prodotto **già attivato** se non hai un codice fresco.

| # | Check | Passo | Esito |
|---|-------|-------|-------|
| B1 | Login | `app.khamakeymoments.com/moments.html` → Accedi | ⬜ |
| B2 | Editor apre | Topbar, sezioni, anteprima | ⬜ |
| B3 | Salva | Modifica testo minore → Salva → ok | ⬜ |
| B4 | Pubblica | Sezione Pubblica → pagina live | ⬜ |
| B5 | Link `/m/slug` | Apri link pubblico da editor | ⬜ |
| B6 | PIN | Se PIN attivo: gate PIN → PIN corretto apre pagina | ⬜ |
| B7 | Footer legale | Su `/m/`: Privacy + Termini; notice «Ho capito» dismissibile | ⬜ |
| B8 | RSVP | Sezione attiva + WhatsApp → invio da `/m/` → ok in editor | ⬜ |
| B9 | Guestbook | Messaggio da `/m/` → appare dopo approvazione (o conferma API ok) | ⬜ |
| B10 | Ticket | Account → Assistenza → invia ticket → email staff / ticket in Admin | ⬜ |

## C — Officina (opzionale nello stesso giro)

| # | Check | Esito |
|---|-------|-------|
| C1 | Magazzino: chip = `/m/slug` (non codice attivazione) | ⬜ |
| C2 | PDF Cricut 4 sezioni genera senza errore | ⬜ |
| C3 | Supporto Admin: apri ticket → assegna → risposta Resend | ⬜ |

## Come chiudere

1. Segnare tutti i ⬜ B* (e C* se fatti) con ✅ o ❌ + nota
2. Se ❌: aprire fix mirato, **non** refactor
3. Aggiornare `.cursor/rules/cose-da-fare.mdc` (punto smoke → fatto)
4. Aggiornare `PROJECT_STATE.md` → Prossimo obiettivo

## Input necessario dall’utente

Per B1–B10 serve il **login Moments** (e per B8–B9 un PIN se la pagina è protetta).

Checklist avvio: [23-smoke-moments.md](docs/23-smoke-moments.md).

*KhamaKey OS — smoke Moments 2026-07-21*
