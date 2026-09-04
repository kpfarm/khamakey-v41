# 27 — Moments i18n: regole (Step 2)

> **Data:** 2026-07-23 · **Stato:** regole ok · **Step 9 Worker `/m/` (v183)** · editor v251 · translate=no · lingua in signup
> Decisione formale: [`decisions/007-moments-editor-i18n.md`](../decisions/007-moments-editor-i18n.md)  
> Inventario: [`26-moments-i18n-inventory.md`](26-moments-i18n-inventory.md) · Smoke: [`28-moments-i18n-smoke.md`](28-moments-i18n-smoke.md)  
> Moduli: `moments-i18n.js` · `moments-i18n-auth.js` · `moments-i18n-shell.js` · `moments-i18n-sections.js` · Worker `MOMENTS_PUBLIC_I18N`

## In una frase

Default italiano; inglese solo se l’utente clicca EN; si salva nel browser; i testi della pagina non si traducono da soli.

## Checklist vincolante

| # | Regola |
|---|--------|
| 1 | Lingue v1: solo `it` e `en` |
| 2 | Senza preferenza salvata → **sempre IT** |
| 3 | Preferenza in `localStorage` → chiave `khamakey.moments.uiLocale` (`it` \| `en`) |
| 3b | Se loggato: sync anche su Auth `user_metadata.ui_locale` (segue l’account su altri device) |
| 3c | **Signup (v251):** campo «Lingua del software» (it\|en, default it) → `signUp` scrive `user_metadata.ui_locale` prima della conferma email |
| 3d | **Email Auth (ops):** conferma/recovery IT o EN da `{{ .Data.ui_locale }}` nei template dashboard (`docs/32`). Default IT. Non è chrome editor né `/m/` |
| 4 | Solo scelta **esplicita** (toggle IT/EN o campo signup) — niente auto-detect aggressivo |
| 4b | **Bloccare traduzione Safari/Chrome** (`translate="no"` / `notranslate`) — altrimenti `IT`→`esso`, `Pubblica`→`Pubblicità`, `Anteprima`→`Aprile` |
| 5 | Cloud lingua UI = solo `user_metadata.ui_locale` (signup + sync login). Non è i18n Business (`state.i18n`) |
| 6 | Chiave EN mancante → fallback testo IT |
| 7 | Si traduce il **chrome** editor; non i contenuti scritti dal cliente |
| 8 | Template seed EN = ancora fuori. **Legale EN (v252 / Worker v218):** `moments-privacy-en.html` / `moments-terms-en.html`; IT originale invariato. In caso di conflitto vince l’italiano. **P.IVA / dati societari:** da inserire su tutte e 4 le pagine quando ci sarà partita IVA — non inventare. **Titoli/etichette in pagina** = testo cliente, non chrome |
| 9 | Worker `/m/` chrome = Step 9 (regole visitatore separate; non usare `uiLocale` del proprietario) |
| 10 | Non riusare i18n Business (`state.i18n` + snapshot OpenAI) |

## Flusso utente (editor)

```text
Apre moments.html
  → legge localStorage khamakey.moments.uiLocale
  → assente o invalido → it
  → applica dizionario + <html lang="…">

Clicca EN
  → salva "en" in localStorage
  → ridisegna etichette UI

Clicca IT
  → salva "it"
  → ridisegna etichette UI

Crea account (step 2)
  → campo Lingua (Italiano / English), default it
  → allineato al toggle IT/EN della card
  → signUp options.data.ui_locale
  → primo login: syncUiLocaleWithAccount applica i metadati
```

## Cosa vede il visitatore della pagina `/m/`

- Titolo, storia, foto: **lingua del cliente** (quello che ha scritto).
- Frasi fisse (PIN, privacy, bottoni RSVP di sistema): Step 9 — indipendenti dal toggle editor.

## Step 3–5 (fatti)

- Infra + toggle IT/EN + dizionario auth/account/attivazione (`moments-i18n-auth.js`).
- Login, signup, recupero password, hub account, menu, attivazione pezzo: EN quando selezioni EN.
- Shell editor / sezioni = ancora Step 6–7.

## Prossimo passo (i18n, ordine proposto)

**Non rifare le etichette campi.** Chrome form già coperto (slice 11a–11e / A–B, `moments-i18n-fields.js`). I **valori** (titolo sezione, etichetta copertina, testo contatore, etichetta firma, voci RSVP) sono contenuti cliente: restano com’è scritto, anche con UI EN. Non tradurli.

1. **Seed «Prepara tutto per me» EN** — contenuto, non chrome; solo se richiesto.
2. **Altri template Auth** (magic link, change email, invite) — basso: Moments usa soprattutto conferma + reset.
3. **P.IVA / dati societari** — non è i18n: aspettare partita IVA reale, poi le 4 pagine legale.
4. Opzionale lucido: `TYPE_LABELS` (nomi categoria in meta) — piano D1, non urgente.
