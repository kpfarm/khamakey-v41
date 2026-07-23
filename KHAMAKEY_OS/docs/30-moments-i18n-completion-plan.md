# 30 — Moments i18n: piano di completamento (sicurezza-first)

> **Data:** 2026-07-23 · **Stato:** piano approvabile · **riduzione rischi attiva** · **Nessun codice in questo file**  
> Obiettivo: chiudere il chrome IT|EN Moments **senza alterare il funzionamento** della webapp.  
> Baseline live: editor **v216** · Worker **v184** · audit canvas `moments-i18n-audit-2026-07-23`.  
> Estende: [`29-moments-i18n-fields-plan.md`](29-moments-i18n-fields-plan.md) · regole [`27`](27-moments-i18n-rules.md) · ADR [`007`](../decisions/007-moments-editor-i18n.md).  
> **Priorità:** ridurre rischio > velocità. Meglio lasciare IT che rischiare un handler.

---

## 0. Catena sacro-santa (mai rompere)

Tutta la webapp Moments esiste per questa catena. **Nessuna slice i18n può indebolirla.**

```text
Oggetto fisico + chip NFC
  → codice attivazione / slug
  → account cliente
  → editor pagine (Salva, media, sezioni, RSVP, PIN)
  → pagina pubblica /m/<slug>  (+ /k/<codice> NFC)
  → ospite apre, legge, conferma RSVP su WhatsApp
```

| Anello | Cosa proteggere | i18n può toccare? |
|--------|-----------------|-------------------|
| Attivazione pezzo / magazzino | RPC, codici, reset reso | **No** |
| Auth + sessione | Login, recovery | Solo label `data-i18n` già coperte |
| Editor Salva / bozza / pubblica | `saveMoment`, visibility, PIN | **No** logica |
| Media R2 | upload/replace/delete | **Solo** stringhe status (già fatto); **no** handler |
| RSVP | numero WA, `wa.me`, submit API | **Solo** label chrome; **no** numeri/URL/API |
| Pagina pubblica `/m/` `/k/` | Worker render, PIN gate, rate limit | Fase C: **solo** dizionario; freeze finché A+B ok |
| NFC redirect `/k/` | slug binding | **No** |

Se un cambiamento i18n mette a rischio anche un solo anello → **non fare**. Lasciare IT.

Smoke minimo **sempre** (anche slice “solo label”), oltre G1–G5:

| # | Catena | Check rapido |
|---|--------|----------------|
| N1 | Editor apre pezzo già attivato | Lista oggetti + apri pagina |
| N2 | Salva | Salva senza errore; reload mantiene dati |
| N3 | Link pubblico | Apri `/m/` (o anteprima) della pagina |
| N4 | Se slice RSVP | Numero WA ancora salvato; sezione non sparisce |

Fallisce N1–N4 → **revert immediato** + redeploy versione precedente. Non “cerchiamo di sistemare”.

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

## 2.5 Riduzione rischi (obbligatoria)

Misure extra oltre §2. Se in conflitto con la velocità, **vincono queste**.

### R1 — Allowlist file per slice

Nella slice è permesso modificare **solo**:

| Tipo | File ammessi |
|------|----------------|
| Codice UI della slice | 1 file kit max (es. solo `moment-rsvp-fields.js`) |
| Dizionario | solo `moments-i18n-fields.js` (o solo Worker i18n in fase C) |
| Cache bust | `moments.html` + import `?v=` nei file che già importano quel modulo |
| Docs | `docs/30`, `PROJECT_STATE`, `CHANGELOG`, `ROADMAP`, `CODEX-COLLAB` |

**Tutto il resto = fuori diff.** Se serve un secondo file JS di logica → fermarsi.

### R2 — Freeze Worker fino a fine Fase A+B (protezione `/m/` `/k/`)

- **Nessun** deploy Worker nelle fasi A e B.  
- Fase C solo dopo smoke A+B **e** ok utente esplicito **e** lock `worker.js`.  
- Fase C = **solo** chiavi in `MOMENTS_PUBLIC_I18N` + `mt()` su stringhe già presenti; zero cambi al renderer strutturale, PIN, RSVP submit, rate limit.  
- Dopo ogni deploy Worker: smoke N3 su una pagina Moments reale (`/m/?lang=it` e `?lang=en`) + tap NFC o `/k/` se disponibile.  
- Motivo: un Worker rotto spezza la catena oggetto→pagina per tutti i clienti.

### R3 — Diff guard (prima del commit)

Eseguire e allegare mentalmente:

```bash
git diff --stat
git diff -U0 -- pages/moment-rsvp-fields.js   # esempio: solo ± stringhe / data-lf
```

Bloccare il commit se compare una di queste in un file “logica”:

- `function ` nuova o firma cambiata  
- `addEventListener` / `fetch(` / `rpc(` / `wa.me` / `upload`  
- `normalizeWhatsApp` / `readRsvp` / `writeGallery` / `saveMoment`  
- cambi a condizioni `if (` che non siano solo testo UI  

Eccezione unica: 1 chiamata `refreshXLocale(form)` in `syncLangSwitchers` (come già per RSVP share), senza toccare bind.

### R4 — Slice ancora più piccole (RSVP)

| ID | Scope ristretto | Note rischio |
|----|-----------------|--------------|
| **A1a** | Solo label/hint dei 4 toggle standard (`guests/notes/phone/email`) | Zero custom rows |
| **A1b** | Solo UI “voce personalizzata” (label/placeholder/Rimuovi/Aggiungi) | Dopo smoke A1a |
| **A2a** | Solo titoli/bottoni/warn del share panel (`data-lf`) | Non toccare `syncLangSwitchers` |
| **A2b** | Solo refresh toggle share (1 hook) | Slice separata, dopo A2a stabile |

Mai A1a+A1b nello stesso commit.

### R5 — Pausa e conferma umana

Dopo **ogni** deploy Pages:

1. Smoke G1–G4 sul pezzo toccato  
2. **Stop** — non partire la slice successiva nella stessa sessione senza ok utente  
3. Se dubbio su G4 → lasciare live la versione precedente (`git revert` + redeploy)

### R6 — IT sempre first

Ordine smoke fisso: **G1 (IT) → G4 funzione → G2 EN → G3 EN→IT → G5 boot**.  
Se G1 o G4 falliscono, **non** testare EN: revert subito.

### R7 — Niente “mentre ci sono”

Vietato nella stessa slice: refactor CSS, rinomina variabili, “sistemo anche quello”, toccare oroscopo durante RSVP, aggiornare seed.

### R8 — Skip aggressivo

| Area | Decisione riduzione rischio |
|------|----------------------------|
| Guestbook toasts Worker (C2) | **Saltare** finché guestbook pubblico resta off |
| Seed / legale (D4) | **Fuori piano** |
| TYPE_LABELS (D1) | Solo dopo A+B stabili; altrimenti lasciare IT |

### R9 — Un solo agente / un lock

- Lock Moments per tutta la Fase A.  
- Nessun parallelismo su `moments.js` / `moment-rsvp-*.js`.  
- Worker lock solo in Fase C.

---

## 3. Principio di esecuzione

```text
Una micro-slice = un commit = un bump ?v= = un deploy Pages
Smoke G1→G4→G2→G3→G5 → ok utente → slice successiva
Worker congelato fino a fine A+B
Allowlist file + diff guard
In dubbio → lascia IT e annota
```

Ordine: **sicurezza > completezza EN > velocità**.

---

## 4. Roadmap slice (mirata, rischio ridotto)

### Fase A — Chiudere chrome RSVP editor (P0)

| ID | Scope | File | Vietato | Smoke funzione (G4) | Rischio |
|----|--------|------|---------|---------------------|---------|
| **A1a** | Solo 4 toggle standard RSVP (label/hint) | `moment-rsvp-fields.js` + `FIELD_PHRASE_EN` | custom rows, read/normalize/save | Toggle Ospiti/Note on-off, Salva, reload | **Basso** |
| **A1b** | Solo custom fields UI chrome | stesso file | read/normalize/save | Aggiungi/rimuovi voce, Salva | Basso-medio |
| **A2a** | Solo chrome statico share (`data-lf` su titoli/bottoni/warn) | `moment-rsvp-kit.js` | handlers copy/share, invite body logic | Copia link / Copia messaggio | Basso-medio |
| **A2b** | Solo hook refresh share in `syncLangSwitchers` | `moments.js` (1 riga) + eventuale helper kit | re-bind listener, logica share | EN→IT labels share | Medio (isolato) |

**Stop dopo A2b:** smoke RSVP completo IT e EN (WhatsApp, Salva, messaggio).  
Versioni: **v217** A1a → **v218** A1b → **v219** A2a → **v220** A2b (una ciascuno).

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
| **A1a** RSVP 4 toggle label/hint | Pending | v217 |
| **A1b** RSVP custom fields chrome | Pending | v218 |
| **A2a** RSVP share chrome statico | Pending | v219 |
| **A2b** RSVP share refresh toggle | Pending | v220 |
| **B1–B4** | Pending dopo ok A | — |
| **C1** Worker (dopo freeze A+B) | Pending | — |
| **C2** Guestbook toasts | **Skip** (prodotto off) | — |
| **D*** | Opzionale / fuori | — |

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
Leggi KHAMAKEY_OS/00-START-HERE.md e docs/30-moments-i18n-completion-plan.md (§2.5 riduzione rischi).
Esegui SOLO la micro-slice A1a (4 toggle RSVP label/hint).
Allowlist: moment-rsvp-fields.js + moments-i18n-fields.js + cache bust + docs.
Vietato: custom rows, read/save/normalize, worker.js.
Diff guard + smoke G1→G4→G2→G3→G5. Deploy Pages. POI STOP — aspetta ok utente.
```

---

## 9. Decisione richiesta all’utente

Confermare di partire da **A1a** (solo 4 toggle) con freeze Worker e pausa tra slice.  
Non iniziare A1b/B/C senza ok esplicito dopo smoke A1a.
