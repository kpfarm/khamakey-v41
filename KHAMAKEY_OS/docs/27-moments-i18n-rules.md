# 27 — Moments i18n: regole (Step 2)

> **Data:** 2026-07-23 · **Stato:** regole accettate · **Step 3 infra live (Moments v187)**  
> Decisione formale: [`decisions/007-moments-editor-i18n.md`](../decisions/007-moments-editor-i18n.md)  
> Inventario: [`26-moments-i18n-inventory.md`](26-moments-i18n-inventory.md)  
> Modulo: `pages/moments-i18n.js` (`t`, `getUiLocale` / `setUiLocale`, `applyChromeI18n`)

## In una frase

Default italiano; inglese solo se l’utente clicca EN; si salva nel browser; i testi della pagina non si traducono da soli.

## Checklist vincolante

| # | Regola |
|---|--------|
| 1 | Lingue v1: solo `it` e `en` |
| 2 | Senza preferenza salvata → **sempre IT** |
| 3 | Preferenza in `localStorage` → chiave `khamakey.moments.uiLocale` (`it` \| `en`) |
| 4 | Solo scelta **esplicita** (toggle IT/EN) — niente auto-detect aggressivo |
| 5 | Niente sync cloud della lingua UI in v1 |
| 6 | Chiave EN mancante → fallback testo IT |
| 7 | Si traduce il **chrome** editor; non i contenuti scritti dal cliente |
| 8 | Template seed / legale EN = fuori da Step 3–8 |
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
```

## Cosa vede il visitatore della pagina `/m/`

- Titolo, storia, foto: **lingua del cliente** (quello che ha scritto).
- Frasi fisse (PIN, privacy, bottoni RSVP di sistema): Step 9 — indipendenti dal toggle editor.

## Step 3 (fatto)

- File `pages/moments-i18n.js` + import in `moments.js` (solo `applyDocumentLang` al boot).
- Dizionario seed minimo (`boot.*`, `common.*`, `lang.*`) — UI ancora tutta in italiano in HTML/JS.
- Nessun toggle lingua (Step 4). Nessuna sostituzione massiva di stringhe (Step 5–7).

## Prossimo passo

**Step 4** — selettore IT/EN visibile (auth + editor) che chiama `setUiLocale`.
