# 05 — Admin

## Panoramica

Pannello interno KhamaKey: `pages/admin.html` + `admin.js` + `admin.css` + `admin-guide.js`.

Versione attuale: **v126** (menu 4 intenti, modalità semplice, CRM operativo, gestione provvigioni, magazzino NFC Moments con link/tracciabilita' espliciti).

---

## Sezioni principali

| Sezione | Contenuto |
|---------|-----------|
| **Dashboard** | Alert operativi, KPI rapidi |
| **Clienti Business** | Account, attività, stato |
| **Clienti Moments** | Utenti, pagine, attivazioni |
| **Moments** | Gestione pagine evento |
| **Ordini** | `platform_orders` — Shopify, Stripe |
| **Magazzino NFC** | Lotti, codici, stock-first |
| **Catalogo vendita** | SKU Moments → sync Shopify |
| **Agenti / Rete** | Rivenditori, tier, listini |
| **Integration Hub** | Shopify, Stripe, PayPal, Resend |
| **Piani** | Abbonamenti Business (Stripe) |

---

## UX v106+

- **Menu 4 intenti**: Vendere, Gestire, Configurare, Analizzare
- **Modalità semplice**: nasconde complessità per task quotidiani
- **Guide contestuali**: `admin-guide.js` — pannello help per sezione
- **Chip filtri**: ricerca e filtri su Clienti, Moments, Ordini, Agenti
- **Copy umano**: testi comprensibili per rete partner

## CRM e provvigioni

- **CRM v84**: pipeline clienti con stato onboarding, priorita, follow-up, agente assegnato, tag e note timeline.
- **Provvigioni v85/v125**: il trigger SQL su `platform_orders` crea provvigioni `pending`; l'Admin mostra riepilogo, ricerca, filtro per stato e azioni contestuali `Approva`, `Segna pagata`, `Annulla`.
- Verifica live 2026-07-12: `platform_commission_events` ha RLS attiva, policy `commissions.read`/`commissions.write` e stati ammessi `pending`, `approved`, `paid`, `cancelled`.

## Magazzino Moments v126

- Generazione stock da modello/SKU del catalogo Moments oppure manuale.
- In tabella sono distinti: codice attivazione, link NFC fisico `/k/<codice>`, link attivazione/pagina `/m/<slug>`, data creazione e tracciabilita' canale/agente/ordine.
- Export CSV/PDF etichette usa il link NFC fisico `/k/<codice>`, non il link pagina `/m/<slug>`.

---

## Magazzino NFC

Flusso stock-first:

1. Genera codici senza rivenditore (stock)
2. Assegna codici all'ordine al momento della vendita
3. Traccia `sold_channel` e `assigned_agent_id`

Admin: ricerca, filtri, modifica singola, bulk, drawer ordine/codice.

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

- [ ] Portale rivenditori self-service
- [ ] Tab traduzioni catalogo per SKU
- [ ] Dashboard analytics avanzata
- [ ] Gestione ticket supporto unificato
