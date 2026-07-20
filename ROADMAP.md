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

- [x] Wizard onboarding nuova attività (settore → preset blocchi → 3 passaggi nome/WhatsApp/catalogo)
- [ ] Più automazioni prenotazione (coda approvazione, promemoria)
- [ ] Sincronizzazione ordine blocchi editor ↔ stato salvato Supabase
- [x] Migliorare UX catalogo (varianti, allergeni, disponibilità — modalità semplice v110)
- [x] Anteprima tablet/desktop più fedele al worker (dock + modal device switch v113)

## Fase 2b — Editor Moments (parità UX Business)

> **Ownership:** aggiornamenti Moments a carico di agente dedicato. Questo track resta in roadmap ma non è in scope del lavoro Business corrente.

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
- [x] SQL v68: rete agenti a grado (L1/L2/L3), listini B2B, storico consegne, admin Rete rivenditori
- [x] Hook provvigioni multilivello su ordini Shopify/Stripe/admin (SQL v85 + Admin v125)
- [x] Portale self-service rivenditori (`reseller.html`) — provvigioni/rete/consegne per agente (SQL v86, RPC solo-i-miei-dati)
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
| **E** | Shopify Moments — catalogo PIM, webhook ordini, sync | in corso |
| **F** | Pagamenti (Stripe/PayPal) + email ordini Resend | prossimo |
| **G** | Pagina internazionale Business — 1 tap, 5 lingue, auto-detect visitatore | in corso |
| **H** | Logistica Packlink + marketplace Etsy/Amazon | pianificato |

### Sprint E — Shopify & canali vendita (2026-07-09)

**Strategia:** Moments first su Shopify; Business resta su khamakey.it (lead + Stripe Payment Link). Bundle condiviso = N fisici, 1 codice NFC.

Documentazione operativa: `SHOPIFY-SETUP.md`

- [x] SQL v64: `platform_moment_catalog`, listings, sync log, ingest Shopify
- [x] Logica bundle: `physical_units` vs `activation_codes`
- [x] Admin: tab **Catalogo vendita** Moments
- [x] Worker: webhook `POST /webhooks/shopify/orders`
- [x] Worker: sync `POST /api/channels/shopify/sync`
- [x] Applicare SQL v64 su Supabase produzione
- [x] Configurare WEBHOOK_INGEST_KEY Worker + Supabase (Shopify API ancora da collegare)
- [x] v101: prodotti Shopify in bozza finché incompleti (`shopify_live`)
- [x] v102: Integration Hub, webhook Stripe/PayPal/Resend, i18n base
- [x] v103: email ordine con codici NFC, Stripe Checkout + webhook ingest
- [x] v104: admin UX — guide contestuali, filtri rapidi, legende, onboarding dashboard
- [x] Applicare SQL v66 + v67 su Supabase produzione
- [ ] Configurare RESEND_API_KEY + STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET nel Worker
- [ ] Packlink / tracking spedizioni in admin — fase E4
- [ ] Marketplace Etsy / Amazon / TikTok — fase E5

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
- [x] Tabella risposte RSVP (backend + pannello editor v107)
- [x] Libro degli ospiti con moderazione (v108)

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
- [x] Admin Sprint E: ricerca/filtri Clienti, Moments, Ordini, Agenti + alert dashboard
- [x] Agenti: modifica da tabella
- [x] SQL v68 + admin: rete rivenditori a grado, listini, consegne
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
| 2026-07-09 | Cursor | **v104**: pannello admin user-friendly — guide sezione, chip filtri, legende Shopify/ordini, welcome dashboard |
| 2026-07-09 | Cursor | **v68 Supabase**: rete rivenditori applicata in produzione (tier, listini, consegne, RPC) |
| 2026-07-09 | Cursor | **Collab multi-agente**: `CODEX-COLLAB.md` + regola Cursor `.cursor/rules/multi-agent-collab.mdc` |
| 2026-07-09 | Cursor | **v107 Sprint G1**: pagina internazionale Business — pulsante 1 tap, OpenAI Worker, auto-detect lingua visitatore |
| 2026-07-09 | Cursor | **v106**: admin UX — menu 4 intenti, modalità semplice, copy umano per rete partner |
| 2026-07-12 | Claude/Codex | **v84-v85/v125**: CRM admin, trigger provvigioni ordini, gestione approva/paga in Admin |
| 2026-07-09 | Cursor | **v103**: email ordine con codici NFC, Stripe Checkout, ingest webhook Stripe |
| 2026-07-09 | Cursor | **v102**: Integration Hub, Stripe/PayPal/Resend webhook, email ordine, i18n v66 |
| 2026-07-09 | Cursor | **v101 Sprint E**: Shopify sync in bozza finché prodotto incompleto; flag `shopify_live` in admin |
| 2026-07-09 | Cursor | **v99 Sprint E**: catalogo vendita Moments, webhook/sync Shopify, bundle NFC, SHOPIFY-SETUP.md |
| 2026-07-09 | Cursor | **v98**: categorie unificate — setup guidato e select usano stesso catalogo e preset |
| 2026-07-09 | Cursor | **v97 admin**: ricerca/filtri Clienti, Moments, Ordini, Agenti; template 21 categorie; dashboard alert operativi |
| 2026-07-10 | Cursor | **v110 Moments**: dashboard organizzatore, email lettera al futuro, SQL v73, deploy Worker+Pages |
| 2026-07-10 | Cursor | **v109**: anniversari Moments — cron Worker, email Resend, toggle editor |
| 2026-07-10 | Cursor | **Deploy prod**: SQL v70/v71, Worker v108, Pages moments v108 |
| 2026-07-10 | Cursor (Business) | **v117**: fix analytics (`dispositivo` + RPC v74), order_sent, consenso cookie click, UI refresh |
| 2026-07-10 | Cursor (Business) | **v116**: wizard collaudo NFC guidato (apri → prova → chip pronto) |
| 2026-07-10 | Cursor (Business) | **v115**: guida Google Maps, collaudo in checklist, prova prenotazione |
| 2026-07-10 | Cursor | **v114**: guida recensioni in Azioni, checklist prenotazioni, prova prenotazione, QR/ordine in save bar |
| 2026-07-10 | Cursor | **v113**: anteprima dock smartphone/tablet, prenotazioni semplificate, prova ordine con carrello demo |
| 2026-07-10 | Cursor | **v112**: QR scaricabile, guida recensioni Google, pulsante «Prova ordine» |
| 2026-07-10 | Cursor | **v111**: rimosso pagamento online/link statici; wizard 3 passaggi post-categoria; coach catalogo |
| 2026-07-10 | Cursor | **v110**: catalogo semplificato (quick add, tag rapidi, avanzate in accordion) + tutorial animato ordini NFC |
| 2026-07-10 | Cursor | **v109**: editor Business — barra «Pagina pronta», Apri pagina finale, logo/copertina semplificati, conferma salvataggio cloud |
| 2026-07-11 | Claude Code | **Audit sicurezza + fix**: SQL v75 (PIN Moments non espone più `state` a prescindere dal PIN, RLS `platform_webhook_events`, `business_page_i18n`), v76 (rate limiting Postgres); firma webhook Resend/PayPal; CSP `pages/_headers` + pagine pubbliche Worker. **Non committato, non deployato, SQL non applicata** — vedi `KHAMAKEY_OS/PROJECT_STATE.md` |
| 2026-07-11 | Codex | **Follow-up Moments beta**: PIN lockout per slug + visitatore, Worker passa `p_visitor_key`, rate limit leggero su `/event`, CSP Worker allineata per CSS pubblico. **Non committato, non deployato, SQL non applicata** |
| 2026-07-11 | Claude Code | **Review follow-up Codex** (verificato ok, nessuna regressione) + **SQL v77**: pulizia periodica automatica `moment_pin_attempts`/`platform_rate_limits`, agganciata al cron giornaliero esistente. Aggiunto avviso ordine deploy obbligatorio (SQL prima del Worker) in `PROJECT_STATE.md`. **Non committato, non deployato** |
| 2026-07-12 | Antigravity | **v118**: restyling premium CSS Moments adattivo (matrimonio vs viaggi) + linee guida grafiche in `docs/01-brand.md` |
| 2026-07-13 | Codex | **v88**: claim sicuro primo accesso rivenditori, senza fallback email insicuro |
| 2026-07-13 | Antigravity | **Visual & Sales Copy**: generati asset grafici per Moments ("Love" keyring) e Business, creato catalogo copy e doc di vendita docs/16-sales-copy-love.md |
| 2026-07-13 | Codex | **Creative Engine**: normalizzato output Antigravity in `KHAMAKEY_OS/assets/marketing/`, creato manifest asset e protocollo condiviso |
| 2026-07-13 | Codex | **Admin v127**: Magazzino NFC Moments con creazione SKU in sezione, generazione stock aperta e filtri per SKU/data |
| 2026-07-13 | Codex | **Collaborazione agenti**: rafforzato bootstrap/passaggio consegne e creato prompt per nuovi agenti |
| 2026-07-14 | Codex | **Audit Admin**: creato `KHAMAKEY_OS/docs/18-admin-audit.md` con stato funzioni, gap e piano miglioramento |
| 2026-07-14 | Codex | **Admin v128 / Business v118 / Moments v114 / SQL v89**: console supporto operativa e ticket assistenza apribili da editor account |
| 2026-07-15 | Cursor | **Business v147 / SQL v147**: attivazione codice prodotto (parità Moments), signup 2-step, form attivazione, save bar navy, fix idratazione — deploy Pages, doc vault `docs/20-business-activation-inventory-v147-v148.md` |
| 2026-07-15 | Cursor | **Business v148 (Sprint S1)**: barra shell mobile Account/Esci/cloud, chip stato pagina, fix account sicurezza/fatturazione, guard upload, copy auto-save |
| 2026-07-17 | Cursor | **Moments v135 / SQL v157**: categoria bloccata al codice NFC (badge editor, peek signup, activate/save lock, batch magazzino tutte le categorie) — Pages deploy + migration Supabase |
| 2026-07-18 | Cursor | **Domini custom**: `app.khamakeymoments.com` (Pages) + `link.khamakeymoments.com` (Worker) — config/CSP/deploy v136 / Worker v139 |
| 2026-07-18 | Cursor | **Audit + fix assistenza**: SQL v158 sblocca ticket `moments_editor`/`business_editor` (CHECK); feedback Business; filtro Supporto Moments admin v161 |
| 2026-07-18 | Cursor | **Moments perf v138 / Worker v140**: anteprima debounce+hash, rate limit preview, lista senza page_state, soft-save senza reload editor |
| 2026-07-18 | Cursor | **Admin Moments v162**: consolle senza Shopify/Business; redirect `admin.html`→`moments-admin` su dominio Moments; reset filtri magazzino se nascondono i pezzi |
| 2026-07-19 | Cursor | **Admin v163**: fix critico — `Promise.all(loaders)` non invocava le load (magazzino restava su «Caricamento prodotti...») |
| 2026-07-19 | Cursor | **Moments v139**: su `khamakeymoments.com` la home `/` reindirizza a `moments.html` (niente signup Business); copy signup chiarisce codice Moments |
| 2026-07-19 | Cursor | **Moments v140 / Business app v167 / SQL v159**: account Moments non finiscono più nel flusso Business; emailRedirect → moments.html; peek codice in signup; auto-attivazione pending; drop overload activate_moment_code |
| 2026-07-20 | Cursor | **Moments v142 / Worker v141**: rimosso selettore «Icone e adesivi» (pageDecor); pagine pubbliche senza decor emoji |
| 2026-07-20 | Cursor | **Moments v143 / Worker v142**: palette colori rinfrescate (meno grigi morti, accenti saturi); variante Caldo = sfondo caldo non blocco scuro |
| 2026-07-20 | Cursor | **Moments v144**: galleria — pulsanti visibili **Cambia foto** e **Rimuovi** per sostituire/cancellare immagini (titolo/desc preservati al replace) |
| 2026-07-20 | Cursor | **Moments v145 / Worker v143**: RSVP — WhatsApp obbligatorio (avviso editor + blocco salva); senza numero la sezione non compare in pagina |
| 2026-07-20 | Cursor | **Moments v146**: rimossa foto profilo tonda dalla sezione Copertina (controllo inutilizzato) |
| 2026-07-20 | Cursor | **Admin v164 / Moments v147 / Worker v144**: Supporto — dettaglio ticket leggibile + email avviso staff su nuovo ticket Moments |
| 2026-07-20 | Cursor | **Admin v165**: su `khamakeymoments.com` `/admin` reindirizza a `moments-admin` (fix path senza .html) |
| 2026-07-20 | Cursor | **Audit SE basi + SSOT**: versioni PROJECT_STATE/CODEX-COLLAB allineate al codice (Admin 165 / Moments 147 / Worker 144); lock stale rilasciati; **zero cambio runtime** |
| 2026-07-20 | Cursor | **Ops checklist secrets/Auth**: `docs/22` da `/health` live (Resend+Shopify OK; Stripe off; leaked-password WARN) — solo doc, zero deploy |
| 2026-07-20 | Cursor | **WIP hygiene**: commit Moments assets/SQL v156–v159 + docs vault + Business editor/SQL v147–v148 in git; demo landing e .obsidian lasciati fuori; **no deploy** |
| 2026-07-20 | Cursor | **Moments v148**: sezioni da «Altre sezioni» si possono di nuovo spegnere/togliere dal menu (unpin + nav solo se enabled) — solo editor, no Worker |
| 2026-07-20 | Cursor | **Moments v149**: fix Salva bloccato in silenzio — WhatsApp RSVP `required` solo con RSVP attivo |
| 2026-07-20 | Cursor | **Moments v150**: Salva sempre eseguibile (`novalidate`) + messaggio se RSVP attivo senza WhatsApp |
| 2026-07-20 | Cursor | **Moments v151**: WhatsApp RSVP non blocca più il salvataggio (solo avviso); Salva via click diretto |
| 2026-07-20 | Cursor | **Moments v152**: senza WhatsApp → RSVP auto-off al Salva (più semplice, zero blocco) |
| 2026-07-20 | Cursor | **Moments v153**: applica brand Moments ufficiale (logo wordmark + palette rosa/blu notte) a editor/auth |
| 2026-07-20 | Cursor | **Moments v156**: wordmark PNG trasparente (niente riquadro nero), rimossi doppi “Moments”, boot on-light |
| 2026-07-20 | Cursor | **Moments v157**: menu avatar = account (profilo, prodotti attivi, slot piano); via Apri/Condividi/Copia |
| 2026-07-20 | Cursor | **Moments v158**: account hub separato (profilo/prodotti/piano/assistenza); editor solo pagina |
| 2026-07-20 | Cursor | **Moments v159**: fix mobile — stop scroll nel vuoto rosa, menu fisso in basso |
| 2026-07-20 | Cursor | **Moments v160 / Worker v145**: palette colori più sature e swatch go→g2 |
| 2026-07-20 | Cursor | **Moments v161 / Worker v146**: cerchi = colore di sfondo pagina (nero→scuro) |
| 2026-07-20 | Cursor | **Moments v162 / Worker v147**: 12 sfondi densi distinti + rosso vero; card con testo nero leggibile |
| 2026-07-20 | Cursor | **Moments v163 / Worker v148**: zoom copertina slider 100–200% sul punto di fuoco |
| 2026-07-20 | Cursor | **Moments v164 / Worker v149**: galleria con foto grandi, descrizioni visibili, lightbox |
