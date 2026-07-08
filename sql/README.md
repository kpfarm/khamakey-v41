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

Se hai già applicato versioni precedenti, esegui solo i file mancanti.

**Stato produzione (2026-07-08):** su progetto `cuxlwaocjqwzluycznyp` risultano applicati v45 (slug fix via v59), v59 e v60.

## Supabase SQL Editor

Copia e incolla il contenuto di ciascun file nell'ordine indicato.

## psql (opzionale)

```bash
psql "$DATABASE_URL" -f apply-all.psql
```
