# 21 — Checklist operabilità Business Editor + Admin

> **Obiettivo:** rendere editor Business e pannello Admin **operativi, completi e facili da usare** — istruzioni chiare, passaggi guidati, zero dead-end.  
> **Nota tono copy:** linguaggio semplice e diretto per operatori e clienti, **non** infantile né ridondante ovunque.  
> **Data:** 2026-07-15 · **Versioni riferimento:** Business v147, Admin v148, SQL v148  
> **Usa questa lista:** spunta ogni voce solo dopo **fix + prova manuale**. Non passare al blocco successivo se un P0 del blocco corrente è aperto.

---

## Come seguire la lista

1. Lavora **un blocco alla volta** (A1 → A2 → … → B1 → …).
2. Ogni item ha: **ID**, **priorità**, **file**, **cosa fare**, **come verificare**, **testo utente** (copy semplice da mostrare in UI).
3. Dopo ogni blocco: esegui la sezione **Smoke test** corrispondente in fondo.
4. Aggiorna `PROJECT_STATE.md` e `CHANGELOG.md` quando chiudi un blocco intero.
5. Riferimento tecnico attivazione: [`20-business-activation-inventory-v147-v148.md`](20-business-activation-inventory-v147-v148.md).

### Legenda priorità

| Tag | Significato | Regola |
|-----|-------------|--------|
| **P0** | Blocca uso reale o perde dati | Fix obbligatorio prima di vendere/spedire |
| **P1** | Confonde molto o lascia processo incompleto | Fix entro prossimo sprint operativo |
| **P2** | UX / chiarezza / velocità | Migliora dopo P0–P1 |
| **P3** | Nice-to-have | Backlog |

---

# PARTE A — Editor Business

## A1 · Entrata, codice e account

| ID | P | Stato | Cosa controllare / correggere | File | Verifica manuale | Testo utente da aggiungere |
|----|---|-------|------------------------------|------|------------------|----------------------------|
| BUS-001 | P0 | ☐ | Signup: codice invalido/già usato fallisce solo a fine step 2 — validare prima (RPC leggera o messaggio chiaro) | `app.js`, `index.html` | Codice falso → errore **prima** di creare password | *"Controlla il codice sulla confezione. Deve essere di 8–32 lettere e numeri."* |
| BUS-002 | P0 | ☐ | Login dopo email confirmation: campo codice etichettato "opzionale" ma spesso **obbligatorio** — rinominare dinamicamente se pending code in session | `index.html`, `app.js` | Conferma email → login → messaggio se manca codice | *"Al primo accesso incolla qui il codice NFC della confezione."* |
| BUS-003 | P1 | ☐ | Password min 6 (login) vs min 8 (signup) — allineare e spiegare | `index.html` | Stesso messaggio regole su entrambe le form | *"La password deve avere almeno 8 lettere o numeri."* |
| BUS-004 | P1 | ☑ | Activation form: submit senza sessione fallisce in silenzio | `app.js` v148 | Logout rapido + submit → messaggio visibile | |
| BUS-005 | P2 | ☐ | Post-signup con conferma email: checklist visuale (✓ account creato → ✓ conferma email → ✓ accedi con codice) | `index.html`, `app.js` | Flusso signup con email confirmation | *"Passo 2 di 3: apri l'email e clicca Conferma, poi torna qui."* |
| BUS-006 | P2 | ☐ | Deep link `?code=XXX`: banner *"Codice già inserito"* | `index.html` | Apri URL con code → campo precompilato + banner | *"Abbiamo già messo il tuo codice. Completa solo email e password."* |

---

## A2 · Shell, navigazione e orientamento

| ID | P | Stato | Cosa controllare / correggere | File | Verifica manuale | Testo utente |
|----|---|-------|------------------------------|------|------------------|--------------|
| BUS-010 | P0 | ☑ | Mobile: barra shell con Account/Esci + stato cloud | `shell.css`, `index.html` v148 | iPhone: Account, Esci, cloud visibili | |
| BUS-011 | P1 | ☑ | Shell header con stato cloud | `shell.css` v148 | Modifica → stato in barra | |
| BUS-012 | P2 | ☐ | Hub vs bottom nav: 17 voci in bottom nav ma hub nasconde sezioni — allineare o spiegare | `editor.html` | Passa hub Informazioni/Catalogo → nav coerente | *"Qui vedi solo le cose utili per questo passo."* |
| BUS-013 | P2 | ☐ | Wizard + setup + collaudo si accavallano — un solo *"Percorso guidato"* con progresso 1/2/3 | `editor.html` | Attività nuova → un flusso, non 3 modali insieme | *"Passo 1 di 3: scegli che tipo di attività hai"* |

---

## A3 · Salva, pagina live e link

| ID | P | Stato | Cosa controllare / correggere | File | Verifica manuale | Testo utente |
|----|---|-------|------------------------------|------|------------------|--------------|
| BUS-020 | P0 | ☑ | Chip stato pagina + chiarimento save=live | `editor.html`, `app.js` v148 | Modifica → chip aggiornato | |
| BUS-021 | P1 | ☑ | Copy save-bar auto-save | `editor.html` v148 | Testo barra non parla di "non salvato" | |
| BUS-022 | P1 | ☐ | Save bloccato se editor non idratato — coda retry su Salva manuale | `app.js:1056+` | Refresh + Salva immediato → retry, non solo toast | *"Un attimo, stiamo caricando la tua pagina…"* |
| BUS-023 | P1 | ☐ | `finishEditorHydration` scatena save extra — valutare skip se stato invariato | `editor.html`, `app.js` | Refresh senza edit → nessun write spurio in network | — |
| BUS-024 | P2 | ☐ | Sezione *Il tuo link*: spiegare differenza `/k/` (chip NFC) vs `/p/` (link web) | `editor.html` | Link visibile con entrambe le URL etichettate | *"Chip NFC = tap col telefono · Link web = da condividere su WhatsApp"* |
| BUS-025 | P2 | ☐ | Auto-publish `pubblicato:true` al primo workspace — opt-in o banner *"La pagina è visibile"* | `app.js:475+` | Nuovo account → pagina /p/ raggiungibile subito | *"La tua pagina è già visibile. Puoi modificarla quando vuoi."* |

---

## A4 · Sezioni editor (contenuto)

Per ogni sezione: **campo vuoto utile**, **help una riga**, **anteprima aggiornata**, **contratto 4 punti** se impatta `/p/`.

| ID | P | Stato | Sezione | Controllo | File | Verifica |
|----|---|-------|---------|-----------|------|----------|
| BUS-030 | P1 | ☐ | Informazioni | Nome, logo, contatti salvano e appaiono in anteprima + /p/ | `editor.html`, `app.js`, `worker.js` | Compila → Salva → apri /p/ |
| BUS-031 | P1 | ☐ | Copertina / hero | Upload immagine + testi hero in snapshot pubblico | idem | Foto copertina visibile su mobile |
| BUS-032 | P1 | ☐ | Catalogo | Quick add, varianti, immagini — nessun blob perso al reload | `editor-media.js` | Aggiungi piatto → refresh → ancora lì |
| BUS-033 | P1 | ☐ | Prenotazioni | Form demo + email Resend (se configurata) | `editor.html`, Worker | Prova prenotazione → email o log |
| BUS-034 | P2 | ☐ | Galleria | Limite 10 foto con contatore *"3 di 10"* | `editor.html` | 11ª foto → messaggio chiaro |
| BUS-035 | P2 | ☐ | Mappa / orari | Guida Google Maps già presente — link *Apri guida* visibile | `editor.html` | Click guida → modal si apre |
| BUS-036 | P2 | ☐ | Multilingua | Switch con 3 stati chiari (già v122) — tooltip *"Traduce la pagina per i turisti"* | `editor-international.js` | Attiva → badge *5 lingue* |
| BUS-037 | P2 | ☐ | Analytics | Empty state + CTA *Condividi link* | `editor.html` | Zero visite → messaggio + pulsante |
| BUS-038 | P1 | ☐ | Checklist / Collaudo | Ogni item checklist apre la sezione giusta (`data-khama-go`) | `editor.html` | Tap item → scroll sezione |
| BUS-039 | P2 | ☐ | Khama assistant | Etichetta *"Suggerimenti automatici"* se IA non attiva | `editor.html:6643` | Nessuna promessa "IA reale" se endpoint vuoto |

---

## A5 · Account, supporto, campi decorativi

| ID | P | Stato | Cosa controllare / correggere | File | Verifica | Testo utente |
|----|---|-------|------------------------------|------|----------|--------------|
| BUS-040 | P0 | ☑ | Logout in modal Account + shell | `editor.html` v148 | Esci raggiungibile | |
| BUS-041 | P1 | ☑ | Placeholder assistenza aggiornato | `editor.html` v148 | | |
| BUS-042 | P1 | ☑ | Sicurezza: istruzioni recupero password | `editor.html` v148 | | |
| BUS-043 | P1 | ☑ | Fatturazione: campi disabilitati | `editor.html` v148 | | |
| BUS-044 | P2 | ☐ | Profilo read-only — link *Modifica email* → supporto o Supabase | `editor.html:2466+` | | *"Per cambiare email scrivici in Assistenza"* |
| BUS-045 | P2 | ☐ | Piano TEST vs copy *"Tutto aperto"* — unificare badge | `editor.html:2738` | Badge coerente con tab Piano | *"Periodo di prova — tutte le funzioni attive"* |

---

## A6 · Bug tecnici editor (ordine fix)

| ID | P | Stato | Bug | File | Fix atteso |
|----|---|-------|-----|------|------------|
| BUS-050 | P0 | ☐ | localStorage flash prima di cloud hydration | `editor.html:6997+` | Mostra skeleton finché `editor-hydrated` |
| BUS-051 | P1 | ☑ | Upload bloccato finché business id pronto | `editor.html` v148 | Messaggio se troppo presto | |
| BUS-052 | P1 | ☐ | Workspace warning banner unico — dettaglio per slug/NFC/public page | `app.js:746+` | Lista errori espandibile |
| BUS-053 | P2 | ☐ | `collectState(true)` pesante ad ogni keystroke | `editor.html:6139` | Debounce snapshot separato da dirty flag |
| BUS-054 | P1 | ☐ | PDF catalogo / documenti base64 (audit v124) | `editor-media.js`, `worker.js` | Quando Worker libero: R2 + whitelist MIME |

---

# PARTE B — Pannello Admin

## B0 · Salute generale admin

| ID | P | Stato | Controllo | File | Verifica |
|----|---|-------|-----------|------|----------|
| ADM-001 | P1 | ☐ | Cache bust allineato: `admin.css?v=148` con `admin.js?v=148` | `admin.html:11` | Hard refresh → CSS nuovo |
| ADM-002 | P2 | ☐ | Stati ordini/NFC in **italiano** in tabella (non `pending`, `available`) | `admin.js` | Tabella leggibile senza glossario |
| ADM-003 | P2 | ☐ | Toast errore visibile (non solo `console.error`) su load falliti | `admin.js` | Simula RPC mancante → banner rosso |
| ADM-004 | P3 | ☐ | Rimuovere o documentare fallback `ADMIN_EMAILS` | `admin.js:43+` | Solo `platform_members` in prod |

---

## B1 · Dashboard — *"Cosa fare oggi"*

| ID | P | Stato | Miglioria | Verifica | Testo utente (già in guide o da aggiungere) |
|----|---|-------|-----------|----------|---------------------------------------------|
| ADM-010 | P1 | ☐ | CTA **Crea cliente test Business** (wizard 5 click) | Da dashboard → codice → account → editor | *"Prova come farebbe un cliente nuovo"* |
| ADM-011 | P2 | ☐ | In modalità semplice: mostrare alert stock zero Business **e** Moments | KPI visibili senza passare a Impostazioni | *"Codici NFC in esaurimento — clicca per crearne altri"* |
| ADM-012 | P2 | ☐ | Chip benvenuto collegati a tab giuste post-v148 | Click *Magazzino Business* → tab corretta | (già in `admin.html:128`) |

---

## B2 · Clienti Business — *"Attività Business"*

| ID | P | Stato | Controllo / miglioria | File | Verifica |
|----|---|-------|----------------------|------|----------|
| ADM-020 | P0 | ☐ | Provisioning: dopo successo mostrare **3 pulsanti** — Apri editor · Copia link /k/ · Copia link /p/ | `admin.js`, `admin.html` | Provision → link copiabili |
| ADM-021 | P1 | ☐ | Spiegare se codice omesso nel provision (account senza attività?) | `admin-guide.js`, form hint | Leggi hint sotto form |
| ADM-022 | P1 | ☐ | Drawer: ridurre 8 sotto-viste a 4 tab con icone (*Scheda · Ordini · Ticket · Note*) | `admin.html`, `admin.js` | Operatore trova email in <3 click |
| ADM-023 | P2 | ☐ | Colonna slug: tooltip *"Indirizzo web della pagina"* | `admin.js` | Hover slug → spiegazione |
| ADM-024 | P2 | ☐ | Pulsante Analytics apre dashboard analytics reale | `admin.js` | Click → dati o empty state chiaro |

**Copy provisioning (da mettere sopra il form):**
> *"1. Scrivi email del cliente · 2. (Opzionale) incolla codice NFC · 3. Clicca Crea — gli manderemo l'email per entrare."*

---

## B3 · Magazzino NFC Business (v148)

| ID | P | Stato | Controllo / miglioria | File | Verifica |
|----|---|-------|----------------------|------|----------|
| ADM-030 | P0 | ☐ | **Guide dice "seleziona righe bulk" ma UI non ha checkbox** — aggiungere bulk bar come Moments O correggere guide | `admin.html`, `admin.js`, `admin-guide.js` | Bulk update 3 codici → OK |
| ADM-031 | P0 | ☐ | Collegare RPC `bulk_update_business_activation_codes` (oggi update diretto) | `admin.js:3639+` | Cambio stato bulk → rispetta regole SQL |
| ADM-032 | P1 | ☐ | PDF etichette Business (parità Moments) | `admin-moment-labels.js`, `admin.js` | Batch → scarica PDF |
| ADM-033 | P1 | ☐ | Dopo batch: riepilogo *"Creati 50 codici — Scarica CSV"* già presente; aggiungere *Stampa etichette* | `admin.js:2002+` | |
| ADM-034 | P2 | ☐ | Filtri con chip italiani: *Disponibili · Attivati · In pausa* | `admin.js:1831+` | |
| ADM-035 | P2 | ☐ | Empty state con pulsante *Genera il primo lotto* che scrolla al form | `admin.html:636+` | |

**Copy sopra tabella:**
> *"Ogni riga = un chip NFC. Disponibile = in scatola. Attivato = il cliente ha già aperto l'editor."*

---

## B4 · Ordini + Spedizioni NFC

| ID | P | Stato | Controllo / miglioria | File | Verifica |
|----|---|-------|----------------------|------|----------|
| ADM-040 | P0 | ☐ | **Ordini e Spedizioni NFC ignorano codici Business** — estendere `nfcCodesForOrder`, `assignOrderCodes` | `admin.js:2819, 3704, 3776` | Ordine Business → assegna codice Business |
| ADM-041 | P1 | ☐ | Pulsante *Stampa* in Spedizioni: route a `businessInventory` se ordine Business | `admin.js:2900` | Ordine mix → magazzino giusto |
| ADM-042 | P1 | ☐ | Scollega ordine su drawer codice Business (oggi solo Moments) | `admin.js:3679+` | Unlink → codice torna disponibile |
| ADM-043 | P2 | ☐ | Campo tracking corriere in drawer ordine | `admin.html`, SQL futuro | |
| ADM-044 | P2 | ☐ | Pipeline labels italiane: *Da produrre · Da stampare · Da spedire · Spedito* | `admin.js` | |

---

## B5 · Clienti Moments + Magazzino Moments

| ID | P | Stato | Controllo | Verifica |
|----|---|-------|-----------|----------|
| ADM-050 | P1 | ☐ | Wizard test account Moments (audit P0): Catalogo → Stock → Clienti → Editor | 4 tab → pagina /m/ + /k/ funzionanti |
| ADM-051 | P2 | ☐ | Smoke test lotto reale v127 (SKU + batch + PDF) | CSV + PDF con /k/ corretti |

---

## B6 · Supporto, CRM, Staff

| ID | P | Stato | Miglioria | File |
|----|---|-------|-----------|------|
| ADM-060 | P1 | ☐ | Supporto: campo *Assegnato a* + filtro *I miei ticket* | `admin.html`, `admin.js` |
| ADM-061 | P1 | ☐ | Supporto: template risposta email cliente (anche manuale copy) | `admin.js` |
| ADM-062 | P2 | ☐ | CRM in modalità semplice: link da Clienti Business *Apri scheda CRM* | `admin.js` |
| ADM-063 | P0 | ☐ | Staff: **creare utente Auth** o checklist *"Vai su Supabase → Invita"* post-save | `admin.js:4000+`, `admin-guide.js` |

**Copy staff form:**
> *"Dopo Salva, invita la persona da Supabase (Authentication → Invite) oppure chiedile di registrarsi con la stessa email."*

---

## B7 · Integrazioni, Piani, resto

| ID | P | Stato | Miglioria |
|----|---|-------|-----------|
| ADM-070 | P1 | ☐ | Billing tab: checklist Stripe (*Chiave OK? · Webhook OK? · Prezzo collegato?*) |
| ADM-071 | P2 | ☐ | Unificare Billing + Piani o rimuovere tab duplicata |
| ADM-072 | P2 | ☐ | Partner/Provvigioni: seed 1 agente + 1 ordine test per collaudo UI |
| ADM-073 | P3 | ☐ | Permessi: preset *Owner · Supporto · Magazzino · Marketing* |

---

## B8 · Guide admin (chiarezza operativa)

| ID | P | Stato | Azione |
|----|---|-------|--------|
| ADM-080 | P1 | ☐ | Ogni tab: **3 passi max** in guide — ridurre gergo tecnico dove possibile |
| ADM-081 | P1 | ☐ | Correggere `businessInventory` guide (bulk inesistente) — vedi ADM-030 |
| ADM-082 | P2 | ☐ | Guide sui **drawer** (cliente, codice, ordine) — mini-help in cima drawer |
| ADM-083 | P2 | ☐ | Modalità semplice: messaggio se tab nascosta *"Passa a Modalità completa per …"* |
| ADM-084 | P2 | ☐ | Video/GIF 30s per flussi: provision Business, batch codici, evasione ordine |

---

# PARTE C — Smoke test (seguire in ordine)

## C1 · Business — cliente nuovo (15 min)

- [ ] **C1.1** Admin → Magazzino NFC Business → genera lotto 3 codici → CSV scaricato
- [ ] **C1.2** Copia 1 codice → finestra incognito → Signup step 1+2
- [ ] **C1.3** Editor si apre → save bar visibile → modifica nome attività
- [ ] **C1.4** Attendi auto-save o clic Salva → chip *Online* / messaggio salvato
- [ ] **C1.5** Shell/parent mostra stato cloud (dopo BUS-011)
- [ ] **C1.6** Apri `/p/{slug}` → nome aggiornato
- [ ] **C1.7** Apri `/k/{code}` → redirect a `/p/{slug}`
- [ ] **C1.8** Mobile (DevTools iPhone): Account + Assistenza + Logout raggiungibili
- [ ] **C1.9** Account → Assistenza → invia ticket → Admin Supporto lo vede
- [ ] **C1.10** Admin Clienti Business → riga con email, codice, slug corretti

## C2 · Admin — operatore stock (10 min)

- [ ] **C2.1** Dashboard → alert stock Business se sotto soglia
- [ ] **C2.2** Magazzino Business → filtra *Disponibili* → conta coerente con KPI
- [ ] **C2.3** Modifica codice nel drawer → stato *In pausa* → non attivabile da cliente
- [ ] **C2.4** Provisioning nuovo email → messaggio successo + link editor (dopo ADM-020)
- [ ] **C2.5** Ordine test → assegna codice Business (dopo ADM-040)
- [ ] **C2.6** Spedizioni NFC → riga ordine → Avanza stato fino a *Spedito*

## C3 · Regressione account esistenti (5 min)

- [ ] **C3.1** Login `perellikristian@gmail.com` / `kristianperelli@gmail.com` → editor senza richiedere nuovo codice
- [ ] **C3.2** Dati attività e pagina /p/ intatti dopo deploy

---

# PARTE D — Piano di lavoro consigliato (sprint)

| Sprint | Scope | Item ID | Obiettivo |
|--------|-------|---------|-----------|
| **S1 — Sblocco mobile** | 2–3 giorni | BUS-010, BUS-040, BUS-020, BUS-011 | Cliente può usare editor da telefono |
| **S2 — Admin Business NFC** | 3–4 giorni | ADM-030–031, ADM-040–042, ADM-020 | Stock → ordine → spedizione Business E2E |
| **S3 — Chiarezza salvataggio** | 1–2 giorni | BUS-020–022, BUS-041, ADM-080–081 | Nessuno crede di "non pubblicare" |
| **S4 — Account decorativo** | 1–2 giorni | BUS-042–043, BUS-045 | Niente form finto |
| **S5 — Wizard test + staff** | 2 giorni | ADM-010, ADM-050, ADM-063 | Team collauda senza dev |
| **S6 — Polish UX** | ongoing | BUS-005–006, ADM-082–084, copy mirata | Guide e messaggi solo dove servono |

---

# PARTE F — Stato upload e funzioni (audit 2026-07-15)

Verificare in collaudo reale (account autenticato + Worker live). Legenda: ✅ cloud persistente · ⚠️ parziale · ❌ non operativo in produzione

| Funzione | Stato | Note / item checklist |
|----------|-------|------------------------|
| Logo / copertina / chi siamo (immagini) | ✅ | R2 via `__khamakeyMedia.upload` · BUS-030 |
| Galleria foto | ✅ | Stesso pipeline · max 8 MB · BUS-034 |
| Immagini catalogo | ✅ | `readImageFile` + pulizia R2 su replace · BUS-032 |
| Video presentazione | ✅ | R2 max 25 MB / 2 min · v124 · BUS-032 |
| PDF catalogo | ⚠️ | Solo blob locale in stato — **si perde al reload** finché Worker non accetta PDF · BUS-054 |
| Welcome book / Documenti PDF | ⚠️ | Base64 in JSON Supabase (max 8 MB/file) — funziona ma pesante · migrare R2 |
| YouTube embed | ✅ | URL only, no upload |
| Salvataggio cloud auto | ✅ | 1.2s debounce · chip stato v148 · BUS-020 |
| Pagina pubblica `/p/` | ✅ | Upsert on save · auto-publish on workspace |
| NFC `/k/` redirect | ✅ | Dopo attivazione codice v147 |
| Multilingua OpenAI | ⚠️ | Richiede Worker + crediti · UI presente |
| Analytics | ✅ | RPC v74 · empty state editor |
| Ticket assistenza | ✅ | Business editor → admin Supporto |
| Account mobile (Account/Esci) | ✅ v148 | Barra shell visibile + Esci in modal Account · BUS-010 |
| Prenotazioni + email | ⚠️ | Dipende `RESEND_API_KEY` Worker |

---

# PARTE E — Definition of Done (operatività)

Un componente è **operativo** quando:

1. ☐ Flusso principale completabile **senza leggere codice**
2. ☐ Ogni schermata ha **titolo + 1 frase** che spiega cosa fare
3. ☐ Errori in **italiano semplice** + cosa fare dopo
4. ☐ Stato vuoto con **pulsante azione** (non tabella vuota muta)
5. ☐ Smoke test C1 o C2 relativo **tutto spuntato**
6. ☐ `admin-guide.js` / testi editor **allineati** al comportamento reale
7. ☐ Voce in `CHANGELOG.md` + versione `?v=` incrementata

---

## Riferimenti

- Attivazione Business: [`20-business-activation-inventory-v147-v148.md`](20-business-activation-inventory-v147-v148.md)
- Piano console admin: [`19-admin-console-operativa.md`](19-admin-console-operativa.md)
- Audit admin 2026-07-14: [`18-admin-audit.md`](18-admin-audit.md)
- Editor tecnico: [`03-editor.md`](03-editor.md)
- Admin: [`05-admin.md`](05-admin.md)

*Aggiornare questo file spuntando ☐ → ☑ e data in `ROADMAP.md` a ogni sprint chiuso.*
