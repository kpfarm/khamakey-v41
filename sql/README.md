# Migrazioni Supabase KhamaKey Moments

Applica gli script **in ordine** nel SQL Editor di Supabase (o via `psql` con `apply-all.psql`).

| Ordine | File | Contenuto |
|--------|------|-----------|
| 1 | `khamakey-moments-admin-v37.sql` | Permessi admin Moments |
| 2 | `khamakey-moments-platform-v38.sql` | Tabelle e RPC piattaforma |
| 3 | `khamakey-moments-activation-v39.sql` | Attivazione codici NFC |
| 4 | `khamakey-moments-products-v40.sql` | Inventario prodotti, batch, link `/m/` |
| 5 | `khamakey-moments-activate-fix-v41.sql` | Fix attivazione codice (`code is ambiguous`) |
| 6 | `khamakey-moments-inventory-v42.sql` | Linea prodotto, lotti, statistiche magazzino NFC |
| 7 | `khamakey-moments-admin-customers-v43.sql` | Clienti admin, provisioning, save editor admin |
| 8 | `khamakey-media-storage-v44.sql` | Bucket Storage media clienti (Moments + Business) |
| 9 | `khamakey-moments-save-fix-v45.sql` | Fix salvataggio editor (`slug is ambiguous`) + PIN |
| 10 | `khamakey-moments-categories-v59.sql` | Categorie estese (amore, famiglia, feste, animali…) + save con `_moment_type_valid` |
| 11 | `khamakey-moments-event-type-v60.sql` | Allinea `event_type` alle nuove categorie (+ tipi legacy) |
| 12 | `khamakey-moments-reseller-v61.sql` | Canale vendita e agente su codici NFC Moments + report rivenditori |
| 13 | `khamakey-moments-fulfillment-v62.sql` | Collegamento ordini ↔ codici da magazzino (pronta consegna) |
| 14 | `khamakey-admin-business-rls-v63.sql` | Policy RLS admin su tabelle Business (`pages.read`) |
| 15 | `khamakey-moments-sales-channels-v64.sql` | Catalogo vendita Moments, sync Shopify, bundle NFC, ingest ordini |
| 16 | `khamakey-moment-catalog-shopify-live-v65.sql` | Flag `shopify_live`: bozza Shopify fino a contenuti completi |
| 17 | `khamakey-integrations-i18n-v66.sql` | Integration Hub, pagamenti, lingue, traduzioni catalogo |
| 18 | `khamakey-shopify-email-stripe-v67.sql` | Email ordine con codici NFC, ingest Stripe checkout |
| 19 | `khamakey-reseller-network-v68.sql` | Rete rivenditori a grado, listini B2B, storico consegne, RPC provvigioni multilivello |

Se hai già applicato versioni precedenti, esegui solo i file mancanti.

**Stato produzione (2026-07-09):** v64–v67 applicati; **v68 applicato** (rete rivenditori, listini, consegne).

## Supabase SQL Editor

Copia e incolla il contenuto di ciascun file nell'ordine indicato.

## psql (opzionale)

```bash
psql "$DATABASE_URL" -f apply-all.psql
```
