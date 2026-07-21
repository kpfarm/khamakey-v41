# 07 — Database

## Supabase

Progetto: `cuxlwaocjqwzluycznyp`

Migrazioni in `sql/` — versionate da v37 a **v148** (applicata in produzione: v147 attivazione Business, v148 magazzino Business admin).

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
| v69 | `khamakey-business-i18n-v69.sql` | Traduzioni pagine Business |
| v70 | `khamakey-moments-rsvp-v70.sql` | RSVP Moments strutturato |
| v71 | `khamakey-moments-guestbook-v71.sql` | Guestbook Moments |
| **v165** | `khamakey-webhook-ingest-store-v165.sql` | Store chiave ingest + guestbook/RSVP aggiornati |
| v72-v73 | anniversari + letter unlock | Automazioni Moments |
| v74 | `khamakey-business-analytics-v74.sql` | Analytics Business |
| v75-v83 | hardening sicurezza | PIN, rate limit, CSP/RLS, linter Supabase |
| v84 | `khamakey-crm-v84.sql` | CRM admin su tabelle esistenti |
| v85 | `khamakey-order-commissions-v85.sql` | Trigger provvigioni automatiche su ordini |
| v86-v88 | portale rivenditori | Self-service, hardening `member_id`, claim primo accesso |
| v89 | `khamakey-support-customer-tickets-v89.sql` | Policy RLS per ticket supporto creati da utenti autenticati |
| **v147** | `khamakey-business-activation-v147.sql` | Tabella `business_activation_codes` + RPC `activate_business_code` |
| **v148** | `khamakey-business-inventory-v148.sql` | Magazzino admin Business: batch RPC, RLS inventory, provisioning staff |

---

## Tabelle chiave

| Tabella | Ruolo |
|---------|-------|
| `platform_members` | Ruoli e permessi utenti |
| `businesses` | Attività Business |
| `moments` | Pagine evento |
| `moment_activation_codes` | Codici NFC Moments |
| `business_activation_codes` | Codici NFC Business (v147+) — inventario + claim |
| `platform_orders` | Ordini (Shopify, Stripe) |
| `platform_moment_catalog` | Catalogo vendita |
| `platform_agents` | Rivenditori / agenti |
| `platform_payment_transactions` | Transazioni pagamento |
| `platform_commission_events` | Provvigioni generate da ordini/abbonamenti |
| `platform_support_tickets` | Ticket supporto da Admin, Business editor e Moments editor |

---

## RLS (Row Level Security)

- Admin: `admin.full`, `moments.read/write`, `inventory.read/write`
- Clienti: accesso solo ai propri dati
- Supporto: staff via `support.read/write`; clienti possono creare/leggere solo ticket con `profile_id = auth.uid()` (SQL v89)
- Worker: service role via secrets

---

## RPC importanti

| Funzione | Uso |
|----------|-----|
| `activate_moment_code` | Attivazione codice NFC Moments (5 parametri) |
| `activate_business_code` | Attivazione codice NFC Business — crea attività + pagina + tag (v147) |
| `create_business_product_batch` | Genera lotti codici Business in admin (v148) |
| `get_business_product_inventory_stats` | KPI magazzino Business (v148) |
| `admin_provision_business_customer` | Provisioning staff: utente + codice + business (v148) |
| `ingest_stripe_checkout_event` | Webhook Stripe |
| Funzioni rete v68 | Assegnazione, listini, consegne |
| `apply_order_commissions` | Trigger interno v85 per creare provvigioni da `platform_orders` |

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
