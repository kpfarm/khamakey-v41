# 26 — Moments i18n: inventario stringhe (Step 1)

> **Data:** 2026-07-23 · **Stato:** inventario completato · **Nessun cambio runtime**  
> Scope: chrome editor Moments IT→EN. Contenuti cliente e Admin = fuori.  
> **Step 2 (regole):** [`27-moments-i18n-rules.md`](27-moments-i18n-rules.md) · ADR [`007-moments-editor-i18n.md`](../decisions/007-moments-editor-i18n.md)

## Decisioni scope (da Step 0)

| Dentro | Fuori (ora) |
|--------|-------------|
| Login, attivazione, shell editor, etichette sezioni, errori/toast | Admin / Officina |
| Categorie, temi, piani, segni zodiacali (nomi prodotto) | Business editor |
| Worker `/m/` chrome (PIN, privacy notice, RSVP fisse) — **fase 9** | Traduzione automatica testi scritti dal cliente |
| | Privacy/Termini legali EN (dopo) |
| | Template kit / seed testi pagina (opzionale dopo chrome) |

**Regola:** il selettore EN cambia l’interfaccia. I testi che il cliente scrive restano com’è. La pagina `/m/` mostra i contenuti del cliente; le frasi fisse Worker si traducono in fase 9.

---

## 1. Mappa file

| File | Intensità |
|------|-----------|
| `pages/moments.html` | Alta (auth + shell statica) |
| `pages/moments.js` | Alta (flussi, account, save, errori) |
| `pages/moment-sections.js` | Alta (label sezioni, guide) |
| `pages/moment-editor-kit.js` | Alta (label per categoria) |
| `pages/moment-categories.js` | Alta (taxonomy + **anche** template content) |
| `pages/moment-themes.js` | Media (look / font / hero) |
| `pages/moment-plans.js` | Media |
| `pages/moments-list-ui.js` | Media |
| `pages/moments-journey-ui.js` | Media |
| `pages/moments-media-ui.js` | Media |
| `pages/moment-rsvp-fields.js` / `moment-rsvp-kit.js` / `moment-rsvp-responses.js` | Media |
| `pages/moment-guestbook-kit.js` | Media (sezione prodotto spesso off) |
| `pages/moment-editor-dashboard.js` | Media |
| `pages/moment-horoscope.js` | Media |
| `pages/moment-media.js` | Bassa |
| `pages/moment-codes.js` / `moment-list-items.js` / `moment-journey.js` | Trascurabile |
| `worker/worker.js` (`renderMoment*`) | Fase 9 |
| `moments-privacy.html` / `moments-terms.html` | Differito (legale) |

---

## 2. Auth / login / signup / attivazione

### Statiche (`moments.html`)
- Boot: `Apertura in corso…` · `Attendere qualche istante.`
- Intro: `Il tuo spazio privato collegato all’NFC.` + copy codice in confezione / non sul chip
- Step 1–3: `Inserisci il codice` · `Crea l’account` · `Personalizza la pagina` (+ sottotitoli)
- Tab: `Accedi` · `Crea account`
- Login: `Accesso Moments` · `Email` · `Password` · `Mostra/Nascondi password` · `Password dimenticata?` · `Privacy` · `Termini`
- Recovery: `Recupera password` · `Invia link di recupero` · `Torna all’accesso` · `Nuova password` · `Aggiorna password`
- Signup: `Nuovo account Moments` · `1. Codice` · `2. Account` · `Codice Moments (inserto confezione)` · `Continua` · `Indietro` · `Nome e cognome` · `Password account` · `Nome pagina` · `PIN pagina…` · consenso Termini/Privacy · `Crea account e attiva`
- Attivazione: `Codice NFC` · `Attiva oggetto` · empty `Attiva il tuo primo oggetto Moments`

### Runtime (`moments.js`) — pattern principali
- Verifica codice / non trovato / già attivato / non attivabile / formato 8–32
- PIN min 4 · email obbligatoria · recupero password · accesso/registrazione · collegamento oggetto
- Banner PIN: `PIN impostato` · `Copia PIN` · testo “non possiamo mostrarlo di nuovo…”

---

## 3. Shell editor / account

- Menu: `Account` · `Prodotti attivi` · `Piano` · `Gestisci account` · `Assistenza` · `Esci`
- Hub: `Il tuo account` · tab `Profilo` · `Prodotti` · `Piano` · `Assistenza` · `Torna all’editor`
- Topbar: `Editor pagina` · `Pubblicata` / `Bozza privata` · `PIN attivo` / `PIN disattivo`
- Azioni: `Salva` · `↩ Annulla` · `Hai modifiche non salvate` · `Copia link` · `Condividi` · `Pubblica pagina` / `Nascondi pagina` · `Apri pagina` · `Anteprima` / `Modifica`
- Progress: `Copertina` · `Colori` · `Contenuti` · `Pubblica`
- Nav groups: `Pagina` · `Design` · `Contenuti` · items `Riepilogo` · `Ordine` · `Altre sezioni` · …
- Piano teaser: `Moments Free` · limiti MB

---

## 4. Sezioni e campi (etichette chrome)

**Pannelli:** Riepilogo · Le tue pagine · Copertina · Colori · Contatore · Ordine · Pubblica (+ sottotitoli)

**Sezioni canoniche:** Introduzione · Dedica · Tappe & luoghi · RSVP invitati · Libro degli ospiti · Galleria foto · Video · Promesse · Luoghi del cuore · Sogni insieme · Countdown · Musica · Oroscopo · Lettera al futuro · Rituali · Animale · I nostri numeri · Citazione · Firma finale  
(+ short nav: Intro, Dedica, Tappe, RSVP, …)

**Pattern comuni:** `Visibile in pagina` / `Non visibile` · `Titolo sezione` · `Contenuto` · upload `Carica foto…` · journey/list/RSVP/guestbook/horoscope field labels · media modal `Titolo` / `Descrizione` / `Salva dettagli`

**Guide fill (~20):** es. `Scrivi chi siete e perché…` · avvisi WhatsApp RSVP

---

## 5. Taxonomy prodotto (da tradurre come nomi UI)

- Gruppi: Famiglia · Amore & coppia · Feste & cerimonie · Ricordi & album · Altro
- `TYPE_LABELS`: Evento generale, Amore, Mamma, Papà, … Matrimonio, Viaggio, Memoriale, Portfolio (~21)
- Piani: Free / Plus / Pro + righe limiti (`Spazio totale {n} MB`, …)
- Look/temi: KhamaKey, Amore, Passione, … (~19) + varianti Chiaro/Caldo/Scuro + font + hero + decor
- Segni: Ariete … Pesci (12)

---

## 6. Toast / errori / confirm

- Confirm: modifiche non salvate · template «Prepara tutto per me» · annulla modifiche
- Save: `Salvataggio...` · `Pagina salvata.` · RSVP spento senza WhatsApp · titolo obbligatorio · PIN · rete interrotta
- Media: tipi non ammessi · limiti piano · progress upload
- Support: ticket inviato / non inviato
- Load: editor non disponibile · oggetti non disponibili · anteprima

---

## 7. Wizard onboarding

- `5 minuti` · `La tua pagina in 4 passi` · step Copertina / Template / Contenuti / Pubblica · `Inizia → Copertina`

---

## 8. Content defaults (NON chrome — opzionale dopo)

Seed in `moment-categories.js` / `DEFAULT_SECTIONS` / invite RSVP:  
`La nostra storia`, corpi template per tipo, messaggi invito wedding/birthday, ecc.

**Stima:** ~150–250 stringhe. **Non** includere nello step 5–7 chrome.

---

## 9. Worker `/m/` chrome (fase 9 — inventario breve)

PIN: `Moment protetto` · `Inserisci il PIN…` · `PIN non corretto.` · `Apri pagina`  
Empty: `Pagina in preparazione`  
Footer: `Creato con cura · KhamaKey Moments`  
Privacy notice + `Ho capito`  
RSVP form: `Conferma presenza` · `Vieni?` · `Sì, ci sarò` · `Invia su WhatsApp`  
Guestbook form (se attivo) · unità contatore `anni/mesi/giorni/…` · errori API fisse

**Stima:** ~60–100 stringhe chrome.

---

## 10. Conteggi

| Bucket | Stima uniche |
|--------|----------------|
| Editor chrome totale | **~420–520** |
| → auth + shell + errori | ~180–220 |
| → sezioni / campi / guide | ~160–200 |
| → taxonomy / temi / piani / zodiaco | ~80–100 |
| Content defaults (dopo) | ~150–250 |
| Worker `/m/` (fase 9) | ~60–100 |
| Legale (differito) | pagine lunghe |

---

## 11. Batching consigliato (step successivi)

| Step | Cosa | ~keys |
|------|------|-------|
| **2** | Regole: default IT, `localStorage`, niente auto-detect aggressivo | doc |
| **3** | Modulo `moments-i18n.js` + struttura dizionario | infra |
| **4** | Selettore IT/EN in UI | UI |
| **5** | Auth + account + attivazione | ~120–150 |
| **6** | Shell editor + publish + errori/toast | ~120–160 |
| **7** | Sezioni + taxonomy (solo label) | ~180–220 |
| **8** | Smoke IT/EN editor | QA |
| **9** | Worker `/m/` chrome | Worker |
| **10** | Docs + bump `?v=` + deploy | release |
| Dopo | Template EN opzionale · Privacy/Terms EN | — |

---

## Note operative

- Guestbook: UI moderazione ancora presente; sezione pubblica spesso disattivata — tenere chiavi pronte.
- Molte stringhe duplicate (`Salva`, `Copia`, `Accedi`) → una sola key nel dizionario.
- Step 1 = **solo questo documento**. Nessun file `pages/` o `worker/` modificato.
