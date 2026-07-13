# 18 — Audit Admin

> Audit operativo del pannello Admin KhamaKey. Data: 2026-07-14.
> Scope: `pages/admin.html`, `pages/admin.js`, `pages/admin.css`, Supabase live `cuxlwaocjqwzluycznyp`, documentazione OS.

---

## Esito Sintetico

Il pannello Admin e' tecnicamente ampio e molte funzioni sono gia' cablate, ma non tutte le sezioni sono complete o collaudate end-to-end.

Stato generale:

| Area | Stato | Sintesi |
|------|-------|---------|
| Accesso admin e permessi | Parziale | Login e controllo membro esistono; gestione `platform_members` non crea utenti Auth/password. |
| Dashboard | Parziale | KPI e alert funzionano, ma dipendono da tabelle con pochi dati e alcune metriche legacy. |
| Clienti Business | Buono | Lista, filtri, drawer, preview, note, ticket, ordini e analytics collegati. |
| Clienti Moments | Buono/parziale | Provisioning account/codice collegato via RPC; manca flusso guidato test account completo. |
| Catalogo Moments | Buono | SKU, prezzi, bundle, Shopify bozza/live; serve completare immagini/copy e traduzioni SKU. |
| Magazzino NFC Moments | Buono dopo v127 | Creazione SKU in sezione, generazione stock, filtri SKU/data, CSV/PDF. Da collaudare con nuovi codici reali. |
| Ordini | Buono/parziale | Creazione ordine e assegnazione codici cablate; mancano workflow produzione/spedizione piu' guidati. |
| Partner/agenti | Parziale | CRUD agente e rete presenti; database live ha 0 agenti, quindi flusso non collaudato con dati reali. |
| Provvigioni | Parziale | Trigger e UI presenti; database live ha 0 provvigioni, quindi serve test reale ordine + agente. |
| CRM | Buono/parziale | Pipeline e note via RPC presenti; manca calendario/reminder operativo e azioni rapide. |
| Supporto | Buono base dopo v128 | Console globale con ricerca, filtri, gestione stato/priorita' e note interne; ticket apribili da Business/Moments editor. Restano assegnazione responsabile e risposta cliente. |
| Billing/Piani | Parziale | Piani CRUD e checkout Stripe cablati; secrets/price ID producono il vero stato operativo. |
| Integrazioni | Parziale | Stato Worker, lingue, transazioni, webhook e record integrazione; non gestisce secrets per scelta corretta. |
| Materiali | Buono base | CRUD materiali presente; manca collegamento diretto a portale agenti/cliente. |
| Magazzino Business | Base | CRUD prodotto e movimenti presenti; nessun movimento reale registrato. |
| NFC / Spedizioni | Non completa | E' una sezione di rimando, non una vera console spedizioni. |
| Permessi | Base | Legenda permessi + checklist in Staff; manca audit trail e ruoli predefiniti. |

Conclusione: il pannello e' utilizzabile per amministrazione interna minima, Moments stock-first e configurazioni base. Non e' ancora completo come centro operativo unico per vendita, produzione, spedizione, supporto, contabilità e test account.

---

## Verifiche Eseguite

### Codice

- `node --check pages/admin.js`: OK.
- Mappati pannelli Admin: 19 pannelli, tutti con tab corrispondente.
- Mappati form Admin: 26 form, tutti risultano collegati a handler `submit`.
- Verifica live HTTP: `https://khamakey-app.pages.dev/admin.html` serve `admin.js?v=127` e contiene `Crea modello/SKU`.

### Supabase Live

Tabelle/RPC principali risultano presenti. Conteggi live al 2026-07-14:

| Dato | Conteggio |
|------|-----------|
| Business | 2 |
| Moments | 1 |
| Codici Moments totali | 1 |
| Codici Moments disponibili | 0 |
| SKU Moments catalogo | 3 |
| Ordini | 1 |
| Agenti | 0 |
| Provvigioni | 0 |
| Prodotti Business | 4 |
| Movimenti stock Business | 0 |
| Piani | 4 |
| Materiali | 3 |
| Ticket supporto | 0 |
| Integrazioni | 5 |
| Transazioni | 0 |
| Webhook eventi | 0 |

RPC Admin/Moments/Rete verificate come presenti:

- `admin_provision_moment_customer`
- `create_moment_product_batch`
- `bulk_update_moment_activation_codes`
- `assign_moment_codes_to_order`
- `get_moment_customer_stats`
- `get_moment_product_inventory_stats`
- `get_moment_agent_inventory_stats`
- `get_agent_network_tree`
- `get_agent_delivery_history`
- `record_agent_delivery`
- `list_crm_clients`
- `save_crm_client`
- `list_crm_notes`
- `add_crm_note`
- `delete_crm_note`
- `apply_order_commissions`
- `ingest_stripe_checkout_event`

### Limite Verifica

Non e' stato fatto un test browser autenticato con credenziali admin in questa sessione. Quindi lo stato "funziona" indica: codice cablato, schema/RPC presenti, verifica statica OK e dati live coerenti. Per dichiarare una sezione "completa in produzione" serve un test manuale autenticato o Playwright con credenziali dedicate.

---

## Gap Principali

### P0 — Da Risolvere Prima Dei Test Commerciali

1. **Nessun codice Moments disponibile**
   - Stato: `moment_activation_codes = 1`, `available = 0`.
   - Impatto: non si possono creare nuovi test account NFC senza generare stock.
   - Azione: creare 1 SKU test + lotto piccolo 5-10 codici via Admin v127, verificare `/k/`, `/m/`, editor e account.

2. **Flusso test account non abbastanza guidato**
   - Oggi si passa tra Clienti Moments, Magazzino NFC, Moments editor e pagina finale.
   - Serve una wizard Admin "Crea account test" che faccia:
     1. scegli/crea SKU;
     2. genera o seleziona codice disponibile;
     3. inserisci email cliente;
     4. crea Moment;
     5. apre editor;
     6. apre pagina finale `/m/`;
     7. mostra link NFC `/k/`.

3. **Documenti versione non allineati**
   - `PROJECT_STATE.md` dice Admin v127.
   - `KHAMAKEY_OS/AGENTS.md` contiene ancora Admin v106 / Worker v103.
   - `CODEX-COLLAB.md` contiene ancora Admin v125 / Worker v125.
   - Azione: aggiornare versioni operative nei documenti agenti per evitare rollback o confusione.

4. **Security advisor ancora rumoroso**
   - Supabase segnala molte funzioni `SECURITY DEFINER` eseguibili da `anon`/`authenticated`.
   - Alcune sono pubbliche per design o protette da ingest key, ma l'audit va rifatto funzione per funzione.
   - Azione: creare audit SQL dedicato "RPC exposure v89" senza revocare alla cieca.

### P1 — Rendere Admin Davvero Operativo

5. **Spedizioni NFC non e' una console**
   - La tab `NFC / Spedizioni` rimanda a Magazzino e Ordini.
   - Serve una sezione reale con:
     - codici pronti da stampare;
     - ordini da preparare;
     - tracking;
     - stato produzione/spedizione;
     - stampa etichette per lotto/ordine;
     - storico consegne.

6. **Supporto globale operativo base, non ancora completo**
   - Risolto in v128/v89: tab Supporto con filtri, gestione stato/priorita', note interne e ticket creati da editor Business/Moments.
   - Restano: assegnazione responsabile, risposta cliente/email, storico conversazione e SLA.

7. **Partner/agenti non collaudati con dati reali**
   - Database live: `platform_agents = 0`.
   - Serve creare almeno:
     - 1 agente diretto;
     - 1 agente downline;
     - 1 consegna;
     - 1 ordine con agente;
     - verifica provvigione.

8. **Provvigioni senza dati reali**
   - Trigger e UI presenti, ma `platform_commission_events = 0`.
   - Serve test end-to-end ordine agente: ordine pagato -> commissione pending -> approva -> paga -> annulla.

9. **Billing incompleto senza Stripe operativo**
   - Piani CRUD esistono.
   - Checkout parte solo se `stripe_price_*` e secrets Worker sono configurati.
   - Serve pannello "stato Stripe" piu' esplicito: price ID mancanti, secret mancante, webhook mancante.

10. **Magazzino Business base**
   - Prodotti Business esistono, movimenti stock = 0.
   - Manca flusso stock reale con carico/scarico da ordine, riserva automatica, alert minimo.

### P2 — Miglioramenti UX/Prodotto

11. **Permessi troppo tecnici**
   - Serve preset ruoli: Owner, Admin operativo, Supporto, Agente, Magazzino, Marketing.
   - Aggiungere audit trail su chi ha cambiato permessi.

12. **CRM manca automazione follow-up**
   - Oggi salva stati e note.
   - Serve vista "oggi/questa settimana", reminder, azioni rapide email/WhatsApp, export.

13. **Catalogo Moments manca localizzazione/canali**
   - Manca tab traduzioni per SKU.
   - Manca indicazione contenuti asset marketing per SKU: immagine, copy, video, marketplace.

14. **Integrazioni non guidano alla risoluzione**
   - La tab mostra stato, ma dovrebbe dire "cosa manca" per Shopify/Stripe/Resend/PayPal.
   - Non inserire secrets nel codice o nel DB: solo link/istruzioni a Cloudflare secrets.

15. **Dashboard non e' ancora una command center**
   - KPI presenti, ma servono azioni dirette: "genera codici", "crea test account", "evadi ordine", "chiudi ticket".

---

## Piano Dettagliato Di Miglioramento

### Fase 1 — Stabilizzare Test Moments e Versioni

Obiettivo: poter creare account test e pagina NFC senza frizione.

Azioni:

1. Allineare versioni stale in `KHAMAKEY_OS/AGENTS.md`, `CODEX-COLLAB.md`, `PROJECT_STATE.md`.
2. Aggiungere in Admin un wizard "Crea test Moments" nella sezione `Clienti Moments` o `Magazzino NFC`.
3. Creare collaudo manuale guidato:
   - crea SKU test;
   - genera 5 codici;
   - crea account cliente test;
   - collega codice;
   - apri editor;
   - pubblica pagina;
   - verifica `/k/<codice>` e `/m/<slug>`.
4. Aggiungere stato visuale in dashboard: "codici disponibili = 0" con CTA "Genera stock".

File probabili:

- `pages/admin.html`
- `pages/admin.js`
- `pages/admin.css`
- `KHAMAKEY_OS/docs/05-admin.md`
- `KHAMAKEY_OS/docs/13-roadmap.md`

### Fase 2 — Console Operativa NFC/Ordini

Obiettivo: dalla vendita alla stampa/spedizione senza cambiare area.

Azioni:

1. Trasformare `NFC / Spedizioni` da rimando a console reale.
2. Creare viste:
   - Da produrre;
   - Da stampare;
   - Da spedire;
   - Spediti;
   - Problemi.
3. Collegare codici, ordine, cliente, agente, tracking.
4. Aggiungere azioni bulk: stampa PDF, esporta CSV, assegna tracking, segna spedito.
5. Integrare storico consegne agenti.

### Fase 3 — Supporto e CRM Operativo

Obiettivo: supporto e follow-up realmente utilizzabili ogni giorno.

Azioni:

1. Tab Supporto con gestione ticket completa:
   - fatto v128: filtri, ricerca, cambio stato/priorita', nota interna, chiudi/riapri;
   - da fare: assegna responsabile, risposta cliente/email, cronologia conversazione.
2. CRM con vista follow-up:
   - oggi;
   - settimana;
   - scaduti;
   - clienti senza attività.
3. Collegare ticket e CRM nella scheda cliente.

### Fase 4 — Partner, Provvigioni, Listini

Obiettivo: rete partner testabile e vendibile.

Azioni:

1. Creare seed operativo minimo via Admin:
   - agente root;
   - downline;
   - listino;
   - consegna;
   - ordine;
   - commissione.
2. Aggiungere wizard "nuovo partner" con:
   - account;
   - ruolo;
   - listino;
   - codice referral;
   - territorio;
   - link portale.
3. Verificare provvigioni con ordine reale e trigger v85.
4. Aggiungere report commissioni per periodo e export.

### Fase 5 — Billing e Integrazioni

Obiettivo: sapere subito cosa manca per vendere.

Azioni:

1. Stato Stripe leggibile:
   - secret presente/mancante;
   - price ID presenti/mancanti;
   - webhook configurato/non configurato;
   - ultimo evento ricevuto.
2. Stato Shopify:
   - shop configurato;
   - webhook ordini;
   - ultimo sync;
   - errori catalogo.
3. Stato Resend/PayPal:
   - secret webhook;
   - ultimo evento;
   - test email.

### Fase 6 — Sicurezza RPC e Audit Trail

Obiettivo: mantenere sicurezza mentre l'Admin cresce.

Azioni:

1. Audit `SECURITY DEFINER` funzione per funzione:
   - pubblica per design;
   - richiede ingest key;
   - richiede admin permission;
   - da revocare a `anon`;
   - da revocare ad `authenticated`.
2. Aggiungere audit trail Admin:
   - cambio permessi;
   - cambio stato ordine;
   - cambio commissione;
   - cambio codice NFC;
   - cambio integrazione.
3. Non indebolire RLS/CSP/rate limit per far passare una feature.

---

## Priorita Consigliata

Ordine pratico:

1. Fase 1 — test Moments e versioni stale.
2. Fase 2 — console NFC/ordini.
3. Fase 4 — partner/provvigioni con dati reali.
4. Fase 3 — supporto/CRM.
5. Fase 5 — billing/integrazioni.
6. Fase 6 — audit RPC approfondito, in parallelo ma senza bloccare UX se non emerge rischio critico.

---

## Criterio Di Completamento

Una sezione Admin si considera completa solo quando ha:

1. dati reali o seed di test;
2. CRUD o workflow principale completo;
3. ricerca/filtri coerenti;
4. messaggi errore chiari;
5. permessi coerenti;
6. export o azioni operative dove serve;
7. documentazione aggiornata;
8. test browser autenticato o smoke test documentato.
