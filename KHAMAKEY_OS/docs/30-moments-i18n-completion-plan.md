# 30 — Moments i18n: piano di completamento (sicurezza-first)

> **Data:** 2026-07-23 · **Stato:** piano approvabile · **Nessun codice in questo file**  
> Obiettivo: chiudere il chrome IT|EN Moments **senza alterare il funzionamento** della webapp.  
> Baseline live: editor **v216** · Worker **v184** · audit canvas `moments-i18n-audit-2026-07-23`.  
> Estende: [`29-moments-i18n-fields-plan.md`](29-moments-i18n-fields-plan.md) · regole [`27`](27-moments-i18n-rules.md) · ADR [`007`](../decisions/007-moments-editor-i18n.md).

---

## 1. Obiettivo (definizione chiusa)

**Done =** con toggle EN, un utente inglese vede **solo chrome UI in inglese** su:

1. Editor Moments (auth, shell, nav, pannelli, kit sezioni ancora IT)
2. Messaggi sistema RSVP (invite + WA) — già fatto v214/v184
3. Pagina pubblica `/m/` frasi fisse Worker — quasi fatto; pochi fallback

**Non-done (esplicitamente fuori):**

| Fuori | Perché |
|-------|--------|
| Testi scritti dal cliente | Prodotto: i ricordi restano com’è |
| Seed / “Prepara tutto per me” | Contenuto pagina, non chrome; piano separato |
| Privacy/Terms lunghi EN | Legale; progetto a parte |
| Admin / Officina / Business | Altri prodotti |
| Auto-traduzione contenuti `/m/` | ADR-007 |

---

## 2. Regola zero — non alterare la webapp

Ogni slice deve rispettare **tutti** questi vincoli. Se uno viene violato → **stop e chiedere**.

### 2.1 Cosa è vietato toccare

- Handler upload / replace / delete / DnD media
- `normalizeWhatsAppDigits`, costruzione URL `wa.me`, submit RSVP API
- `saveMoment`, RPC attivazione, PIN hash, NFC slug
- Schema SQL, RLS, Worker route oltre stringhe `MOMENTS_PUBLIC_I18N` / `mt()` / `mtFill()`
- Logica `publicState` / whitelist campi (salvo zero cambiamento comportamento)
- Business editor, Admin, Shopify

### 2.2 Cosa è permesso

- Aggiungere chiavi in `FIELD_PHRASE_EN` / `MOMENTS_PUBLIC_I18N`
- Wrappare label/hint/bottoni con `lf()` / `lfSpan()` / `t()` + **`data-lf`** (o `data-i18n`)
- Refresh al toggle in `syncLangSwitchers` **solo** chiamate di re-render testo già esistenti (come `renderListItems`, `refreshRsvpShareLocale`)
- Bump `?v=` Pages; bump `WORKER_VERSION` **solo** se si tocca Worker

### 2.3 Pattern obbligatorio (anti sticky-EN)

1. Sorgente sempre **frase IT** in `data-lf` / dizionario  
2. EN solo nella mappa (`FIELD_PHRASE_EN` o `MOMENTS_PUBLIC_I18N.en`)  
3. Al toggle: `syncFieldChromeI18n` o re-render del pannello che **riscrive** da IT source  
4. **Mai** scrivere il testo EN dentro `data-lf`  
5. Se una stringa è dinamica con numeri → template IT con `{n}` + `lfFill` (come 11e6e)

### 2.4 Gate di uscita per ogni slice (obbligatorio)

Prima di considerare la slice chiusa:

| # | Check | Come |
|---|--------|------|
| G1 | IT default invariato | Apri editor senza mai cliccare EN; flusso Salva / anteprima ok |
| G2 | EN sul pannello toccato | Toggle EN; solo quel pannello in EN; resto non peggiorato |
| G3 | EN → IT torna | Toggle di nuovo IT; **nessuna** etichetta resta in EN sul pannello |
| G4 | Funzione intatta | Azione critica del pannello (vedi tabella slice) ancora ok |
| G5 | Nessun TDZ / boot | Login e apertura editor senza schermo infinito |
| G6 | Diff minimo | `git diff` solo file della slice + dizionario + docs; zero refactor |

Se G3 o G4 falliscono → **revert della slice**, non “aggiustare in fretta” la logica.

---

## 3. Principio di esecuzione

```text
Una slice = un commit = un bump ?v= = un deploy Pages
            (+ Worker solo se file worker.js toccato)
Smoke G1–G5 → poi slice successiva
Mai due kit nello stesso commit
In dubbio → lascia IT e annota nel piano
```

Ordine: **rischio prodotto × frequenza uso** (Amazon UK), non “file più corto”.

---

## 4. Roadmap slice (mirata)

### Fase A — Chiudere chrome RSVP editor (P0)

| ID | Scope | File | Vietato | Smoke funzione (G4) | Rischio |
|----|--------|------|---------|---------------------|---------|
| **A1** | Solo etichette/hint/toggle campi RSVP opzionali + custom rows | `moment-rsvp-fields.js` + `FIELD_PHRASE_EN` | `readRsvpFieldsFromForm`, normalize, salvataggio field_keys | Attiva/disattiva “Ospiti”, aggiungi voce custom, Salva, ricarica: campi invariati | Medio |
| **A2** | Solo chrome pannello share (titoli, bottoni, warn bozza, riepilogo) | `moment-rsvp-kit.js` | `rsvpInviteMessage` body (già EN), `wa.me`, copy/share handlers | Copia link / Copia messaggio / Condividi ancora funzionano; testo invito IT\|EN ok | Medio |
| **A2b** | Refresh share chrome al toggle | `moment-rsvp-kit.js` + 1 riga in `syncLangSwitchers` | Non rifare bind listener; solo `textContent` / re-render HTML statico del pannello | EN→IT: labels share tornano IT | Medio |

**Stop dopo A2b:** smoke RSVP completo IT e EN (WhatsApp numero, Salva, anteprima messaggio).

Versioni previste: **v217** (A1) → **v218** (A2+A2b) — o A2/A2b insieme se lo scope resta solo stringhe.

---

### Fase B — Kit secondari editor (P1)

| ID | Scope | File | Vietato | Smoke G4 | Rischio |
|----|--------|------|---------|----------|---------|
| **B1** | Oroscopo: label segni, “Aggiungi persona”, empty, placeholder nome | `moment-horoscope.js` + map EN | Fetch Astroway, salvataggio people[], Worker readings | Aggiungi/rimuovi persona, Salva, anteprima | Medio |
| **B2** | Dashboard overview card copy | `moment-editor-dashboard.js` | Calcolo progress, link azioni | Click card → pannello giusto | Basso |
| **B3** | Wizard onboarding (“5 minuti”, step, CTA) | solo HTML/stringhe in `moments.js` wizard | `localStorage` onboarding done, navigazione step | Completa/skip wizard come oggi | Basso |
| **B4** | Card piano / limiti in overview (se ancora IT raw) | stringhe UI; riusare `t()` se già esistono in auth | RPC entitlements, upgrade | Limiti numerici corretti | Basso |

Una release ciascuna. Dopo B1: smoke EN→IT obbligatorio (segni spesso sticky).

---

### Fase C — Public `/m/` residui (P1, Worker)

| ID | Scope | File | Vietato | Smoke G4 | Rischio |
|----|--------|------|---------|----------|---------|
| **C1** | Solo `"Apri PDF"` / `"Apri foto"` / aria lightbox residuali → `MOMENTS_PUBLIC_I18N` | `worker/worker.js` stringhe + `mt()` | Upload, PIN, RSVP submit, rate limit | `/m/?lang=en` e `?lang=it`: media si apre | Basso |
| **C2** | Toast guestbook client → `momentI18n` (solo se prodotto riattivato) | script guestbook in Worker | API guestbook, enable flag | Skip se `MOMENT_GUESTBOOK_PUBLIC_ENABLED === false` | Basso |

**Deploy:** Worker prima, poi smoke `/m/`. Bump `WORKER_VERSION` (es. v185).  
**Lock:** prendere lock `worker.js` in `CODEX-COLLAB.md`.

---

### Fase D — Lucido / opzionale (P2, dopo A–C)

| ID | Scope | Note |
|----|--------|------|
| **D1** | `TYPE_LABELS` / nomi tipo evento in menu meta | Solo dove è chrome UI, non seed |
| **D2** | Guestbook moderation editor EN | Solo se prodotto torna on |
| **D3** | Smoke doc 28 aggiornato (C7 RSVP + toggle + account locale) | Solo docs |
| **D4** | Seed template EN + legale EN | **Progetti separati**, non in questo piano |

---

## 5. Checklist pre-slice (agente)

Prima di scrivere codice:

1. [ ] `git pull` + lock Moments (e Worker se C*)  
2. [ ] Elencare **esatte** stringhe IT da mappare (max ~25 per slice)  
3. [ ] Confermare che nessun handler nella diff  
4. [ ] Piano di rollback: `git revert` del commit slice  

Durante:

5. [ ] Solo `lf` / `data-lf` / dizionario  
6. [ ] Aggiungere refresh toggle se il pannello **non** usa già `data-lf`  

Dopo:

7. [ ] Gate G1–G6  
8. [ ] Aggiornare questo file (checkbox stato) + `PROJECT_STATE` + `CHANGELOG` + `ROADMAP`  
9. [ ] Commit + push + deploy Pages (+ Worker se C*)  

---

## 6. Stato avanzamento

| Slice | Stato | Versione |
|-------|--------|----------|
| Baseline (1–11e6e, WA, fix toggle, account locale) | Fatto | v216 / W v184 |
| **A1** RSVP fields chrome | Pending | — |
| **A2** RSVP share chrome + refresh | Pending | — |
| **B1** Oroscopo people | Pending | — |
| **B2** Dashboard | Pending | — |
| **B3** Wizard onboarding | Pending | — |
| **B4** Card piano | Pending | — |
| **C1** Worker Apri PDF/foto | Pending | — |
| **C2** Guestbook toasts | Skip se guestbook off | — |
| **D*** | Dopo A–C | — |

---

## 7. Criterio di successo finale (Fase A+B+C)

- [ ] Toggle EN: RSVP fields + share + oroscopo + dashboard + wizard in EN  
- [ ] Toggle IT: tutto torna IT (nessuno sticky)  
- [ ] RSVP: numero, Salva, WA message, share/copy invariati funzionalmente  
- [ ] Media upload/replace/delete invariati  
- [ ] `/m/?lang=en` e default IT ok  
- [ ] Login su secondo device ripristina `ui_locale` (già v216)  
- [ ] Nessun cambio SQL / attivazione / Business  

---

## 8. Messaggio per la prossima chat agente

```text
Leggi KHAMAKEY_OS/00-START-HERE.md e docs/30-moments-i18n-completion-plan.md.
Esegui SOLO la slice A1 (moment-rsvp-fields.js chrome).
Vincoli: solo stringhe + data-lf + FIELD_PHRASE_EN; non toccare read/save/normalize RSVP.
Gate G1–G6 obbligatori. Una release Pages. Poi stop.
```

---

## 9. Decisione richiesta all’utente

Confermare di partire da **A1** (RSVP fields chrome) con le regole sopra.  
Non iniziare B/C finché A non ha passato G1–G6.
