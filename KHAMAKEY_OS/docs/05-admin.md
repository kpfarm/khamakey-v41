# 05 — Admin

## Panoramica

Pannello interno KhamaKey: `pages/admin.html` + `admin.js` + `admin.css` + `admin-guide.js`.

Versione attuale: **v148** (magazzino NFC Business, clienti Business arricchiti, provisioning staff; include v133 Spedizioni NFC, supporto + CRM operativo, dashboard ordini/incassi, menu 4 intenti, modalità semplice, gestione provvigioni, magazzino NFC Moments con creazione SKU/stock).

---

## Sezioni principali

| Sezione | Contenuto |
|---------|-----------|
| **Dashboard** | Alert operativi, KPI rapidi, grafici ordini/incassi |
| **Clienti Business** | Account, attività, email, codice NFC, slug, Analytics, drawer provisioning |
| **Magazzino NFC Business** | Lotti codici Business, filtri, CSV, KPI stock (v148) |
| **Clienti Moments** | Utenti, pagine, attivazioni |
| **Moments** | Gestione pagine evento |
| **Ordini** | `platform_orders` — Shopify, Stripe |
| **Magazzino NFC** | Lotti, codici, stock-first |
| **Spedizioni NFC** | Pipeline produzione, stampa, spedizione e completamento ordini NFC |
| **Catalogo vendita** | SKU Moments → sync Shopify |
| **Agenti / Rete** | Rivenditori, tier, listini |
| **Integration Hub** | Shopify, Stripe, PayPal, Resend |
| **Piani** | Abbonamenti Business (Stripe) |

## Console supporto v131

- La tab `Supporto` e' ora una console operativa: ricerca, filtri stato/priorita', viste rapide e conteggio ticket visibili.
- Ogni ticket puo' essere gestito dalla tab globale con cambio stato (`open`, `in_progress`, `waiting_customer`, `resolved`, `closed`) e priorita'.
- L'admin puo' aggiungere una nota interna durante l'aggiornamento del ticket; se il ticket e' collegato a una Business, la nota finisce nella timeline cliente.
- Restano attive le categorie ticket modificabili e la creazione ticket dalla scheda cliente.
- I ticket creati da Business editor e Moments editor confluiscono nella stessa tab globale.
- v131 aggiunge KPI lavoro: aperti, urgenti, in attesa cliente e risolti da chiudere.
- v131 aggiunge viste rapide per urgenza e alta priorita', oltre alle viste per stato.

---

## Spedizioni NFC v133

- La tab `Spedizioni NFC` non e' piu' un rimando: mostra una console evasione con pipeline `Da produrre`, `Da stampare`, `Da spedire`, `Spedite`, `Problemi`.
- I dati sono calcolati da `platform_orders` + `moment_activation_codes`, senza nuove tabelle e senza migrazioni SQL.
- Ogni riga collega ordine, cliente, codici NFC assegnati, stato pagamento, prossima azione e pulsanti operativi.
- Azioni disponibili: `Gestisci` ordine, `Assegna` codici se mancanti, `Stampa` aprendo il magazzino NFC, `Avanza` lo stato ordine fino a spedito/completato.
- La Dashboard ora manda gli alert `Ordini da evadere` alla console Spedizioni NFC, non solo alla lista ordini.

---

## Dashboard operativa v130

- Il blocco `Andamento operativo` mostra ordini ricevuti negli ultimi 7 giorni, ordini da evadere, incassi stimati a 30 giorni e valore medio ordine.
- I grafici sono generati senza librerie esterne: barre ordini ultimi 7 giorni, barre incassi ultime 4 settimane e pipeline stato ordini.
- Gli incassi sono stimati dagli ordini pagati/completati; il margine netto reale resta da calcolare quando saranno consolidati costi, provvigioni e spedizioni.

---

## UX v106+

- **Menu 4 intenti**: Vendere, Gestire, Configurare, Analizzare
- **Modalità semplice**: nasconde complessità per task quotidiani
- **Guide contestuali**: `admin-guide.js` — pannello help per sezione
- **Chip filtri**: ricerca e filtri su Clienti, Moments, Ordini, Agenti
- **Copy umano**: testi comprensibili per rete partner

## CRM e provvigioni

- **CRM v84/v131**: pipeline clienti con stato onboarding, priorita, follow-up, agente assegnato, tag e note timeline. v131 aggiunge viste rapide per scaduti, oggi, settimana, priorita' alta e clienti da contattare.
- **Provvigioni v85/v125**: il trigger SQL su `platform_orders` crea provvigioni `pending`; l'Admin mostra riepilogo, ricerca, filtro per stato e azioni contestuali `Approva`, `Segna pagata`, `Annulla`.
- Verifica live 2026-07-12: `platform_commission_events` ha RLS attiva, policy `commissions.read`/`commissions.write` e stati ammessi `pending`, `approved`, `paid`, `cancelled`.

## Magazzino Moments v127

- In `Magazzino NFC` l'admin puo' creare un modello/SKU senza uscire dalla sezione: SKU, nome, linea oggetto, template, prezzo/costo e quantita' fisiche/codici.
- Generazione stock da modello/SKU del catalogo Moments oppure manuale.
- Il form di generazione stock e' aperto e visibile: non e' piu' nascosto dietro un passaggio ambiguo.
- I filtri includono linea, lotto, stato, SKU/modello, data creazione, canale, agente e ordine.
- In tabella sono distinti: codice attivazione (inserto), link NFC chip `/m/<slug opaco>`, link pagina `/m/<slug>`, data creazione e tracciabilita' canale/agente/ordine.
- Export CSV/PDF: codice per confezione; programmazione chip usa `/m/<slug>`, non `/k/<codice>`.

---

## Magazzino NFC Moments

Flusso stock-first:

1. Genera codici senza rivenditore (stock)
2. Assegna codici all'ordine al momento della vendita
3. Traccia `sold_channel` e `assigned_agent_id`

Admin: ricerca, filtri, modifica singola, bulk, drawer ordine/codice, export CSV/PDF etichette.

---

## Magazzino NFC Business v148

Parità operativa con Moments, tab dedicata `Magazzino NFC Business`.

- **Genera lotti**: RPC `create_business_product_batch` (prefisso default `KHAMA`, max 500 codici).
- **KPI**: disponibili, claimati, sotto soglia — metrica `mBusinessStock` in Dashboard.
- **Tabella**: codice, stato, SKU/linea, lotto, email cliente, slug `/p/`, link NFC `/k/`, canale, agente, ordine.
- **Filtri + ricerca** + export **CSV** (PDF etichette: backlog).
- **Drawer codice**: modifica stato, canale, agente (condiviso con drawer Moments dove possibile).
- **Provisioning staff**: form `admin_provision_business_customer` — crea utente + attiva codice + business.

### Clienti Business arricchiti (v148)

- Tabella con email, codice NFC, slug pagina, pulsante Analytics.
- Drawer: email, codice NFC, URL NFC, note, ticket, ordini.
- Apri editor cliente: `index.html?business=<business_id>`.

SQL: `sql/khamakey-business-inventory-v148.sql` · Dettaglio: [`20-business-activation-inventory-v147-v148.md`](20-business-activation-inventory-v147-v148.md)

---

## Catalogo vendita (Shopify)

- Sync prodotto in **bozza** finché incompleto
- Flag `shopify_live` per pubblicazione
- Webhook ordini → creazione `platform_orders` + codici NFC
- Email post-ordine con codici + link attivazione

---

## File

| File | Ruolo |
|------|-------|
| `admin.html` | Layout e pannelli |
| `admin.js` | Logica CRUD, filtri, sync |
| `admin.css` | Stili admin |
| `admin-guide.js` | Guide contestuali per sezione |
| `admin-moment-labels.js` | Etichette categorie Moments |

---

## Roadmap admin

- [ ] Completare piano audit Admin: vedi [`18-admin-audit.md`](18-admin-audit.md)
- [ ] Eseguire piano console operativa a blocchi: vedi [`19-admin-console-operativa.md`](19-admin-console-operativa.md)
- [ ] Portale rivenditori self-service
- [ ] Tab traduzioni catalogo per SKU
- [ ] Dashboard analytics avanzata
- [x] Gestione ticket supporto unificato base (v128)
- [ ] Assegnazione responsabile ticket e risposta cliente via email
- [x] Console Spedizioni NFC operativa base (v133)
