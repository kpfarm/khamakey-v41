# ADR-003: Versioning unificato

**Data:** 2026-07-09  
**Stato:** Accettata

## Contesto

Admin, editor, moments e worker hanno versioni separate. Senza coordinamento, il browser cachea JS vecchio e la pagina pubblica mostra CSS non allineato.

## Decisione

- Un contatore release piattaforma: `?v=NN` su tutti i file HTML/JS in `pages/`
- `WORKER_VERSION` in `worker/worker.js` allineato quando cambia il renderer
- Incrementare **insieme** ad ogni release
- Annotare in `CHANGELOG.md` e `PROJECT_STATE.md`

## Conseguenze

- Release prevedibile e tracciabile
- Deploy Worker prima se cambia renderer NFC
- Prossima release: v107
