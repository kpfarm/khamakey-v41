# 07 — Database

## Supabase

Progetto: `cuxlwaocjqwzluycznyp`

Migrazioni in `sql/` — versionate da v37 a **v68**.

---

## Applicazione migrazioni

Eseguire **in ordine** i file non ancora applicati. Vedi [`../../sql/README.md`](../../sql/README.md).

### Sequenza principale

| Versione | File | Contenuto |
|----------|------|-----------|
| v37 | `khamakey-moments-admin-v37.sql` | Admin Moments base |
| v38 | `khamakey-moments-platform-v38.sql` | Piattaforma Moments |
| v39 | `khamakey-moments-activation-v39.sql` | Attivazione codici |
| v40 | `khamakey-moments-products-v40.sql` | Prodotti catalogo |
| v41 | `khamakey-moments-activate-fix-v41.sql` | Fix attivazione |
| v42 | `khamakey-moments-inventory-v42.sql` | Magazzino NFC |
| v43 | `khamakey-moments-admin-customers-v43.sql` | Clienti admin |
| v44 | `khamakey-media-storage-v44.sql` | Bucket media + RLS |
| v59–v60 | categorie + event type | Categorie Moments |
| v61 | `khamakey-moments-reseller-v61.sql` | Canali vendita |
| v62 | `khamakey-moments-fulfillment-v62.sql` | Ordini + assegnazione |
| v63 | `khamakey-admin-business-rls-v63.sql` | RLS Business admin |
| v64–v65 | sales channels + Shopify live | Catalogo vendita |
| v66 | `khamakey-integrations-i18n-v66.sql` | Integrazioni + i18n |
| v67 | `khamakey-shopify-email-stripe-v67.sql` | Email ordini + Stripe |
| v68 | `khamakey-reseller-network-v68.sql` | Rete rivenditori |

---

## Tabelle chiave

| Tabella | Ruolo |
|---------|-------|
| `platform_members` | Ruoli e permessi utenti |
| `businesses` | Attività Business |
| `moments` | Pagine evento |
| `moment_activation_codes` | Codici NFC |
| `platform_orders` | Ordini (Shopify, Stripe) |
| `platform_moment_catalog` | Catalogo vendita |
| `platform_agents` | Rivenditori / agenti |
| `platform_payment_transactions` | Transazioni pagamento |

---

## RLS (Row Level Security)

- Admin: `admin.full`, `moments.read/write`, `inventory.read/write`
- Clienti: accesso solo ai propri dati
- Worker: service role via secrets

---

## RPC importanti

| Funzione | Uso |
|----------|-----|
| `activate_moment_code` | Attivazione codice NFC (5 parametri) |
| `ingest_stripe_checkout_event` | Webhook Stripe |
| Funzioni rete v68 | Assegnazione, listini, consegne |

---

## Storage

Bucket `khamakey-media` (SQL v44):
- Upload via Worker `POST /api/media/upload`
- Serve via `GET /cdn/{path}`
- RLS per accesso controllato

---

## Regole per nuove migrazioni

1. Nuovo file `sql/khamakey-{area}-v{NN}.sql`
2. Documentare in questo file
3. Applicare in Supabase SQL Editor
4. Aggiornare `PROJECT_STATE.md`
