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

## Fase 3 — Moments avanzato

- [ ] Condivisione invitati / RSVP
- [ ] NFC multi-link per stesso evento
- [ ] Report rivenditori (consegnati vs attivati)

## Fase 3b — Piattaforma rivenditori e logistica

- [ ] Portale rivenditori Business (brief personalizzazione + ordine)
- [ ] SQL v44: `sold_channel`, allocazione codici Moments a agenti
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

## Log sessioni

| Data | Autore | Note |
|------|--------|------|
| 2026-07-06 | Cursor | Creato v41 consolidato da v40/v22 |
| 2026-07-06 | Cursor | Moments login/editor v43: wizard signup, recovery, tab editor |
| 2026-07-06 | Cursor | Modello canali: Business online+rivenditori custom; Moments online+offline |
| 2026-07-06 | Cursor | Moments editor v44: sidebar sezioni, topbar, wizard onboarding, anteprima mobile |
| 2026-07-06 | Cursor | Storage v44 + upload cloud Moments/Business, compressione WebP, login PKCE |
| 2026-07-06 | Cursor | Git init + commit iniziale, GITHUB.md per collegamento remoto |
