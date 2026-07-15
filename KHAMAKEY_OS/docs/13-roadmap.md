# 13 — Roadmap

> Mirror operativo di [`../../ROADMAP.md`](../../ROADMAP.md).  
> Aggiornare **entrambi** a fine sessione finché la migrazione non è completa.

---

## Fase 1 — Fondamenta ✅

- [x] Progetto consolidato pages + worker + sql
- [x] URL centralizzati in `config.js`
- [x] Documentazione collaborazione Cursor/Codex
- [x] KhamaKey OS — sistema operativo del progetto

## Fase 2 — Editor business

- [ ] Wizard onboarding nuova attività (più settori)
- [ ] Più automazioni prenotazione
- [ ] Sincronizzazione ordine blocchi editor ↔ Supabase
- [ ] UX catalogo (varianti, allergeni)
- [ ] Anteprima tablet/desktop più fedele

## Fase 2b — Editor Moments ✅

- [x] Sidebar sezioni, card, anteprima sticky
- [x] Wizard post-attivazione, upload R2
- [x] Temi visivi base
- [x] Template 21 categorie (v89–v90)

## Fase 2c — Creator emotivo ✅

- [x] Upload R2, galleria swipe, scroll reveal
- [x] RSVP configurabile, lettera speciale
- [x] Tabella risposte RSVP (backend v70 + editor v107)
- [x] Libro degli ospiti con moderazione (v108)

## Sprint C — Wizard Business ✅

- [x] 5 template settore, chiave per attività
- [ ] Smoke test 5 settori

## Sprint D/E — Admin + Shopify ✅

- [x] Magazzino NFC, stock-first, canali vendita
- [x] Catalogo vendita + sync Shopify
- [x] Admin ricerca/filtri, dashboard alert
- [x] Rete rivenditori v68
- [x] CRM v84 e gestione provvigioni v85/v125

## Sprint F — Pagamenti (in corso)

- [x] Email ordine codici NFC
- [x] Stripe webhook predisposto
- [ ] Stripe secrets in produzione
- [ ] Template email multilingua

## Sprint G — i18n

- [ ] Traduzioni catalogo per SKU
- [ ] Selettore lingua pagina Moments

---

## Log sessioni

| Data | Autore | Note |
|------|--------|------|
| 2026-07-06 | Cursor | Creato v41 consolidato |
| 2026-07-06 | Cursor | Moments login/editor v43 |
| 2026-07-08 | Cursor | Template tutte categorie v89–v90 |
| 2026-07-09 | Cursor | v104 admin guide + filtri |
| 2026-07-09 | Cursor | v68 rete rivenditori in produzione |
| 2026-07-09 | Cursor | CODEX-COLLAB.md + regole multi-agente |
| 2026-07-09 | Cursor | v106 admin UX menu intenti |
| 2026-07-09 | Cursor | v103 Stripe + email ordini |
| 2026-07-10 | Cursor | **v108**: libro degli ospiti Moments con moderazione |
| 2026-07-09 | Cursor | **v107**: RSVP backend + pannello risposte editor |
| 2026-07-12 | Antigravity | **v118**: restyling premium CSS Moments adattivo + linee guida grafiche |
| 2026-07-13 | Antigravity | **Visual & Sales Copy**: generati asset grafici per Moments ("Love" keyring) e Business, creato catalogo copy e doc di vendita docs/16-sales-copy-love.md |
| 2026-07-12 | Claude/Codex | **v84-v85/v125**: CRM admin, trigger provvigioni ordini, gestione approva/paga in Admin |
| 2026-07-13 | Codex | **v88**: claim sicuro primo accesso rivenditori, senza fallback email insicuro |
| 2026-07-13 | Codex | **Moments v112 / Worker v126**: etichetta personalizzabile del contatore («Insieme da» → testo utente) |
| 2026-07-13 | Codex | **Admin v126**: magazzino NFC Moments con generazione da SKU, link `/k/` e `/m/` separati, data e tracciabilita' |
| 2026-07-13 | Codex | **Creative Engine**: normalizzato output Antigravity in `assets/marketing/`, creato manifest asset e protocollo condiviso |
| 2026-07-13 | Codex | **Admin v127**: Magazzino NFC Moments con creazione SKU in sezione, generazione stock aperta e filtri per SKU/data |
| 2026-07-13 | Codex | **Collaborazione agenti**: rafforzato bootstrap/passaggio consegne e creato prompt per nuovi agenti |
| 2026-07-14 | Codex | **Audit Admin**: creato `docs/18-admin-audit.md` con stato funzioni, gap e piano miglioramento |
| 2026-07-14 | Codex | **Admin v128 / Business v118 / Moments v114 / SQL v89**: console supporto operativa e ticket assistenza apribili da editor account |
| 2026-07-14 | Codex | **Piano Admin Console Operativa**: creato `docs/19-admin-console-operativa.md`, roadmap a blocchi 1-2 sezioni per volta |
| 2026-07-14 | Codex | **Business Editor v120**: ripristinati Salva sempre visibile, Account/Anteprima robusti, link pagina finale/QR fallback e stato multilingua chiaro |
| 2026-07-15 | Codex | **Business Editor v121**: rimossi doppioni Anteprima, controllo multilingua trasformato in switch nella card e pagina finale `/p/` creata via upsert |
| 2026-07-15 | Codex | **Business Editor v122**: rinominato il comando visibile in Multilingua e reso lo switch piu' chiaro |
| 2026-07-15 | Codex | **Business Editor v123**: corretto handshake editor/app dopo reload per caricare stato cloud e link pagina finale |
| 2026-07-15 | Codex | **Admin v133**: trasformata Spedizioni NFC in console operativa con pipeline ordini/codici e azioni evasione |
| 2026-07-15 | Claude Code | **Business Editor v124**: audit upload + fix — video su R2 (prima blob perso al reload), limite 25 MB allineato al server, pulizia file orfani R2 su sostituzione/rimozione media. Pendenti PDF/documenti base64 (lock worker.js) |
| 2026-07-15 | Cursor Cloud | **Business Editor v158 hotfix**: `?.disabled =` illegale in `editor.html` live bloccava lo script → Caricamento dati infinito. Sync repo←prod + fix; **deploy Pages ancora da fare** |

---

*Aggiungi una riga qui a ogni sessione significativa.*
