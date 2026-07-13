# KhamaKey — Stato del progetto

> **Leggi questo file per primo** in ogni sessione AI.  
> Ultimo aggiornamento: **2026-07-14** (Admin v128 console supporto + ticket utente)

---

## ✅ Security hardening deployato (2026-07-11)

Audit di sicurezza (Claude Code) + follow-up (Codex, Antigravity). Tutto committato su `main`, SQL v37→v79 applicata su Supabase (`cuxlwaocjqwzluycznyp`), Worker + Pages deployati. Verificato con smoke test su un evento reale, non solo assunto.

### ⚠️ Episodio CSP con agente concorrente (2026-07-11, risolto)

Mentre questo lavoro era in corso, un agente concorrente (Antigravity) ha allargato `img-src`/`media-src` a wildcard `https:` in `worker.js`/`pages/_headers` per far passare un errore di caricamento immagini, committando direttamente (`ebaa1aa`). Investigato invece di annullare alla cieca: query sui dati reali (`business_public_pages`, `moment_pages`) ha confermato che alcune pagine hanno foto caricate su Supabase Storage prima della migrazione a R2 — motivo legittimo. Fix corretto: aggiunto solo `cuxlwaocjqwzluycznyp.supabase.co` (dominio specifico, verificato, commentato nel codice), rimosso il wildcard. Deployato e verificato.

Da questo episodio: formalizzate in `CODEX-COLLAB.md` e `AGENTS.md` due **regole assolute** vincolanti per ogni agente presente e futuro — mai cancellare dati utente, mai indebolire un controllo di sicurezza esistente come effetto collaterale. Leggere prima di toccare `worker.js`, `sql/`, `pages/_headers`.

### 🔴 IDOR confermato e risolto: `verifyBusinessOwner`/`verifyMediaScope` (2026-07-11, Claude Code)

L'audit iniziale aveva segnalato questo come "da verificare" (non avevamo accesso a Supabase per controllare le RLS reali). Con l'accesso diretto, confermato **sfruttabile**: `businesses` ha una policy `select` pubblica per qualunque riga con `pubblicato = true` ("Pagine pubbliche B2B visibili a tutti"). `verifyBusinessOwner` e il ramo `scope=business` di `verifyMediaScope` (`worker/worker.js`) controllavano solo "la riga è visibile", non "è la mia riga" — quindi **qualunque utente autenticato poteva far scattare traduzioni OpenAI (costo reale) o caricare/cancellare media su un'attività pubblicata di un altro cliente**, semplicemente passando il suo `business_id`.

Fix: entrambe le funzioni ora filtrano esplicitamente `profile_id=eq.<uid del chiamante>` nella query, con fallback a `verifyPlatformAdmin` per lo staff. Nessuna modifica SQL necessaria (la RLS sulla scrittura era già corretta — il bug era solo nel controllo applicativo nel Worker). Deployato. **Non testato end-to-end con due account reali** (nessuna credenziale di test disponibile in sessione) — verificato a livello di query/RLS, consigliato un test manuale con due utenti veri se si vuole conferma completa.

### 🔴 Incidente in produzione, risolto in giornata

`get_public_moment` (v75, versione Codex) aveva un bug reale: colonna `slug` ambigua tra output della funzione e tabella `moment_pin_attempts` → **HTTP 500 su ogni pagina Moments con PIN attivo** (RSVP, guestbook, page view inclusi), dal momento in cui v75 è stata applicata stamattina fino alla scoperta via smoke test nel pomeriggio. Fix: `sql/khamakey-pin-ambiguity-fix-v78.sql` (`#variable_conflict use_column`), applicato e verificato — pagina PIN-gated ora risponde 401 con form PIN, nessun contenuto trapelato, RSVP risponde 404 corretto invece di 500. **Lezione**: da ora, ogni migrazione che tocca `get_public_moment` o simili va testata con uno slug reale prima di considerarla chiusa, non solo con `execute_sql` su input sintetici.

### Cosa contiene l'hardening (in ordine di severità)

- **`get_public_moment` non restituisce più `state`/titolo/indirizzo se il PIN è errato o assente** — prima li restituiva sempre, il PIN era solo un flag lato client. Nessun PIN esistente invalidato (stesso schema hash).
- Rate limit lockout su tentativi PIN Moments per slug + visitatore (20/15min), su RSVP/guestbook/prenotazioni (5/15min), upload media (30/h), analytics pubblici (120/15min), traduzioni OpenAI (10/h) — tutto via Postgres, zero infra nuova. Pulizia automatica giornaliera (v77) agganciata al cron esistente.
- RLS abilitata su `platform_webhook_events` (mancava); `business_page_i18n` pubblico ristretto alle sole aziende con i18n abilitato.
- Firma webhook verificata per Resend (Svix) e PayPal (verify-webhook-signature); confronto chiave cron reso a tempo costante.
- CSP + HSTS aggiunte sia su `pages/_headers` sia sulle pagine pubbliche renderizzate dal Worker (`html()`), verificate live via header HTTP reali dopo il deploy.

### ✅ Risolto: `platform_supported_locales` senza RLS

Trovato dall'advisory di sicurezza di Supabase (non da nessun audit precedente): la tabella lingue (it/en/fr/de/es) non aveva RLS attiva — chiunque con la anon key poteva leggere/scrivere senza restrizioni. Applicata `alter table ... enable row level security` + policy `select`/`all` per `authenticated` (stesso pattern già usato per `platform_integrations`). Verificato: l'advisory di sicurezza Supabase non segnala più questa tabella dopo il fix. Unico consumer noto è `pages/admin.js` (autenticato) — nessuna regressione attesa.

### ✅ Triage completo linter Supabase (78 avvisi) — 6 problemi reali trovati e risolti

Delle 78 segnalazioni, ~68 erano rumore atteso (funzioni SECURITY DEFINER pubbliche *per design* — `get_public_moment`, `submit_moment_rsvp`, ecc. — o già protette internamente con controllo permessi/ingest-key, verificato leggendo il codice di ognuna). Trovati **6 problemi reali**, tutti corretti in `sql/khamakey-security-linter-fixes-v80-v83.sql`:

- **`get_moment_customer_stats` — il più grave**: nessun controllo permessi, callable da qualunque utente autenticato (non solo staff). Esponeva **email e attività di tutti i clienti Moments**. Usata solo da `pages/admin.js`.
- **`get_agent_delivery_history`**: eseguibile perfino da **anon** (nessun login), senza controlli. Con l'argomento di default restituiva fino a 500 consegne di tutti gli agenti (prezzi, tracking, note).
- **`get_agent_network_tree`, `get_moment_agent_inventory_stats`, `get_moment_product_inventory_stats`**: stesso problema di `get_moment_customer_stats` — nessun controllo permessi, solo "autenticato" bastava.
- **Bucket Storage `khamakey-media` (legacy)**: policy che permetteva di **elencare tutti i file** di tutte le aziende/eventi. Rimossa — verificato che il download diretto via URL nota continua a funzionare (bucket pubblico, non passa da RLS), solo l'enumerazione è bloccata.
- **`get_order_activation_codes`, `resolve_agent_commission_percent`**: verificato che non sono chiamate da nessun file reale — accesso revocato del tutto, nessun uso perso.
- Più: `search_path` fissato su `_moment_type_valid` (hardening minore, nessun rischio pratico).

Tutti i fix aggiungono un controllo permessi (stesso pattern `current_user_has_platform_permission` già usato altrove) o revocano accesso a funzioni non usate — **nessuna funzionalità esistente per lo staff è stata toccata**, verificato testando che la funzione blocchi correttamente una chiamata senza permessi validi.

Restano innocue e verificate: `RLS Policy Always True` su `ritrovare_centro_leads` (form pubblico insert-only, nessuna lettura possibile — intenzionale), 6 tabelle "RLS enabled no policy" (`moment_pin_attempts`/`platform_rate_limits` di proposito, il resto è cruft legacy pre-v37 già completamente bloccato). Non ancora fatto: **"Leaked Password Protection Disabled"** — impostazione Auth da abilitare manualmente in Dashboard Supabase → Authentication → Policies (nessun tool disponibile per farlo via SQL/MCP).

### 📋 Backlog performance (non urgente — nessun problema reale a questa scala)

`get_advisors(type=performance)` segnala 177 avvisi: 48 foreign key senza indice, 67 "Multiple Permissive Policies", 27 "Auth RLS Initialization Plan", 35 indici mai usati. Verificato: la maggior parte delle tabelle ha 0-5 righe oggi, quindi l'impatto pratico è nullo — sistemarli tutti ora significherebbe riscrivere ~140 oggetti per un beneficio che non esiste ancora. Da rivedere quando il traffico cresce, priorità: indici sulle FK di Business/Moments/ordini (additivo, zero rischio) prima di toccare le policy RLS (più delicato, da fare come lavoro mirato a parte).

### Secrets Worker ancora da impostare (non bloccanti)

`RESEND_WEBHOOK_SECRET` (dashboard Resend → webhook → signing secret), opzionale `PAYPAL_ENV=sandbox` in test. Finché mancano, i relativi endpoint rispondono 503 invece di accettare payload non verificati (comportamento sicuro di default).

---

## Coordinamento agenti AI

Nota 2026-07-13: il bootstrap ora richiede a ogni agente di dichiarare lavoro altrui rilevato, file sporchi/non tracciati, lock letti e stato push/deploy. Usare `KHAMAKEY_OS/prompts/new-agent-brief.md` per ogni nuovo agente o nuova chat.

| Agente / track | File principali | Non toccare |
|----------------|-----------------|-------------|
| **Business editor** | `pages/editor.html`, `pages/editor-ui.css`, `pages/public-page.css`, `pages/app.js` (iframe Business) | `pages/moments.html`, `pages/moments.js`, RSVP/guestbook Moments |
| **Moments editor** | `pages/moments.html`, `pages/moments.js`, `pages/moment-*.js`, Worker sezioni `/m/` | Wizard/collaudo/catalogo Business in `editor.html` |
| **Admin / piattaforma** | `pages/admin.html`, `sql/`, `worker/worker.js` (hub) | — |

**Regole:** incrementare `?v=` solo sul componente modificato; aggiornare questa tabella versioni dopo ogni release.

---

## Versioni attuali

| Componente | Versione | Note |
|------------|----------|------|
| **Admin** | **v128** | Preparato — Console supporto operativa con ricerca, filtri, gestione stato/priorita' ticket e note interne; magazzino NFC Moments v127 resta operativo. |
| **Editor Business** | **v118** | Preparato — tab Assistenza nell'account editor, ticket collegati a business/profilo e inviati alla console Admin. |
| **Moments editor** | **v114** | Raccordo fondo copertina configurabile (heroCut) + assistenza ticket in editor account. |
| **Worker NFC** | **v127** | Supporto a heroCut, unificazione di tutti i 21 sfondi premium e contrasto dinamico footer. |
| **SQL Supabase** | **v89 (applicata)** | v75-v83 security, v84 CRM, v85 trigger provvigioni ordini, v86 portale rivenditori, v87 hardening accesso agente solo via `member_id`, v88 claim sicuro primo accesso rivenditore, v89 RLS ticket utente |
| **Prossima release Business** | **v119** | Da definire dopo collaudo supporto/account |

---

## Funzionalità completate

### Piattaforma core
- [x] Progetto consolidato `pages/` + `worker/` + `sql/`
- [x] Auth Supabase (PKCE), RLS admin e clienti
- [x] URL centralizzati in `pages/config.js`
- [x] Upload media R2 (foto, video, audio) via Worker
- [x] Pagina pubblica Business `/p/` e Moments `/m/` + NFC `/k/`

### Business
- [x] Editor con anteprima live, sezioni a card
- [x] Wizard onboarding per settore (5 template)
- [x] Prenotazioni con email automatica Resend
- [x] Catalogo prodotti con varianti

### Moments
- [x] Editor parità UX Business (sidebar, topbar, wizard post-attivazione)
- [x] 21 categorie evento + template bilanciati per tipo
- [x] Temi visivi (classic, celebration, minimal, memorial)
- [x] RSVP configurabile per tipo evento
- [x] Attivazione codici NFC + PIN opzionale

### Admin
- [x] Pannelli Business e Moments separati
- [x] Magazzino NFC, lotti, codici, clienti Moments
- [x] Catalogo vendita Shopify (sync bozza → live)
- [x] Integration Hub (Shopify, Stripe, PayPal, Resend)
- [x] Rete rivenditori v68 (tier, listini, consegne)
- [x] UX v106: menu intenti, modalità semplice, guide
- [x] CRM v84: pipeline clienti + note protette da RPC
- [x] Provvigioni v85/v125: trigger ordini + gestione admin approva/paga/annulla
- [x] Supporto v128/v89: console ticket operativa e apertura ticket da Business/Moments editor con RLS cliente

### Integrazioni
- [x] Shopify: sync catalogo + webhook ordini
- [x] Email ordine con codici NFC post-checkout Shopify
- [x] Stripe Checkout + webhook ingest (predisposto)
- [x] i18n v66 (IT EN FR DE ES)

---

## Funzionalità in sviluppo

| Area | Stato | Priorità |
|------|-------|----------|
| Stripe secrets in produzione | Predisposto, secrets da configurare | Alta |
| Portale rivenditori self-service | Completato v86, hardening v87 applicato, claim v88 preparato | Media |
| Tabella risposte RSVP backend | Completato v70 — applicare SQL in prod | Alta |
| Catalogo multilingua completo | Admin predisposto, sync Shopify parziale | Media |
| Smoke test wizard 5 settori | Checklist aperta | Bassa |
| **KhamaKey OS** (questo sistema) | Fase 1 — struttura creata | Alta |

---

## Problemi aperti

| # | Problema | Impatto | Azione |
|---|----------|---------|--------|
| 1 | `STRIPE_SECRET_KEY` non in produzione | Pagamenti Business bloccati | Vedi `STRIPE-PERSONAL-SETUP.md` |
| 2 | `RESEND_API_KEY` da verificare in prod | Email ordini potrebbero non partire | `wrangler secret put` |
| 3 | Documentazione sparsa tra chat e file root | Perdita contesto tra sessioni AI | **KhamaKey OS** (in corso) |
| 4 | Skill Codex punta a path vecchi | Rischio deploy su cartella sbagliata | Specificare sempre root v41 |
| 5 | `RESEND_WEBHOOK_SECRET` non ancora impostato | Webhook Resend risponde 503 finché non configurato (sicuro, non urgente) | `wrangler secret put RESEND_WEBHOOK_SECRET` |

---

## Priorità correnti

1. **KhamaKey OS** — centralizzare conoscenza e regole AI
2. **Stripe in produzione** — account personale temporaneo OK
3. **Portale rivenditori** — brief personalizzazione Business
4. **RSVP backend** — raccolta risposte strutturata

---

## Prossimo obiettivo

> Completare **Fase 1 KhamaKey OS**: struttura cartelle, file fondamentali, migrazione graduale documentazione da `ROADMAP.md` e guide setup verso `docs/`.

Poi: configurare Stripe secrets e smoke test flusso ordine Moments end-to-end.

---

## Lock attivi (multi-agente)

Vedi [`../CODEX-COLLAB.md`](../CODEX-COLLAB.md) sezione **Lock attivi**.

| Area | Stato |
|------|-------|
| Rete rivenditori v68 | Libero per fix minori |
| Stripe secrets Worker | Da configurare |
| Admin v125 | Libero per fix minori — coordinarsi su `admin.html`, `admin.js`, `admin.css` |
| Editor contratto pubblico | Condiviso — coordinarsi |

---

## Root del progetto

```text
/Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated
```

Repo: `github.com/kpfarm/khamakey-v41` — branch `main`

---

## Deploy rapido

```bash
# Pages (da pages/)
npx wrangler pages deploy . --project-name khamakey-app

# Worker (da worker/)
npx wrangler deploy
```

Ordine release: **Worker prima** se cambia renderer NFC, poi **Pages**.
