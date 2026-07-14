# Changelog — KhamaKey

Storico modifiche significative. Per dettaglio release per versione vedi [`changelog/`](changelog/).

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.0.0/).

---

## [Unreleased]

### Added
- **Admin v131 — Supporto + CRM piu' operativi (2026-07-14, Codex)** — preparato
  - Supporto: aggiunto riepilogo operativo con ticket aperti, urgenti, in attesa cliente e risolti da chiudere.
  - Supporto: aggiunte viste rapide per ticket urgenti e alta priorita', oltre agli stati gia' presenti.
  - CRM: aggiunte viste rapide per follow-up scaduti, oggi, settimana, priorita' alta e clienti da contattare.
  - Aggiornato il cache-bust Admin a `admin.js?v=131`.
- **Admin v130 — Dashboard operativa ordini/incassi (2026-07-14, Codex)** — preparato
  - La Dashboard Admin ora include un blocco "Andamento operativo" con KPI per ordini ricevuti negli ultimi 7 giorni, ordini da evadere, incassi stimati a 30 giorni e valore medio ordine.
  - Aggiunti mini-grafici senza librerie esterne: ordini ultimi 7 giorni, incassi stimati ultime 4 settimane e pipeline stato ordini.
  - Aggiornato il cache-bust Admin a `admin.js?v=130`.
- **Piano Admin Console Operativa (2026-07-14, Codex)** — preparato
  - Creato `docs/19-admin-console-operativa.md` con ricontrollo delle 19 sezioni Admin, definizione di "sezione operativa" e roadmap a blocchi da 1-2 sezioni per volta.
  - Confermato che il supporto e' attivo sia da Business editor sia da Moments editor; primo blocco consigliato: Supporto + CRM.
- **Admin v128 + Supporto operativo (2026-07-14, Codex)** — preparato/applicato
  - La tab Admin `Supporto` e' diventata console operativa: ricerca, filtri stato/priorita', viste rapide, gestione stato/priorita' ticket e nota interna sulla timeline cliente.
  - Business editor v118: tab `Assistenza` nel modal Account; il ticket viene salvato dal parent `pages/app.js` con `business_id`, `profile_id`, `source='business_editor'`.
  - Moments editor v114: voce menu `Assistenza` e form ticket nella scheda Account con `source='moments_editor'`.
  - SQL v89 applicata su Supabase: policy RLS additiva per consentire agli utenti autenticati di creare/leggere solo ticket propri, senza modificare le policy staff `support.read/write`.
- **Unificazione Sfondi Premium, Raccordi Hero e Template Moments (2026-07-13, Antigravity)** — deployato (Worker v127, Moments v113)
  - Creato il raccordo fondo copertina configurabile dall'editor (`heroCut`: dritto, divisore, arco, diagonale) con supporto retrocompatibile per le pagine esistenti.
  - Uniformati gli sfondi di tutti i 21 template di Moments in modo che sfumino da chiaro a scuro con bagliore radiale coordinato.
  - Creati gli stili premium specifici per le categorie: Famiglia & Genitori (`family`, `mom`, `dad`), Animali (`pet`), Ricordi (`memory`, `photo` - stile Polaroid), Cerimonie (`communion`, `baptism`), Amicizia & Portfolio (`friendship`, `portfolio`), Natale (`christmas`) ed Evento Generale (`free`).
  - Risolto definitivamente il problema del contrasto del testo nel footer `.moment-footer` su tutti i temi e sfondi tramite colore dinamico calcolato con `color-mix` sul colore di inchiostro e colore scuro del tema.
- **Audit Admin e piano miglioramento (2026-07-14, Codex)** — preparato
  - Creato `docs/18-admin-audit.md` con stato sezione per sezione, verifiche codice/Supabase/live, gap P0-P2 e piano dettagliato.
  - Evidenziate sezioni parziali: NFC/Spedizioni, Supporto, Billing, Partner/Provvigioni senza dati reali, sicurezza RPC da audit dedicato.
- **Protocollo collaborazione agenti rafforzato (2026-07-13, Codex)** — preparato
  - `00-START-HERE.md`, `AGENTS.md`, `CODEX-COLLAB.md` e `prompts/session-start.md` ora richiedono esplicitamente di dichiarare lavoro altrui, lock, file sporchi e stato push/deploy.
  - Creato `KHAMAKEY_OS/prompts/new-agent-brief.md` per istruire qualunque nuovo agente senza creare protocolli paralleli.
- **Admin v127 — Magazzino NFC Moments usabile per test e stock (2026-07-13, Codex)** — preparato
  - In `Magazzino NFC` aggiunto mini-form per creare modello/SKU direttamente dalla sezione stock, senza dover passare dal catalogo completo.
  - Il form `Genera nuovo stock` e' aperto di default e usa subito lo SKU creato/selezionato.
  - Aggiunti filtri per SKU/modello e data creazione, oltre a ricerca su codice, link NFC `/k/`, link pagina `/m/`, lotto e cliente.
- **Creative Engine Antigravity + stoccaggio asset marketing (2026-07-13, Codex)** — preparato
  - Importati nel vault gli asset Antigravity per Moments, Business e Love in `KHAMAKEY_OS/assets/marketing/`.
  - Creati manifest e protocollo operativo (`asset-manifest.md`, `docs/17-creative-engine-antigravity.md`) per rendere Antigravity il motore creativo condiviso.
  - `docs/12-marketing.md` ora usa percorsi relativi del vault e non link personali `file:///Users/...`.
- **Visual & Copy Content per KhamaKey "Love" & Business (2026-07-13, Antigravity)** — creato
  - Generati asset grafici promozionali in qualità fotografica premium per la linea Moments (portachiavi a cuore "Love" in noce e oro) e per la linea Business (tavolo ristorante con espositore NFC).
  - Creato il documento di vendita e copywriting [`16-sales-copy-love.md`](docs/16-sales-copy-love.md) nel vault, contenente testi persuasivi per e-commerce, landing page, inserzioni Facebook/TikTok, bullet points Amazon e script per video virali su TikTok/Reels.
  - Creato un catalogo centralizzato dei contenuti visivi in `marketing_assets_catalog.md` con le immagini incorporate e il copy integrato.
- **Admin v126 — Magazzino NFC Moments piu' operativo (2026-07-13, Codex)** — preparato
  - La generazione stock puo' partire da un modello/SKU del catalogo Moments: Admin compila linea oggetto, template e prefisso.
  - La tabella codici distingue link NFC fisico `/k/<codice>` e link attivazione/pagina `/m/<slug>`, aggiungendo data creazione e tracciabilita' canale/agente/ordine.
  - Corretto `momentNfcUrl()`: CSV/PDF etichette ora puntano al link NFC `/k/<codice>`, non al link pagina `/m/<slug>`.
- **Etichetta personalizzata contatore Moments (2026-07-13, Codex)** — preparato (Moments v112, Worker v126)
  - Il pannello Contatore ora salva `counter_label`, così l'utente può sostituire il testo pubblico fisso «Insieme da» con frasi personalizzate come «Ti sopporto da».
  - Il Worker usa l'etichetta salvata nella pagina pubblica e mantiene «Insieme da» come fallback per le pagine già esistenti.
- **Claim sicuro primo accesso rivenditori (2026-07-13, Codex)** — preparato (`reseller.js`, SQL v88)
  - Completa l'hardening v87 senza riaprire il fallback email: `claim_my_agent_profile()` collega l'utente autenticato solo a un profilo agente gia' creato dall'admin, attivo, con stessa email confermata e non gia' assegnato.
  - Il portale rivenditori chiama il claim prima di leggere `get_my_agent_profile`, poi continua a mostrare dati solo tramite `current_agent_id()`.
- **Portale self-service rivenditori (2026-07-13, Claude Code)** — deployato (`reseller.html`, SQL v86)
  - Nuova pagina `pages/reseller.{html,js,css}`: l'agente accede col proprio account e vede SOLO i propri dati — riepilogo guadagni (da incassare/approvate/pagate), tabella provvigioni, rete downline (fino a 3 livelli), consegne.
  - 4 RPC self-service (`get_my_agent_profile/commissions/network/deliveries`) che risolvono l'agente dall'auth lato server. Nessun id accettato dal client: impossibile vedere i dati di un altro rivenditore. Verificato: senza auth → vuoto.
  - **Hardening v87**: `current_agent_id()` non usa piu' fallback via email. Il portale mostra dati solo con collegamento esplicito `platform_agents.member_id -> platform_members.user_id`.
  - Completa la Fase 3b della roadmap. Nessuna tabella nuova. `worker.js` non toccato (Antigravity).
- **Gestione provvigioni nell'admin (2026-07-12, Claude Code)** — deployato (admin v125)
  - Complemento del trigger v85: le provvigioni `pending` generate sugli ordini ora sono gestibili nel pannello «Quanto spetta». Riepilogo (da pagare / approvate / pagate / voci), filtro per stato (default: da pagare), ricerca per agente/ordine, colonna Ordine e azioni per riga (Approva → Segna pagata → Annulla) con transizioni contestuali e update ottimistico + rollback.
  - Aggiornamento stato via update diretto (RLS `commissions.write` esistente, nessuna RPC nuova). Solo `pages/admin.*` — `worker.js` non toccato (lasciato ad Antigravity).
  - Verificato end-to-end a livello DB: ordine test 100€ → L1 10€ + L2 2€ (regole standard), idempotenza confermata, dati test rimossi.
- **Overhaul completo template Viaggi 2026 (2026-07-13, Antigravity)** — deployato (Worker v125)
  - **Struttura Travel Story Landing Page**: Ridisegnato il layout per simulare una moderna landing page dei ricordi personali. Hero cinematica a schermo intero (`80vh`) con grandi titoli in carattere Serif elegante.
  - **Sezioni Timeline a Capitoli**: Ogni tappa del viaggio è impaginata in modo ordinato come un capitolo editoriale spazioso, con foto panoramiche orizzontali ad alta definizione e ampi spazi bianchi per una leggibilità premium.
  - **Moduli Postcard per RSVP e Guestbook**: RSVP e Guestbook ricreati graficamente come cartoline postali vintage con uno sfondo lino, campi a righe sottili e un francobollo illustrato con timbro datato nell'angolo in alto a destra.
  - **Icone SVG e Sfondo Pastello**: Sfondo sfumato pastello desaturato e morbido unito ad icone outline vettoriali animate (bussola, fotocamera, cartolina) per i titoli delle sezioni. Rimosso ogni riferimento o menu in stile commerciale.
  - **Riprogettazione Palette Colore Globali**: Ridisegnati i codici esadecimali di tutte le 18 palette colore dell'editor in `pages/moment-themes.js` e `worker/worker.js` (es. terracotta, salvia, amore, corallo, miele, lavanda) sostituendo i colori HTML primari e saturi con tonalità polverose, eleganti e moderne per il 2026.
  - **Overhaul completo template Amore (Template 3 - Ethereal/Emotivo)**: Introdotto uno sfondo romantico sognante con sfocature e nuvole di colore fluttuanti (`radial-gradient`), card in vetro satinato (`backdrop-filter`) con ombreggiature coordinate e icone outline SVG a tema amore (cuori, anelli, dediche).
  - **Rimozione globale delle emoji mobili sullo sfondo**: Nascondiglio definitivo via CSS (`display: none!important`) delle emoji volanti (scintille, stelline, cuoricini) da tutte le pagine Moments per garantire un design pulito e professionale.

### Changed
- **Costo API OpenAI ridotto ~90% (2026-07-12, Claude Code)** — deployato (Worker v124)
  - **Batching (v123)**: le traduzioni facevano 1 chiamata OpenAI per lingua (4 per attivazione). Ora una sola chiamata batch per tutte le lingue.
  - **Incrementale (v124)**: `source_hash` (salvato ma mai riletto) ora viene confrontato → si ritraducono solo i campi nuovi o modificati; gli invariati riusano la traduzione già salvata. Se nulla è cambiato, **zero chiamate OpenAI**.
  - Combinati: da ~4×N_campi chiamate a 1 chiamata sui soli campi cambiati. Esempio (1 campo su 10 modificato): da 40 traduzioni a ~4.
  - Refactor: `persistBusinessTranslations` (delete+insert) → `buildIncrementalTranslations` + `upsertBusinessTranslationRows` (merge) + `enableBusinessI18nSettings`. Risposta espone `translatedFields`/`skippedFields`.
  - Nota: OpenAI **non configurato** in produzione (nessun costo oggi) — ottimizzazione pronta per l'attivazione. Rate limit 10/ora per attività già attivo.
  - Episodio: durante questa modifica un salvataggio concorrente su `worker.js` ha azzerato le modifiche non committate una volta → rifatte e committate subito. Conferma pratica della regola "commit immediato su file condivisi" in `CODEX-COLLAB.md`.

### Added
- **Provvigioni automatiche su ordini (2026-07-12, Claude Code)** — applicato su Supabase
  - La rete rivenditori (v68) e la distribuzione multilivello esistevano ma **nessun ordine generava provvigioni** (0 record in `platform_commission_events`): la funzione andava chiamata a mano e aveva un gate di permesso incompatibile col flusso ingest.
  - Ora un **trigger su `platform_orders`** (`sql/khamakey-order-commissions-v85.sql`) distribuisce automaticamente le provvigioni multilivello (L1/L2/L3) alla creazione dell'ordine o all'assegnazione di un agente. Copre ogni percorso (Shopify, Stripe, admin) con un solo hook, senza toccare `worker.js`.
  - **Idempotente** (`source_type='order'`, mai due volte lo stesso ordine) e **fail-safe** (un errore nelle provvigioni non blocca mai la creazione dell'ordine).
  - Testato con dati sintetici poi rimossi: ordine €100 tier standard → L1 10% (€10), L2 upline 2% (€2); ri-trigger non duplica. Il test ha scovato che `commission_amount` è colonna generata (`round(amount*commission_percent/100,2)`) — corretto prima del deploy.

### Added
- **CRM — pipeline clienti (2026-07-12, Claude Code)** — applicato + deployato
  - La sezione admin «CRM» era un segnaposto vuoto. Ora è un pannello funzionante: pipeline con stato onboarding, priorità, agente assegnato, follow-up datato, tag e timeline note per attività.
  - Costruito **sopra le tabelle esistenti** `platform_client_records`/`platform_client_notes` (nessuna tabella nuova, nessun dato toccato) via RPC in `sql/khamakey-crm-v84.sql`, protette da permessi `crm.read`/`crm.write`.
  - UI in `pages/admin.html` + `pages/admin.js` (modulo CRM) + `pages/admin.css`. Admin bumped a v122. Verificato: modulo carica senza errori console, tutti gli elementi wired.

### Fixed
- **Triage completo linter sicurezza Supabase, 6 problemi reali (2026-07-11/12, Claude Code)** — applicato
  - `get_moment_customer_stats`, `get_agent_delivery_history`, `get_agent_network_tree`, `get_moment_agent_inventory_stats`, `get_moment_product_inventory_stats`: nessun controllo permessi, `get_agent_delivery_history` perfino eseguibile da anon. `get_moment_customer_stats` esponeva email/attività di tutti i clienti. Aggiunto controllo `current_user_has_platform_permission`
  - Bucket Storage legacy `khamakey-media`: rimossa policy che permetteva di elencare tutti i file di tutte le aziende/eventi (download diretto via URL nota non toccato, verificato)
  - `get_order_activation_codes`, `resolve_agent_commission_percent`: nessun uso reale trovato, accesso revocato
  - `sql/khamakey-security-linter-fixes-v80-v83.sql`
- **IDOR confermato: `verifyBusinessOwner`/`verifyMediaScope` (2026-07-11, Claude Code)** — deployato
  - `businesses` ha una policy pubblica per righe `pubblicato = true`; i controlli applicativi nel Worker verificavano solo "la riga è visibile", non "è mia" — qualunque utente autenticato poteva far scattare traduzioni OpenAI a pagamento o caricare/cancellare media su un'attività di un altro cliente passando il suo `business_id`
  - Fix: filtro esplicito `profile_id=eq.<uid chiamante>` in entrambe le funzioni, fallback `verifyPlatformAdmin` per lo staff. Nessuna SQL necessaria (RLS di scrittura già corretta)
- **Incidente PIN Moments (2026-07-11, Claude Code)** — risolto in giornata, deployato e verificato
  - `get_public_moment` (v75) falliva con HTTP 500 su ogni evento Moments con PIN attivo per colonna `slug` ambigua tra output funzione e tabella `moment_pin_attempts`. Scoperto solo grazie a smoke test su un evento reale (non da `execute_sql` sintetico).
  - Fix: `sql/khamakey-pin-ambiguity-fix-v78.sql` (`#variable_conflict use_column`), applicato su Supabase e verificato via HTTP: pagina PIN-gated → 401 con form, nessun contenuto trapelato; RSVP → 404 corretto

### Added
- **Linee Guida Grafiche Moments (2026-07-12, Antigravity)**
  - Documentate le linee guida grafiche nel file di brand (`KHAMAKEY_OS/docs/01-brand.md`) ed inserito riferimento in `AGENTS.md` per l'allineamento degli agenti.

### Changed
- **Restyling Premium CSS Moments (2026-07-12, Antigravity)**
  - Aggiornata `momentPageCss` in `worker/worker.js` (Worker NFC v122) per implementare un design adattivo premium guidato sia dai parametri generali del tema che dalla categoria specifica dell'evento.
  - **Focalizzazione categoria Viaggi (Travel Scrapbook)**: Ridisegnate le tappe del viaggio in autentiche foto Polaroid con cornici asimmetriche, washi tape traslucido superiore, font calligrafico `'Caveat'` per le descrizioni, font da macchina da scrivere `'Special Elite'` per le date/luoghi, icone card ristilizzate come timbri circolari da passaporto e link mappa in stile "Boarding Pass" (biglietto d'imbarco) con fori di strappo e linea tratteggiata su sfondo a griglia vintage punteggiata.
  - Risolto il problema del Lightbox e delle frecce visibili sopra la Hero, assicurando che il contatore "Insieme da" sia visibile e formattato correttamente.
  - Migliorati gli spazi generali delle sezioni, incrementato il contrasto del testo a 0.96 per una leggibilità ottimale, e ottimizzate le icone (badge 3D con ombre) e gli elementi accessori (washi tape sulle polaroid, mappe in stile boarding pass, cornici dei player musicali e bottoni con effetto shine animato).

### Security
- **Follow-up Moments (2026-07-11, Codex)** — committato/deployato, vedi `PROJECT_STATE.md`
  - PIN Moments: lockout spostato da solo slug a slug + visitatore, per evitare blocchi globali della pagina evento
  - Link Moments protetti: dopo sblocco con PIN il Worker rimuove `?pin=` dalla barra indirizzi, così chip NFC e link condivisi non espongono il PIN
  - Worker: `get_public_moment` ora passa `p_visitor_key`; `/event` ha rate limit leggero per proteggere analytics pubblici
  - Worker CSP: permesso `public-page.css` da `khamakey-app.pages.dev` per evitare regressione sulle pagine Business pubbliche durante il deploy Worker
- **Audit + hardening (2026-07-11, Claude Code)** — committato/deployato, vedi `PROJECT_STATE.md`
  - SQL `khamakey-security-hardening-v75.sql`: `get_public_moment` non espone più `state`/titolo/indirizzo con PIN errato o assente (prima il PIN era solo un flag lato client); rate limit lockout sui tentativi PIN; RLS su `platform_webhook_events`; `business_page_i18n` pubblico ristretto alle aziende con i18n abilitato
  - SQL `khamakey-rate-limit-v76.sql`: `check_rate_limit()` generico, applicato a RSVP/guestbook/prenotazioni/upload media/traduzioni OpenAI
  - `apply-all.psql`: colmato gap v64→v73 mai incluse (tutte idempotenti, verificate una a una)
  - Worker: firma webhook Resend (Svix) e PayPal (verify-webhook-signature) verificata; confronto chiave cron a tempo costante
  - `pages/_headers` + pagine pubbliche Worker: aggiunta CSP, HSTS, header di sicurezza mancanti
- **Follow-up Moments (2026-07-11, Codex)** — committato/deployato, vedi `PROJECT_STATE.md`
  - PIN lockout spostato da solo slug a slug + visitatore (evita che un invitato blocchi la pagina a tutti)
  - Worker: `get_public_moment` passa `p_visitor_key`; rate limit leggero su `/event` (analytics pubblici)
  - CSP Worker: permesso `public-page.css` da `khamakey-app.pages.dev` — correggeva una regressione visiva introdotta dalla CSP di Claude Code, verificata e confermata corretta
- **Pulizia rate limit (2026-07-11, Claude Code)** — committato/deployato, vedi `PROJECT_STATE.md`
  - SQL `khamakey-rate-limit-cleanup-v77.sql`: `cleanup_rate_limit_tables()` rimuove le righe scadute da `moment_pin_attempts`/`platform_rate_limits`, agganciata al cron giornaliero già esistente (nessun trigger cron nuovo)

### Added
- **v110 Moments dashboard** — riepilogo organizzatore in editor (RSVP, guestbook, checklist)
- **v110 Letter unlock email** — notifica apertura lettera al futuro (cron + SQL v73)
- **v109 Moments anniversaries** — email promemoria annuale + toggle in Pubblica
  - SQL `khamakey-moments-guestbook-v71.sql`
  - Worker `GET/POST /api/moment/guestbook` + sezione pubblica
  - Editor — pannello approva/rifiuta messaggi
- **v107 Moments RSVP backend** — raccolta risposte strutturata
  - SQL `khamakey-moments-rsvp-v70.sql` — tabella + RPC `submit_moment_rsvp` / `list_my_moment_rsvp`
  - Worker `POST /api/moment/rsvp` — salvataggio ibrido (DB + WhatsApp)
  - Editor — pannello «Risposte ricevute» con riepilogo, tabella, export CSV
- **KhamaKey OS** — sistema operativo del progetto (`KHAMAKEY_OS/`)
  - `MASTER_INDEX.md` — punto di ingresso unico per tutte le AI
  - `PROJECT_STATE.md` — stato live del progetto
  - `AGENTS.md` + `CLAUDE.md` — regole condivise Cursor/Codex/Claude
  - `docs/00`–`15` — manuale ufficiale (migrazione graduale)
  - `decisions/`, `prompts/`, `changelog/`, `assets/`
  - Regole Cursor in `.cursor/rules/khamakey-os.mdc`

---

## [v106] — 2026-07-09

### Changed
- Admin UX: menu 4 intenti, modalità semplice, copy umano rete partner
- Guide contestuali (`admin-guide.js`)

---

## [v103] — 2026-07-09

### Added
- Email ordine con codici NFC post-checkout Shopify
- Stripe Checkout + webhook ingest
- Integration Hub (Stripe, PayPal, Resend)

---

## [v99] — 2026-07-09

### Added
- Catalogo vendita Moments + sync Shopify
- Webhook ordini Shopify
- `SHOPIFY-SETUP.md`

---

## [v68 SQL] — 2026-07-09

### Added
- Rete rivenditori: tier, listini, consegne, RPC

---

## [v41] — 2026-07-06

### Added
- Progetto consolidato da Pages v40 + Worker v22/v23
- URL centralizzati in `config.js`
- Git + GitHub (`kpfarm/khamakey-v41`)
