# Changelog — KhamaKey

Storico modifiche significative. Per dettaglio release per versione vedi [`changelog/`](changelog/).

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.0.0/).

---

## [Unreleased]

### Fixed
- **Moments v195 — Safari auto-translate (2026-07-23, Cursor)** — Pages
  - Non era il dizionario IT: Safari traduceva la pagina (`IT`→`esso`, `Pubblica`→`Pubblicità`, `Anteprima`→`Aprile`).
  - `html translate="no"` + `notranslate` + meta Google; lingua resta solo dal toggle KhamaKey.
- **Moments v193 — Salva tagliato + pausa i18n (2026-07-23, Cursor)** — Pages
  - CSS: `Salva` / `Salvato` / Annulla non si comprimono più (`flex-shrink:0`, `nowrap`, min-width).
  - Espansione EN (6b/sezioni) in pausa; resta toggle + auth/shell già fatti; default IT.
- **Moments v191 — Boot bloccato da i18n (2026-07-23, Cursor)** — Pages
  - `syncLangSwitchers` leggeva `appView` in TDZ → ReferenceError → schermo “Apertura in corso…” infinito.
  - Init lingua spostata dopo le variabili; login di nuovo funzionante.

### Added
- **Moments v203 — i18n look taxonomy (2026-07-23, Cursor)** — Pages
  - Nomi/hint look (`PAGE_LOOKS`) + tooltip palette EN; KhamaKey/Pop invariati.
- **Moments v202 — i18n fields Step 11d (2026-07-23, Cursor)** — Pages
  - Chrome comune sezioni: Visibile/Non visibile, Titolo sezione, guide fill, Contenuto/Citazione/…, Altre sezioni.
  - Kit dedicati (WhatsApp RSVP, music, pet, list/journey UI) restano IT → 11e.
- **Moments v201 — i18n fields Step 11c (2026-07-23, Cursor)** — Pages
  - Colori / Contatore / Ordine: label, select, hint EN; nomi look taxonomy ancora IT.
- **Moments v200 — i18n fields Step 11b (2026-07-23, Cursor)** — Pages
  - Solo pannello Pubblica: stato, PIN, email anniversario EN.
- **Moments v199 — i18n fields Step 11a (2026-07-23, Cursor)** — Pages
  - Solo pannello Copertina: titoli/hint/bottoni/placeholder EN (`moments-i18n-fields.js` + `data-lf`).
  - Piano slice: `docs/29-moments-i18n-fields-plan.md` (11b Pubblica, 11c Colori…).
- **Worker v183 — Moments `/m/` i18n Step 9 (2026-07-23, Cursor)** — Worker
  - Chrome pubblica IT/EN: PIN, footer, privacy notice, lightbox, contatore, RSVP/guestbook form, hint gallery/video.
  - Locale: `?lang=en|it` oppure `Accept-Language` visitatore; default IT. Non usa `uiLocale` editor.
  - `Vary: Accept-Language` sulle risposte `/m/`.
- **Docs — i18n Moments Step 8 smoke (2026-07-23, Cursor)** — Docs
  - `docs/28-moments-i18n-smoke.md`: A+B verificati live; C da slice 6–7.
- **Moments v198 — i18n sections Step 7c (2026-07-23, Cursor)** — Pages
  - `SECTION_SUBTITLE_EN`: sottotitoli header pannello (`.section-sub`) + extras; refresh al toggle lingua.
  - Campi form / hint ancora IT; Worker `/m/` invariato.
- **Moments v197 — i18n sections Step 7b (2026-07-23, Cursor)** — Pages
  - `moments-i18n-sections.js`: mappa frasi IT→EN per etichette nav/sidebar/ordine (Memoria, Ricordo, …).
  - Sottotitoli e campi dentro i pannelli ancora IT.
- **Moments v196 — i18n nav Step 7a (2026-07-23, Cursor)** — Pages
  - `moments-i18n-nav.js`: Copertina/Colori/Contenuti/Pubblica, gruppi Design/Pagina, Riepilogo, Altre sezioni.
  - Taxonomy sezioni (In memoria, …) e campi pannello ancora IT (7b).
- **Moments v194 — i18n save Step 6b (2026-07-23, Cursor)** — Pages
  - `moments-i18n-save.js`: Pagina salvata / Salvataggio… / errori / reminder «clicca Salva».
  - Nessun tocco a sezioni editor, attivazione, Worker `/m/`.
- **Moments v192 — i18n shell Step 6a (2026-07-23, Cursor)** — Pages
  - `moments-i18n-shell.js`: Salva / Annulla / Anteprima / Modifica / status topbar / Copia link / Condividi / Apri pagina / pill Pubblicata|Bozza|PIN.
  - Nessun tocco a attivazione codici, Worker `/m/`, sezioni editor, toast salvataggio (6b).
- **Moments v190 — i18n auth/account Step 5 (2026-07-23, Cursor)** — Pages
  - Dizionario `moments-i18n-auth.js` + `data-i18n` su login/signup/account/attivazione.
  - Messaggi runtime (errori, ticket, PIN banner) via `t()`; shell editor ancora IT.
- **Moments v188 — i18n toggle Step 4 (2026-07-23, Cursor)** — Pages
  - Selettore IT/EN in login, topbar e menu account; salva `khamakey.moments.uiLocale`.
  - Stringhe chrome ancora IT (traduzione massiva = step 5–7); label Lingua/Language già i18n.
- **Moments v187 — i18n infra Step 3 (2026-07-23, Cursor)** — Pages
  - Nuovo `moments-i18n.js`: `t` / `getUiLocale` / `setUiLocale` / `applyChromeI18n`; seed IT+EN minimo.
  - Boot applica solo `<html lang>` da `localStorage` (default it). Nessun toggle; stringhe UI ancora IT.
- **Docs — i18n Moments regole Step 2 (2026-07-23, Cursor)** — Docs only
  - ADR-007 + `docs/27-moments-i18n-rules.md`: default IT, preferenza `khamakey.moments.uiLocale`, solo click esplicito, no i18n Business. Zero runtime.
- **Docs — i18n Moments inventario Step 1 (2026-07-23, Cursor)** — Docs only
  - `docs/26-moments-i18n-inventory.md`: mappa file, auth/shell/sezioni/errori, stime ~420–520 chrome; template e legale differiti. Zero runtime.
- **Admin v178 / SQL v167 — Reset pezzo reso Amazon (2026-07-22, Cursor)** — Pages + SQL
  - Officina: su codice `claimed`, azione «Reset pezzo per rivendita» (digita `RESET` + confirm).
  - RPC `admin_reset_moment_unit_for_resale`: cancella evento/pagina, scollega account, nuovo codice attivazione; **stesso `public_slug`** (chip NFC invariato).
  - Log `moment_unit_reset_log` (solo staff). Nessun cambio Worker / editor pubblico.

### Fixed
- **Moments v186 / Worker v182 — Descrizione breve in hero (2026-07-22, Cursor)** — Pages + Worker
  - Hero pubblico: frase sotto titolo + descrizione breve (prima la frase nascondeva la descrizione).
  - Editor: campo form `page_description` per salvataggio più sicuro.
- **Worker v181 — Oroscopo snack coerente (2026-07-22, Cursor)** — Worker
  - Solo frasi intere e leggibili; niente strip mid-sentence che produceva pezzi tipo «Il che…».
  - Cache `daily-paper/v8` / `giornale-v8`.
- **Worker v180 — Oroscopo snack pulito (2026-07-22, Cursor)** — Worker
  - Distill AstroWay in 2–3 frasi da giornale; rifiuta aperture AI (“giornata odierna”, aspetti/transiti, date lunghe).
  - Cache `daily-paper/v7` / formato `giornale-v7`; probe espone `worker_version`.
- **Worker v172 — Oroscopo stile giornale (2026-07-22, Cursor)** — Worker
  - Daily AstroWay riscritto in 2–3 frasi familiari da quotidiano (amore/lavoro/energia), senza gergo planetario.
- **Worker v171 — Oroscopo breve (2026-07-22, Cursor)** — Worker
  - Testo AstroWay compresso a un paragrafo (~420 caratteri), senza sezioni markdown lunghe.
- **Worker v170 — Oroscopo leggibile + anteprima video (2026-07-22, Cursor)** — Worker
  - Testo oroscopo su font UI (DM Sans), non più display/corsivo.
  - Video in galleria: fill del frame, `#t=` per poster Safari, badge Video.
- **Moments v185 / Worker v169 — Oroscopo: Aggiungi persona + fetch (2026-07-22, Cursor)** — Pages + Worker
  - Editor: le nuove persone senza segno non vengono più scartate (tasto «Aggiungi» ripristinato).
  - Worker: parse risposta AstroWay più robusto, fallback lingua `it`→`en`, probe `GET /api/moment/horoscope-probe`.

### Added
- **Moments v184 / Worker v168 — Oroscopo multi-persona (2026-07-22, Cursor)** — Pages + Worker
  - Sezione opzionale `horoscope`: fino a 5 persone (nome facoltativo + segno) fissate in editor.
  - Worker chiama AstroWay `POST /v1/horoscope/daily` (lingua `it`) con secret `ASTROWAY_API_KEY`; cache Cache API per segno/data (Europe/Rome).
  - Bundle 2–5 persone: una card per persona sulla pagina pubblica `/m/`.
- **Moments v175 / Worker v161 — Privacy + Termini Moments (2026-07-21, Cursor)** — Pages + Worker
  - Pagine `moments-privacy.html` / `moments-terms.html` + CSS legale.
  - Link su auth, consenso signup, account hub; footer/notice su `/m/`, PIN gate e pagina attivazione.
  - Notice pubblica: solo misure tecniche (visitor hash server-side), nessun cookie marketing; dismiss in `localStorage`.
- **Moments v174 / Worker v160 — Scroll laterale tappe opt-in (2026-07-21, Cursor)** — Pages + Worker
  - Switch in sezione Tappe: default lista verticale invariata; se attivo, stesso scroll orizzontale della galleria (`scroll_layout`).
- **Moments/Admin v173 / Worker v159 / SQL v161 — Piani Free/Plus/Pro (2026-07-21, Cursor)** — Pages + Worker + SQL
  - `moment_events.plan_key`, `moment_media_usage`, seed `moments_free|plus|pro` con prezzi e `limits` jsonb.
  - RPC `get_moment_entitlements`, `record_moment_media_bytes`, `apply_moment_plan`.
  - Editor: barra storage, limiti dinamici; video/musica multi; lettera + PDF; CTA upgrade stub.
  - Worker: PDF su R2, quota storage, video/lettera a scroll come galleria.
  - Admin: edit `limits`, override piano su drawer cliente Moments.
- **Moments v165 / Worker v155 — Sfumatura hero on/off (2026-07-20, Cursor)** — Pages + Worker
  - Toggle Design «Sfumatura sotto la foto»: on = fade nel colore sfondo pagina (`bl`); off = taglio netto. Default on (pagine esistenti invariate).

### Changed
- **Moments v180 — Chrome editor unisex (2026-07-21, Cursor)** — Pages
  - Stessa palette ufficiale Moments; base Blu Notte/Avorio; rosa solo CTA/focus/accenti.
- **Moments v179 / Worker v167 — Libro ospiti escluso (2026-07-21, Cursor)** — Pages + Worker
  - Sezione guestbook fuori da menu editor, template e «Altre sezioni».
  - Pagina pubblica: sezione non renderizzata; API guestbook resta disabilitata.
  - Codice/SQL restano in repo per eventuale riarmo futuro.
- **Admin v177 — PDF etichette: testo “a cosa serve” (2026-07-21, Cursor)** — Pages
  - Ovale inserto: «Per attivare la pagina» + codice + «Inseriscilo nell'app Moments».
  - Barcode: solo barcode (niente codice attivazione nello stesso riquadro).
  - Link NFC resta URL completo.
- **Admin v176 — PDF etichette Cricut (2026-07-21, Cursor)** — Pages
  - Link NFC = URL completo `https://link.khamakeymoments.com/m/<slug>` (copia-incolla sul chip).
  - Riquadro confezione: codice di attivazione + barcode (niente numero d’ordine nel rettangolo).
  - Sezioni PDF: panoramica · ovali · confezione · URL NFC.

### Fixed
- **SQL v166 + Worker v166 — Stabilità magazzino (2026-07-21, Cursor)** — SQL + Worker
  - Causa: v165 aveva revocato `USAGE` su schema `app_private` → `permission denied for function create_moment_product_batch`.
  - Ripristinato `GRANT USAGE` a `authenticated`/`service_role`.
  - Guestbook pubblico **oscurato** (`MOMENT_GUESTBOOK_PUBLIC_ENABLED=false`) finché non riattivato in sicurezza.
- **Moments v177 / Worker v165 / SQL v165 — Guestbook + WhatsApp RSVP (2026-07-21, Cursor)** — Pages + Worker + SQL
  - Guestbook: store `app_private.khamakey_secrets` per chiave ingest (GUC `ALTER DATABASE` non disponibile via MCP); allineata a Worker `WEBHOOK_INGEST_KEY`.
  - WhatsApp RSVP: lettura dal DOM live al salvataggio (non solo FormData).
  - Contrasto card guestbook/RSVP più netto; PIN pubblico in `sessionStorage`.
- **Worker v164 — Guestbook anteprima (2026-07-21, Cursor)** — Worker
  - Fetch guestbook/RSVP verso `WORKER_PUBLIC_BASE` assoluto (l’iframe `srcdoc` rompeva URL relativi → errore Safari «pattern»).
  - Card `.moment-guestbook` più definita (bordo/sfondo); form interno senza doppio riquadro.
### Changed
- **Admin v175 / Worker v163 — Resend Moments domain (2026-07-21, Cursor)** — Pages + Worker
  - Default From `info@khamakeymoments.com`; avviso nuovo ticket anche a `khamakeymoments@gmail.com`.
  - Richiede secret live `RESEND_FROM_EMAIL` aggiornato (niente più `@khamakey.com`).
- **Admin v174 / Worker v162 — Fix risposta ticket (2026-07-21, Cursor)** — Pages + Worker
  - Admin passa `to_email`; Worker non dipende da embed `profiles` (RLS); errori Resend restituiti allo staff.
- **Moments v176 — Ticket assistenza (2026-07-21, Cursor)** — Pages only
  - Messaggio post-invio: solo conferma utente («Ti risponderemo via email»), niente riferimenti a Officina/Admin.
- **Admin v172 / Worker v158 — Assegnazione ticket + risposta Resend (2026-07-21, Cursor)** — Pages + Worker
  - Select «Assegnato a», filtro *I miei*, Assegna a me; `POST /api/support/reply` invia email cliente e imposta attesa cliente.
- **Admin / Officina v171 — Clienti ↔ ticket ↔ editor (2026-07-21, Cursor)** — Pages only
  - Da Clienti: Oggetti / Editor / Ticket; da Supporto: Apri cliente / Editor / Vedi oggetti; da scheda oggetto: Vedi ticket.
- **Admin / Officina v170 — Supporto operativo (2026-07-21, Cursor)** — Pages only
  - Coda default «Da lavorare», KPI/chip cliccabili, età ticket, messaggio cliente vs note staff, mailto/copia email, link `/m/`, tabella a card su mobile.
- **Admin / Officina v169 — PDF etichette Cricut 4 sezioni (2026-07-20, Cursor)** — Pages only
  - Export PDF: panoramica di controllo + ovali codice + rettangoli barcode + rettangoli link NFC; contorno nero per taglio Cricut Explore 4.

### Fixed
- **Worker v157 — Contrasto menu sezioni pubblico (2026-07-20, Cursor)** — Worker only
  - Foglio menu sempre bianco con testo `#0F172A` (non più `ink` del tema chiaro-su-chiaro).
- **Admin / Officina v168 — Modifica magazzino (2026-07-20, Cursor)** — Pages only
  - `renderAgentOptions` non crasha più su moments-admin (select Business assenti); drawer codice si apre; lista magazzino a card su smartphone.

### Changed
- **Admin / Officina v167 — Mobile UX (2026-07-20, Cursor)** — Pages only
  - Menu laterale off-canvas, topbar sticky, pulsanti/filtri touch, tabelle scrollabili, drawer a foglio dal basso su smartphone.

### Fixed
- **Moments Admin v166 / Worker v156 / SQL v160 — Codice attivazione non più pubblico via NFC (2026-07-20, Cursor)** — Pages + Worker + SQL
  - Pagina pre-attivazione brand Moments **senza** codice; slug opaco ≠ codice; chip = `/m/slug`; codice solo CSV/PDF inserto; `/k/codice` non risolve pezzi available.
- **Worker v154 — Contrasto footer Moments (2026-07-20, Cursor)** — Worker only
  - Testo footer usa `ink` del tema (opacità alta + peso 600), leggibile su sfondi densi.
- **Worker v153 — Galleria non allarga più la pagina (2026-07-20, Cursor)** — Worker only
  - Overflow contenuto sulla pagina; lo scroll laterale resta solo dentro la galleria; testi descrizione neri leggibili.
- **Worker v152 — Scroll touch galleria mobile (2026-07-20, Cursor)** — Worker only
  - Swipe laterale funziona di nuovo su iPhone; tap/＋ apre lightbox solo se non stavi scorrendo; overflow pagina non blocca più lo scroll.

### Changed
- **Worker v150 — Galleria scroll laterale (2026-07-20, Cursor)** — Worker only
  - Galleria a scorrimento orizzontale (meno spazio verticale); descrizioni con contrasto cardInk, senza bold; lightbox ＋ invariato.
- **Moments v164 / Worker v149 — Galleria foto leggibile (2026-07-20, Cursor)** — Pages + Worker
  - Foto più grandi, titolo+descrizione sotto ciascuna, tap per lightbox a schermo intero (fix overflow che tagliava i testi).
- **Moments v163 / Worker v148 — Zoom copertina migliorato (2026-07-20, Cursor)** — Pages + Worker
  - Slider continuo 100–200% (step 5); zoom sul punto di fuoco toccato; pagina pubblica allineata fino a 200%.
- **Moments v162 / Worker v147 — Sfondi densi + rosso + contrasto card (2026-07-20, Cursor)** — Pages + Worker
  - 12 colori distinti (incluso rosso `#DC2626`); il cerchio è lo sfondo pieno; anteprima mostra `bl` non solo accenti; testo sulle card sempre nero (`cardInk`).
- **Moments v161 / Worker v146 — Cerchi = sfondo pagina (2026-07-20, Cursor)** — Pages + Worker
  - I cerchi mostrano e applicano lo **sfondo** (nero/antracite → pagina scura); non solo gli accenti.
- **Moments v160 / Worker v145 — Palette più decise (2026-07-20, Cursor)** — Pages + Worker
  - Cerchi tonalità: gradiente saturo (vivo→scuro) invece di vivo→pastello; accenti hero più forti anche in pagina pubblica.

### Fixed
- **Moments v159 — Scroll mobile nel vuoto rosa (2026-07-20, Cursor)** — Pages only
  - Su cellulare lo scroll resta nel pannello editor; menu in basso sempre visibile; niente pagina rosa vuota sotto.

### Changed
- **Moments v158 — Account hub separato dall’editor (2026-07-20, Cursor)** — Pages only
  - Schermata Account (profilo, prodotti NFC, piano, assistenza) fuori dall’editor; tab editor «Account» → «Pagina» (Riepilogo + Pubblica).
- **Moments v157 — Menu account cliente (2026-07-20, Cursor)** — Pages only
  - Dropdown avatar: nome, email, prodotti NFC attivi, slot «Moments Free / piani in arrivo», Gestisci account, Assistenza, Esci.
  - Rimossi Apri/Condividi/Copia dal menu (restano nella barra editor della pagina).
- **Moments v156 — Logo senza rettangolo / senza doppio Moments (2026-07-20, Cursor)** — Pages only
  - Wordmark PNG con nero → trasparente; topbar/auth senza titolo “Moments” duplicato; boot usa variante on-light.
- **Moments v153 — Brand ufficiale logo + palette (2026-07-20, Cursor)** — Pages + vault
  - Wordmark Moments in auth/topbar; CSS tokens Rosa Ricordo / Blu Notte / Rosa Luce / Avorio.
  - Style guide e asset in `KHAMAKEY_OS/assets/brand/`. Solo chrome editor — nessuna logica.

### Fixed
- **Moments v152 — RSVP auto-off senza WhatsApp (2026-07-20, Cursor)** — Pages only
  - Al Salva, se RSVP è attivo ma manca WhatsApp: switch OFF, sezione fuori dal menu, salvataggio ok + messaggio chiaro.
- **Moments v151 — WhatsApp non blocca più Salva (2026-07-20, Cursor)** — Pages only
  - Mancanza WhatsApp = avviso (banner/UI); il salvataggio procede sempre. RSVP senza WA resta nascosto in pagina pubblica.
  - Pulsanti Salva chiamano direttamente `saveMoment` (niente blocco HTML).
- **Moments v150 — Salva non faceva nulla (2026-07-20, Cursor)** — Pages only
  - Con RSVP attivo e WhatsApp vuoto (caso reale in prod) il browser bloccava il submit su campo nascosto, senza feedback.
  - Form `novalidate`; validazione WhatsApp solo in JS con messaggio sul banner/topbar; click Salva esplicito.
- **Moments v149 — Salva bloccato dopo aver spento sezioni (2026-07-20, Cursor)** — Pages only
  - Campo WhatsApp RSVP aveva `required` HTML anche con RSVP spento → il browser bloccava submit senza messaggio.
  - `required` / avviso solo se RSVP è «Visibile in pagina»; validazione JS al salva resta se RSVP attivo.
- **Moments v148 — Togliere sezioni aggiunte (2026-07-20, Cursor)** — Pages only
  - Bug: sezioni da «Altre sezioni» restavano pinnate in menu anche dopo «Non visibile».
  - Fix: nav optional solo se `enabled`; allo spegnimento si rimuove il pin. Torna in Altre sezioni. Nessun cambio Worker/SQL.

### Changed
- **Ops checklist secrets/Auth (2026-07-20, Cursor)** — solo documentazione
  - Nuovo `docs/22-ops-secrets-auth-checklist.md` da health live Worker v144 (Resend/Shopify active; Stripe off).
  - Guida Stripe: webhook URL → `link.khamakeymoments.com`. Zero deploy / zero secret in git.
- **SSOT versioni / lock multi-agente (2026-07-20, Cursor)** — solo documentazione
  - `PROJECT_STATE.md` e `CODEX-COLLAB.md` riallineati al codice live (Admin/Officina v165, Moments v147, Worker v144-support-notify, SQL ≥ v159).
  - Lock stale (Antigravity worker, Claude admin, Moments July) rilasciati → **libero**.
  - Nessuna modifica a `pages/`, `worker/`, `sql/` runtime.

### Fixed
- **Moments v144 — Galleria rimuovi/sostituisci (2026-07-20, Cursor)** — Pages
  - Ogni foto in editor mostra azioni chiare **Cambia foto** e **Rimuovi**; replace mantiene titolo/descrizione e cancella il vecchio file R2.
- **Moments fluido v138 / Worker v140 (2026-07-18, Cursor)** — deployato
  - Anteprima: debounce 700ms + skip se stato invariato; rate limit Worker 45/min per IP.
  - Lista pagine senza `page_state` (caricato solo per la pagina aperta).
  - Salvataggio soft: niente reload completo dell'editor.
- **Support ticket clienti bloccati (2026-07-18, Cursor)** — SQL v158 + deploy
  - CHECK `platform_support_tickets.source` non accettava `moments_editor` / `business_editor` → 0 ticket in produzione.
  - Feedback Business se sessione/business assente; console Moments filtra ticket Moments.

### Added
- **Domini custom khamakeymoments.com (2026-07-18, Cursor)** — deployato
  - Pages: `https://app.khamakeymoments.com` · Worker NFC: `https://link.khamakeymoments.com`
  - Aggiornati `config.js`, `wrangler.toml`, CSP `_headers` + Worker, fallback URL in `worker.js`.
  - Cache-bust Moments v136 / Business shell v165 / Worker v139.
- **Moments v135 / SQL v157 — Categoria bloccata al codice NFC (2026-07-17, Cursor)** — deployato + migration applicata
  - Tipo pagina da `product_type` del codice magazzino; badge read-only in editor (dropdown solo con `?admin_event=`).
  - RPC `peek_moment_activation_code`; `activate_moment_code` e `save_my_moment_page` non accettano cambio categoria utente; batch magazzino accetta categorie v59.
  - Prima apertura: auto-applica template della categoria. Cache-bust: `moments.html` / `moments.js` / `moments.css` `?v=135`.
- **Admin v148 — Magazzino NFC Business (2026-07-15, Cursor)** — deployato
  - Nuova tab `Magazzino NFC Business`: generazione lotti (`create_business_product_batch`), KPI stock, filtri, export CSV, drawer modifica codice.
  - Tab Clienti Business arricchita: email, codice NFC, slug, Analytics; drawer con URL NFC; form provisioning `admin_provision_business_customer`.
  - SQL v148 applicata: colonne SKU/linea/canale/agente/ordine su `business_activation_codes`, RLS inventory, RPC batch/stats/bulk/provision.
  - Cache-bust Admin: `admin.js?v=148`, `admin.html?v=148`.
  - Doc vault: `docs/20-business-activation-inventory-v147-v148.md`.
- **Business Editor v147 — Attivazione codice prodotto (2026-07-15, Cursor)** — deployato
  - Flusso parità Moments: signup 2-step (codice → account), login con codice opzionale, form attivazione per utenti loggati senza business, `?code=` URL prefill.
  - RPC `activate_business_code`; tabella `business_activation_codes` (SQL v147); seed da `nfc_tags` esistenti.
  - `ensureWorkspace` non auto-crea business senza codice (account pre-v147 grandfathered).
  - Save bar navy ripristinata; fix race snapshot/idratazione editor.
  - Cache-bust: `app.js?v=147`, `editor.html?v=147`.

### Fixed
- **Business Editor v124 — Fix upload da audit (2026-07-15, Claude Code)** — preparato
  - Video presentazione ora caricato davvero su R2 (prima restava `blob:` locale: perso al reload, link rotto nello snapshot pubblico). Limite client allineato al server: 25 MB (era 200 MB) + max 2 minuti.
  - `collectState`/`applyState` persistono e ripristinano l'URL video cloud.
  - Pulizia R2: sostituzione/rimozione di logo, copertina, chi siamo, foto galleria, immagini catalogo (anche eliminazione voce/sezione/catalogo) e video cancellano il vecchio file dal bucket (prima orfano). Solo URL `/cdn/`, legacy Supabase Storage intatti.
  - Cache-bust: `editor-media.js?v=124`, `app.js?v=138`, iframe `editor.html?v=138`.
  - Pendenti (bloccati dal lock `worker.js`): PDF catalogo e Welcome book/Documenti base64→R2 — dettaglio in `docs/03-editor.md`.

### Added
- **Admin v133 — Console Spedizioni NFC operativa (2026-07-15, Codex)** — preparato
  - Trasformata la tab `Spedizioni NFC` da rimando a console operativa.
  - Aggiunti KPI pipeline: da produrre, da stampare, da spedire, spedite e problemi.
  - La tabella unisce ordini NFC e codici `moment_activation_codes` assegnati, con ricerca per ordine, cliente, email e codice.
  - Aggiunte azioni: gestisci ordine, assegna codici, apri stampa/magazzino e avanza stato ordine.
  - Aggiornati cache-bust Admin: `admin.css?v=126`, `admin.js?v=133`.
- **Business Editor v123 — Idratazione editor e link finale dopo reload (2026-07-15, Codex)** — preparato
  - Aggiunto handshake `editor-ready` / `editor-hydrated` tra `app.js` ed editor iframe.
  - Il parent non accetta snapshot/salvataggi iniziali finche' l'editor non ha ricevuto lo stato cloud.
  - Risolve il caso in cui dopo refresh l'editor mostrava dati vuoti e `Collegamento in preparazione...` pur avendo una pagina `/p/` disponibile.
  - Aggiornati cache-bust: `app.js?v=137`, iframe `editor.html?v=137`.
- **Business Editor v122 — Naming Multilingua (2026-07-15, Codex)** — preparato
  - Sostituito il vecchio naming visibile con "Multilingua" nell'editor Business.
  - Lo switch mostra `Multilingua disattivo`, `Attivazione multilingua...` e `Multilingua attivo`.
  - Aggiornati cache-bust: `app.js?v=136`, iframe `editor.html?v=136`, `editor-international.js?v=122`.
- **Business Editor v121 — Link finale e UX comandi pulita (2026-07-15, Codex)** — preparato
  - Rimossi i comandi ridondanti dalla topbar interna dell'editor: l'Anteprima resta nella shell principale.
  - Il controllo multilingua diventa uno switch chiaro nella card dedicata, con stato attivo/disattivo leggibile.
  - `app.js` normalizza lo slug e crea/aggiorna sempre la pagina pubblica `/p/<slug>` con upsert idempotente.
  - La sezione link mostra `Pagina finale` o `Link NFC` in base a cio' che esiste, evitando "Collegamento in preparazione" quando la pagina pubblica e' disponibile.
  - Aggiornati cache-bust: `app.js?v=135`, iframe `editor.html?v=135`, `editor-international.js?v=121`.
- **Business Editor v120 — Ripristino operativo comandi principali (2026-07-14, Codex)** — preparato
  - Aggiunto tasto `Salva` sempre visibile nella topbar dell'editor Business.
  - `Copia link`, `Apri pagina finale` e `Scarica QR` usano la pagina pubblica `/p/` come fallback operativo quando il link NFC fisico non e' ancora assegnato.
  - Resi piu' robusti i listener di Account/Anteprima per evitare che un elemento mancante blocchi l'inizializzazione dei comandi.
  - Il pulsante multilingua ora comunica lo stato: attivazione in corso, 5 lingue attive, tooltip e aria-state.
  - Aggiornati cache-bust: `app.js?v=134`, iframe `editor.html?v=134`, `editor-international.js?v=120`.
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
