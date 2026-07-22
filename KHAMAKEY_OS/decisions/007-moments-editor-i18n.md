# ADR-007: Moments editor i18n (IT / EN)

**Data:** 2026-07-23  
**Stato:** Accettata · infra Step 3 in `pages/moments-i18n.js` (Moments v187); toggle UI = Step 4  
**Inventario:** [`docs/26-moments-i18n-inventory.md`](../docs/26-moments-i18n-inventory.md)

## Contesto

Vogliamo vendere su Amazon (anche UK/US) con UI editor in inglese, senza rischiare il prodotto già live in italiano e senza tradurre i contenuti scritti dai clienti.

Esiste già i18n **Business** basato su snapshot + `Accept-Language` nel Worker. Quello **non** si riusa per Moments editor chrome.

## Decisione

### Lingue

- Solo **`it`** e **`en`** in questa fase.
- **Default sempre `it`** se non c’è una scelta esplicita salvata.
- Chiave mancante nel dizionario EN → mostra testo **IT** (mai stringa vuota / chiave grezza).

### Cosa si traduce

| Si | No |
|----|-----|
| Chrome editor (menu, bottoni, label, errori, wizard) | Testi scritti dal cliente nella pagina |
| Nomi categoria / tema / piano / segno (taxonomy UI) | Seed/template “Prepara tutto per me” (passo opzionale dopo) |
| (Fase 9) Frasi fisse Worker su `/m/` (PIN, privacy notice, RSVP chrome) | Admin / Business |
| | Privacy/Termini legali (progetto separato) |

### Scelta lingua editor (cliente)

1. Controllo esplicito **IT | EN** (toggle o select) visibile in auth e in editor.
2. Persistenza **solo browser**: `localStorage` chiave fissa  
   `khamakey.moments.uiLocale`  
   valori ammessi: `"it"` | `"en"`.
3. **Nessun** sync su Supabase / profilo account in v1.
4. **Nessun** auto-detect aggressivo:
   - non forzare EN da `Accept-Language` del browser
   - non cambiare lingua al login in base al paese Amazon
   - non leggere la lingua dal contenuto della pagina
5. Opzionale soft (solo se implementato in Step 4 e documentato): al **primo** visit senza chiave in `localStorage`, si può *proporre* EN se `Accept-Language` inizia con `en` — ma **non** scrivere la scelta finché l’utente non conferma o non clicca EN. Preferenza Step 2: **non proporre**; partire sempre IT finché non clicca. Più sicuro per utenti IT esistenti.

**Scelta Step 2 (vincolante):** primo carico senza preferenza → **sempre IT**. Solo click esplicito passa a EN e salva in `localStorage`.

### Documento HTML

- Aggiornare `document.documentElement.lang` a `it` o `en` quando cambia la UI locale.
- Non cambiare `lang` in base ai contenuti della pagina Moment.

### Anteprima editor

- L’anteprima mostra i **contenuti** come salvati (lingua del cliente).
- Le uniche stringhe EN nell’anteprima, se presenti, sono chrome Worker (fase 9) — non i campi titolo/storia.

### Pagina pubblica `/m/` (fase 9 — regole distinte)

- **Contenuti cliente:** invariati (quello che ha scritto).
- **Chrome fissa Worker** (PIN, notice, label RSVP fisse):
  - default `it`
  - può usare `Accept-Language` del **visitatore** *oppure* `?lang=en` per forzare — decisione implementativa in Step 9
  - **non** dipende da `khamakey.moments.uiLocale` del proprietario (quel flag è solo editor sul suo browser)
- Non attivare il sistema snapshot Business (`state.i18n`) su Moments.

### Implementazione (vincoli tecnici, da Step 3+)

- Modulo dedicato tipo `pages/moments-i18n.js` + dizionari; niente stringhe EN sparse “a mano” nei flussi critici.
- Funzione `t(key)` / `t(key, vars)`; IT come source of truth nel dizionario.
- Un passo = un commit piccolo; default IT sempre verificato con smoke.
- Non toccare: attivazione RPC, NFC slug, magazzino, reset reso, `publicState` Moments oltre al necessario in fase 9.

## Conseguenze

- Clienti IT attuali: zero sorprese (restano in italiano).
- Clienti Amazon UK: scelgono EN una volta; riparte EN su quel browser.
- Cambio PC/browser: tornano in IT finché non riselezionano EN (accettabile in v1).
- Nessuna barriera vendite Amazon.it; EN pronto per listing UK/US senza tradurre i ricordi dei clienti.
