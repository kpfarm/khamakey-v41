# KhamaKey — Setup Shopify e canali vendita (Sprint E)

Piano operativo per collegare il negozio Shopify al software KhamaKey.
**Moments first** — Business resta su [khamakey.it](https://www.khamakey.it) con vendita assistita.

---

## Architettura

```
Admin KhamaKey (catalogo Moments)
        │
        ▼
Cloudflare Worker  ←── webhook ordini Shopify
        │
        ├── Supabase: platform_moment_catalog
        ├── Supabase: platform_orders + codici NFC
        └── Shopify Admin API (sync prodotti)
```

| Canale | Ruolo | Stato |
|--------|-------|-------|
| **Shopify** | E-commerce principale Moments | Sprint E — da collegare |
| **Etsy / Amazon / TikTok** | Marketplace (fase 2) | Via Shopify o LitCommerce |
| **Rivenditori locali** | Lotti NFC in admin | Già operativo |
| **khamakey.it** | Landing Business + lead | Stripe Payment Link (fase Business) |

---

## Cosa serve da te (checklist account)

Segna quando completato. **Avvisami in chat** quando hai le credenziali — le configureremo nei secret Cloudflare (mai nel codice).

### 1. Shopify (priorità 1)

- [ ] Negozio creato su [shopify.com](https://www.shopify.com)
- [ ] Tema configurato (logo, colori KhamaKey)
- [ ] **Custom app** in Admin → Settings → Apps → Develop apps:
  - Scopes: `read_products`, `write_products`, `read_orders`, `write_orders`
  - Annota: **Shop domain** (`xxx.myshopify.com`), **Admin API access token**, **API secret key**
- [ ] Webhook `Order creation` → URL sotto (dopo deploy Worker):

  ```
  https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/shopify/orders
  ```

  Formato: JSON

### 2. Cloudflare Worker — secret da impostare

Dalla cartella `worker/`:

```bash
npx wrangler secret put SHOPIFY_SHOP_DOMAIN      # es. tuonegozio.myshopify.com
npx wrangler secret put SHOPIFY_ACCESS_TOKEN     # token Admin API
npx wrangler secret put SHOPIFY_WEBHOOK_SECRET   # API secret key (verifica firma)
npx wrangler secret put WEBHOOK_INGEST_KEY         # stringa casuale lunga (stessa di Supabase)
```

In Supabase SQL Editor (una tantum):

```sql
alter database postgres set app.khamakey_webhook_ingest_key = 'STESSA-CHIAVE-DI-WEBHOOK_INGEST_KEY';
```

### 3. Supabase — migrazione SQL

Applica in SQL Editor:

```
sql/khamakey-moments-sales-channels-v64.sql
```

### 4. Packlink Pro (spedizioni — quando pronto)

- [ ] Account Packlink (personale ok per test, business con P.IVA per produzione)
- [ ] App Packlink Pro su Shopify
- KhamaKey traccia tracking in admin (fase successiva)

### 5. Stripe (Business assistito — opzionale ora)

- [ ] Account Stripe (personale per test)
- Payment Link per preventivi Business da khamakey.it
- Alla P.IVA: nuovo account business → aggiorna secret Worker

### 6. Resend (email)

- [ ] Già previsto nel Worker per prenotazioni
- Estendere a: conferma ordine Shopify + codice attivazione Moments

---

## Catalogo Moments — logica bundle

| SKU | Prodotto | Fisici spediti | Codici NFC |
|-----|----------|----------------|------------|
| `MOM-WED-SINGLE` | 1 portachiavo | 1 | 1 |
| `MOM-WED-2X` | Bundle coppia | 2 | **1** (stessa pagina) |
| `MOM-PARTY-SINGLE` | 1 portachiavo party | 1 | 1 |

**Bundle condiviso:** 2 portachiavi programmati con lo stesso URL `/k/{codice}` → 1 attivazione → 1 account.

Gestione in admin: **Moments → Catalogo vendita**.

---

## Flusso ordine Shopify

1. Cliente compra su Shopify
2. Webhook → Worker verifica firma HMAC
3. Worker → Supabase `ingest_shopify_order`
4. Crea `platform_orders` + assegna codici NFC (logica bundle)
5. (Fase 2) Email Resend con codice attivazione
6. Tu spedisci con Packlink — etichetta da Shopify

---

## Migrazione personale → P.IVA

| Servizio | Cosa fare |
|----------|-----------|
| Shopify | Settings → Store details → P.IVA e ragione sociale |
| Stripe | Nuovo account business consigliato → aggiorna secret Worker |
| Packlink | Account business con P.IVA |
| KhamaKey | Solo nuovi secret Cloudflare — il codice non cambia |

---

## Fasi roadmap

| Fase | Contenuto | Stato |
|------|-----------|-------|
| **E0** | SQL v64 + catalogo admin + piano doc | in corso |
| **E1** | Webhook ordini Shopify + assegnazione codici | in corso |
| **E2** | Sync catalogo admin → Shopify (pulsante) | in corso |
| **E3** | Email ordine + attivazione (Resend) | prossima |
| **E4** | Packlink / tracking in admin | prossima |
| **E5** | Etsy / Amazon / TikTok | dopo Shopify live |

---

## Test locale Worker

```bash
cd worker
cp .env.example .dev.vars
# compila SHOPIFY_* e WEBHOOK_INGEST_KEY
npx wrangler dev
```

Health check: `GET /health` → `"shopify": true/false`

Sync manuale (da admin autenticato): pulsante **Sincronizza Shopify** nel catalogo.
