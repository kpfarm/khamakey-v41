# KhamaKey v41 — Roadmap evolutiva

Base funzionante. Obiettivo: editor maturo, sezioni ricche, automazioni operative.

## Modello prodotto (Business vs Moments)

| | **Business** | **Moments** |
|---|-------------|-------------|
| Vendita | Online (+ rivenditori con portale personalizzazione) | Online + offline |
| Personalizzazione | Alta (logo, brand, contenuti) — raccolta dati pre-produzione | Pagina editor post-attivazione |
| Spedizione | Diretta al cliente **o** al rivenditore (prodotti custom) | Diretta (online) o tramite rivenditore (offline, tracciabilità codice) |
| Editor | `editor.html` — sidebar, anteprima live, sezioni a card | `moments.html` — allineare stessa UX |

### Portale rivenditori Business (da costruire)

Flusso: rivenditore compila brief personalizzazione → ordine produzione KhamaKey → spedizione **al rivenditore** → rivenditore consegna al cliente finale.

- File previsto: `reseller.html` o area agenti con permesso `agents.write`
- Dati: logo, testi, colori, quantità, indirizzo spedizione rivenditore
- Collegamento: `platform_orders` + `product_area=business` + `fulfillment=reseller`

### Moments — canali

- **Online**: ordine web → spedizione KhamaKey → cliente attiva codice
- **Offline**: lotto allocato a rivenditore → vendita sul posto → attivazione codice
- Tracciabilità: `sold_channel`, `assigned_agent_id` su `moment_activation_codes`

### Servizi centrali condivisi

- Supporto unificato (filtro Business / Moments)
- CRM parallelo (due pipeline)
- Hub spedizioni (automazione corriere + allocazioni rivenditori)

---

## Fase 1 — Fondamenta (in corso)

- [x] Progetto consolidato pages + worker + sql
- [x] URL centralizzati in `config.js`
- [x] Documentazione collaborazione Cursor/Codex
- [x] Prenotazioni: canale email automatico Resend nell'editor
- [x] Moments: template per tipo, riordino sezioni, galleria URL
- [x] Template bilanciati per tutte le categorie + «Altre sezioni» con tutte le sezioni adattate (v89–v90)
- [x] Fix upload media Safari/iOS (MIME vuoto, v87)
- [x] SQL v59/v60 categorie Moments verificate in produzione
- [x] Worker: ordine sezioni e galleria Moments
- [x] Admin: clienti Moments, magazzino NFC separato, provisioning admin (v43)

## Fase 2 — Editor business

- [ ] Wizard onboarding nuova attività (settore → preset blocchi)
- [ ] Più automazioni prenotazione (coda approvazione, promemoria)
- [ ] Sincronizzazione ordine blocchi editor ↔ stato salvato Supabase
- [ ] Migliorare UX catalogo (varianti, allergeni, disponibilità)
- [ ] Anteprima tablet/desktop più fedele al worker

## Fase 2b — Editor Moments (parità UX Business)

Obiettivo: stessa semplicità percepita dell'editor Business, adattata al contesto "pagina ricordo / evento".

- [x] Sidebar sezioni con icone (Copertina, Sezioni, Galleria, Programma, Privacy…) al posto dei soli tab
- [x] Card con titolo + sottotitolo per ogni blocco (come `section-header` Business)
- [x] Anteprima live più grande e sticky (mobile: toggle Anteprima / Modifica)
- [x] Barra superiore: stato salvataggio, Pubblica / Bozza, Apri pagina
- [x] Wizard primo accesso post-attivazione (3 step guidati)
- [x] Upload immagini Supabase Storage
- [x] Temi visivi base (classic, celebration, minimal, memorial)

## Fase 2c — Creator emotivo (da love.html)

Obiettivo: pagine NFC come **esperienze nel tempo**, non catalogo prodotti. Ispirazione: `khamakey love.html` (Creator).

### Già integrato (v52)
- [x] Upload media su **Cloudflare R2** via Worker (`POST /api/media/upload`, serve `/cdn/...`)
- [x] Foto, video, audio dalla libreria locale con limiti di dimensione e quantità
- [x] Titolo + descrizione per ogni media (tap per aprire dettaglio / lightbox)
- [x] Copertina: sposta, centra e zoom con anteprima formato smartphone
- [x] 11 palette colore + 3 varianti atmosfera (`moment-themes.js`)
- [x] Stili hero, pillola, foto profilo, contatore «insieme da»
- [x] Pagina pubblica Worker v26: tipografia serif, scroll reveal, galleria swipe
- [x] Anteprima editor allineata ai colori scelti
- [x] Navigazione mobile a 2 livelli: Design · Contenuti · Account
- [x] Sezioni emotive: dedica, timeline, promesse, luoghi, sogni, countdown, musica, citazione, firma
- [x] Rimosso da Moments: dettagli generici, contatti, messaggio libero, luogo/mappa secco, programma piatto

### Prossimo — sezioni emotive avanzate
- [x] Upload audio in sezione Musica (oltre Spotify)
- [x] Video YouTube embed
- [x] Lettera al futuro (sigillata)
- [x] Galleria lightbox fullscreen con navigazione
- [x] Rituali, pet, numeri simbolici
- [x] Endpoint delete media su R2

### Solo team interno (non editor cliente)
- [ ] Integrazione ordini Airtable + WhatsApp consegna link
- [ ] Export HTML standalone (sostituito da URL NFC permanente)

## Fase 3 — Moments avanzato

- [ ] Condivisione invitati / RSVP
- [ ] NFC multi-link per stesso evento
- [ ] Report rivenditori (consegnati vs attivati)

## Fase 3b — Piattaforma rivenditori e logistica

- [ ] Portale rivenditori Business (brief personalizzazione + ordine)
- [x] SQL v61: `sold_channel`, allocazione codici Moments a agenti
- [ ] Hub spedizioni centralizzato con automazione corriere
- [ ] Supporto unificato + CRM Moments

## Fase 4 — Admin e automazioni piattaforma

- [ ] Dashboard automazioni (email, stock basso, lead)
- [ ] Webhook outbound per integrazioni (Zapier, n8n)
- [ ] Report analytics Moments vs Business
- [ ] Export CSV prodotti / ordini

## Fase 5 — Produzione

- [ ] Domini custom (`app.khamakey.com`, `nfc.khamakey.com`)
- [ ] CI deploy automatico Pages + Worker
- [ ] Test end-to-end automatizzati

---

## Piano sprint (2026-07-08)

| Sprint | Obiettivo | Stato |
|--------|-----------|-------|
| **A** | Test + bugfix Moments (mobile, pagina pubblica, RSVP, sezioni vuote) | completato |
| **B** | RSVP completo (condivisione inviti + riepilogo admin) | completato |
| **C** | Business editor — wizard onboarding settore | completato |
| **D** | Rivenditori — tracciabilità codici e report | in corso |

### Sprint A — checklist

- [x] Sezioni vuote nascoste in pagina pubblica (logica contenuto strict)
- [x] Fix citazione senza autore non visibile
- [x] RSVP WhatsApp: prefisso 39 automatico per numeri italiani
- [ ] Smoke test iPhone su 5 tipi pagina
- [x] Deploy Worker allineato (`v91-moments-qa`)
- [x] Lettera al futuro: sanitizzazione blob URL + messaggio rete chiaro
- [x] RSVP pagina pubblica: contrasto testi e input
- [x] Icone sezioni unificate (emoji + tile gradient)

### Sprint B — checklist

- [x] Link invito RSVP con anchor `#moment-section-rsvp`
- [x] Pannello condivisione invito in editor (copia / share)
- [x] Riepilogo organizzatore + anteprima messaggio WhatsApp
- [x] Messaggi RSVP personalizzati per tipo evento
- [x] Voci RSVP configurabili + voci personalizzate
- [x] Sistema colori elegante (moduli bianchi, accento solo hero)
- [ ] Tabella risposte RSVP (fase successiva — richiede backend)

### Sprint C — checklist

- [x] Wizard setup guidato per settore (5 template)
- [x] Chiave wizard per ogni attività (non globale)
- [x] Apertura automatica su attività nuova / vuota
- [x] Pulsante «Apri setup guidato» in Informazioni
- [x] Salvataggio cloud automatico dopo template wizard
- [ ] Smoke test wizard su 5 settori

### Sprint D — checklist

- [x] SQL v61: `sold_channel`, `assigned_agent_id` su codici Moments
- [x] SQL v62: `platform_order_id` + assegnazione codici da magazzino
- [x] Stock-first: genera codici senza rivenditore, assegna all'ordine
- [x] Admin: ricerca, filtri, modifica singola, bulk, drawer ordine/codice
- [x] Agenti: modifica da tabella
- [ ] Portale rivenditori self-service (fase successiva)

---

| Data | Autore | Note |
|------|--------|------|
| 2026-07-06 | Cursor | Creato v41 consolidato da v40/v22 |
| 2026-07-06 | Cursor | Moments login/editor v43: wizard signup, recovery, tab editor |
| 2026-07-06 | Cursor | Modello canali: Business online+rivenditori custom; Moments online+offline |
| 2026-07-06 | Cursor | Moments editor v44: sidebar sezioni, topbar, wizard onboarding, anteprima mobile |
| 2026-07-06 | Cursor | Storage v44 + upload cloud Moments/Business, compressione WebP, login PKCE |
| 2026-07-06 | Cursor | Git init + commit iniziale, GITHUB.md per collegamento remoto |
| 2026-07-06 | kpfarm | Push GitHub: github.com/kpfarm/khamakey-v41 |
| 2026-07-06 | Cursor | SQL v44 applicato su Supabase (bucket khamakey-media + RLS) |
| 2026-07-08 | Cursor | Moments v89–v90: template tutte categorie, Altre sezioni complete, guide per tipo, onboarding |
| 2026-07-08 | Cursor | **v94**: Business editor (hub, anteprima live, pagina pubblica pro), admin fulfillment, SQL v61–v63, regola git commit sempre |
