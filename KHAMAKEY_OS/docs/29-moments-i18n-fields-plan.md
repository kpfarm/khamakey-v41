# 29 — Moments i18n: campi form editor (dopo Step 9)

> **Data:** 2026-07-23 · **Approccio:** slice piccole, una per release · default IT sempre  
> Non toccare: attivazione codici, RPC, Worker `/m/` (già v183), salvataggio core.

## Perché ancora tanto IT

Steps 1–9 = auth, shell, nav, etichette/sottotitoli sezioni, toast, chrome `/m/`.  
**Campi e hint dentro i pannelli** erano volutamente fuori. Ora si fanno a pezzi.

## Slice

| Slice | Scope | File tipici | Rischio |
|-------|--------|-------------|---------|
| **11a** | Solo pannello **Copertina** | `moments.js` `renderCoverPanel` + `moments-i18n-fields.js` | Basso |
| **11b** | **Pubblica** (privacy / PIN / anniversario) | `renderPrivacyPanel` | Basso |
| **11c** | **Colori** + **Contatore** + **Ordine** | `renderDesignPanel`, `renderCounterPanel`, `renderOrderPanel` | Basso |
| **11d** | Campi comuni sezioni (Titolo sezione, Visibile, guide base) | `sectionEditor` / kit | Medio |
| **11e** | RSVP / journey / gallery / media UI | `moments-*-ui.js`, rsvp kits | Medio |
| Dopo | Temi/piani/zodiaco taxonomy · template seed · legale EN | — | Separato |

## Regole per ogni slice

1. Solo stringhe **chrome** (label, hint, bottone UI) — mai contenuti cliente / seed pagina.
2. Frasi IT → mappa EN (come 7b/7c) + `data-lf` per refresh al toggle lingua.
3. Un bump `?v=` + deploy Pages per slice.
4. Smoke: IT default ok · EN sul pannello toccato · Salva ancora ok · nessuna TDZ boot.
5. Se qualcosa è dubbio → lasciare IT e annotare, non indovinare.

## Stato

- [x] Piano documentato
- [x] **11a** Copertina (v199)
- [x] **11b** Pubblica (v200)
- [x] **11c** Colori / Contatore / Ordine (v201) — nomi look/hint taxonomy ancora IT
- [x] **11d** Campi comuni sezioni (v202) — toggle Visibile, Titolo sezione, guide fill, body chrome; kit dedicati → 11e
- [x] **Look taxonomy** (v203) — label/hint `PAGE_LOOKS` + nomi palette EN
- [ ] **11e** Kit sezioni avanzati — **a pezzi** (vedi sotto)
  - [x] **11e1** (v204) — dedica / lettera futuro / citazione / firma / pet
  - [ ] 11e2 Countdown + Musica
  - [ ] 11e3 RSVP WhatsApp chrome
  - [ ] 11e4 List UI
  - [ ] 11e5 Journey UI
  - [ ] 11e6 Gallery / video / media UI

## 11e — sotto-slice (una release ciascuna)

| Slice | Scope | Rischio |
|-------|--------|---------|
| **11e1** | Campi semplici testo: dedica, lettera futuro, citazione, firma, pet | Basso |
| **11e2** | Countdown + Musica (label/hint in `sectionEditor`) | Basso |
| **11e3** | RSVP WhatsApp chrome (warn + numero) — **non** invite copy seed | Medio |
| **11e4** | List UI (`moments-list-ui.js`) | Medio |
| **11e5** | Journey UI (`moments-journey-ui.js`) | Medio |
| **11e6** | Gallery / video / media UI | Medio |
| Dopo | `moment-rsvp-fields.js`, oroscopo people panel, share kit | Separato |

Regola: una sotto-slice = un bump `?v=` + deploy. Se qualcosa è dubbio → lasciare IT.
