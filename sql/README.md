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
| 20 | `khamakey-business-i18n-v69.sql` | Traduzioni pagine Business (`business_page_i18n`, impostazioni internazionali) |
| 21 | `khamakey-moments-rsvp-v70.sql` | RSVP Moments: raccolta risposte strutturata |
| 22 | `khamakey-moments-guestbook-v71.sql` | Libro degli ospiti Moments |
| 23 | `khamakey-moments-anniversaries-v72.sql` | Anniversari Moments (email automatiche) |
| 24 | `khamakey-moments-letter-unlock-v73.sql` | Notifica apertura lettera al futuro |
| 25 | `khamakey-business-analytics-v74.sql` | RPC `get_business_analytics` per editor Business (conteggi aggregati) |
| 26 | `khamakey-security-hardening-v75.sql` | Fix audit: `get_public_moment` non espone più `state` con PIN errato/assente, rate limit tentativi PIN per slug + visitatore, RLS su `platform_webhook_events`, `business_page_i18n` pubblico solo per aziende con i18n abilitato |
| 27 | `khamakey-rate-limit-v76.sql` | `check_rate_limit()` generico (Postgres, zero infra nuova) usato dal Worker su RSVP, guestbook, prenotazioni, upload media, traduzioni OpenAI |
| 28 | `khamakey-rate-limit-cleanup-v77.sql` | `cleanup_rate_limit_tables()` — pulizia righe scadute da `moment_pin_attempts`/`platform_rate_limits`, agganciata al cron giornaliero esistente nel Worker |
| 29 | `khamakey-pin-ambiguity-fix-v78.sql` | **Fix urgente**: `get_public_moment` falliva (HTTP 500) su ogni evento con PIN attivo per ambiguità colonna `slug` tra output e tabella `moment_pin_attempts`. Applicato in produzione 2026-07-11, verificato con smoke test su evento reale |
| 30 | `khamakey-locales-rls-fix-v79.sql` | Abilita RLS su `platform_supported_locales` (trovato da advisory sicurezza Supabase, mancava dalla creazione tabella) |
| 31 | `khamakey-security-linter-fixes-v80-v83.sql` | Triage completo linter Supabase: blocca enumerazione bucket Storage legacy, `search_path` su `_moment_type_valid`, permessi mancanti su `get_agent_delivery_history` + 4 funzioni statistiche admin (`get_moment_customer_stats` esponeva email di tutti i clienti), revocato accesso a 2 funzioni inutilizzate |
| 32 | `khamakey-crm-v84.sql` | CRM: RPC (`list_crm_clients`, `save_crm_client`, `list_crm_notes`, `add_crm_note`, `delete_crm_note`) su tabelle esistenti `platform_client_records`/`platform_client_notes`. Protette da `crm.read`/`crm.write`. Nessuna tabella nuova |
| 33 | `khamakey-order-commissions-v85.sql` | Provvigioni automatiche: trigger su `platform_orders` che distribuisce le provvigioni multilivello (`apply_order_commissions`) a creazione ordine o assegnazione agente. Idempotente (`source_type='order'`), fail-safe (mai blocca l'ordine). Nessuna tabella nuova |
| 34 | `khamakey-reseller-portal-v86.sql` | Portale rivenditori self-service: RPC `get_my_*` che leggono solo i dati dell'agente autenticato |
| 35 | `khamakey-reseller-portal-hardening-v87.sql` | Hardening `current_agent_id()`: rimosso fallback via email, accesso solo tramite collegamento esplicito `platform_agents.member_id -> platform_members.user_id` |
| 36 | `khamakey-reseller-portal-claim-v88.sql` | Primo accesso rivenditore: collega in modo sicuro l'utente autenticato al profilo agente gia' creato dall'admin, solo con email confermata e member non assegnato |

Se hai già applicato versioni precedenti, esegui solo i file mancanti. Tutti gli script v37→v74 sono idempotenti (`if not exists` / `on conflict do nothing` / blocchi `DO` con controllo su `pg_constraint`): rieseguire `apply-all.psql` per intero su un database dove alcune versioni sono già applicate non duplica dati né rompe lo schema.

**`khamakey-integrations-i18n-v66-production.sql` non è nella sequenza.** È una patch storica applicata a mano nel SQL Editor di Supabase quando su produzione `platform_integrations`/`platform_payment_transactions` risultavano già create fuori sequenza. `khamakey-integrations-i18n-v66.sql` è già completo e idempotente (crea quelle tabelle solo se assenti) e la copre interamente: non serve applicare entrambe. Il file `-production` resta nel repo solo come traccia storica — non eseguirlo di nuovo.

**Stato produzione (2026-07-11):** `apply-all.psql` ora include l'intera catena v37→v74 (mancavano v64–v73). Resta da confermare direttamente su Supabase quali versioni risultano già applicate al progetto `cuxlwaocjqwzluycznyp` — questo file non ha visibilità sullo schema live.

## Supabase SQL Editor

Copia e incolla il contenuto di ciascun file nell'ordine indicato.

## psql (opzionale)

```bash
psql "$DATABASE_URL" -f apply-all.psql
```
