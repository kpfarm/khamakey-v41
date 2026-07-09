# KhamaKey — Integrazioni e prossimi sprint

Roadmap operativa oltre Shopify (Sprint E). Le **chiavi segrete** restano solo su Cloudflare Worker (`wrangler secret put`); l'admin tiene metadati e stato.

## Architettura

```
KhamaKey Admin (fonte catalogo / ordini)
        │
        ▼
Cloudflare Worker (webhook + API + email)
        │
   ┌────┴────┬─────────┬──────────┐
   ▼         ▼         ▼          ▼
Shopify   Stripe    PayPal    Resend
(Moments) (Business) (alt.)   (email)
        │
        ▼
Supabase (ordini, codici NFC, log webhook, traduzioni)
```

## Stato attuale (v102)

| Servizio | Uso | Worker | Admin | SQL |
|----------|-----|--------|-------|-----|
| **Shopify** | Vendita Moments | ✅ sync + webhook ordini | ✅ Catalogo vendita | v64–v65 |
| **Resend** | Prenotazioni Business + email ordini | ✅ booking; 🟡 ordine Shopify | ✅ Integration Hub | v66 |
| **Stripe** | Abbonamenti Business, setup fee | 🟡 webhook stub | ✅ piani + hub | v66 |
| **PayPal** | Pagamenti alternativi | 🟡 webhook stub | ✅ hub | v66 |
| **i18n** | IT EN FR DE ES | 🟡 modulo condiviso | ✅ lingue + catalog_i18n | v66 |

Legenda: ✅ operativo · 🟡 predisposto · ⬜ da fare

## Sprint F — Pagamenti e email ordini (prossimo)

### F1 Resend ordini Moments (E3)
- [x] Email post-ordine Shopify con codici NFC + link attivazione (`moments.html?code=`)
- [x] Invio solo su ordine pagato; dedup con `activation_email_sent_at`
- [ ] Template multilingua completo (IT/EN base ok)
- [ ] Secret `RESEND_API_KEY` in produzione

### F2 Stripe Business
- [x] Webhook `checkout.session.completed` → `ingest_stripe_checkout_event`
- [x] `POST /api/billing/stripe/checkout-session` da Admin → Piani
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` nel Worker
- [ ] Payment Link da landing khamakey.it

### F3 PayPal (opzionale)
- [ ] OAuth app PayPal + webhook IPN/eventi
- [ ] Stesso flusso ordine → `platform_payment_transactions`

## Sprint G — Catalogo multilingua

- [ ] Admin: tab traduzioni per SKU (nome + descrizione per locale)
- [ ] Sync Shopify: `translations` API o prodotti duplicati per market
- [ ] Pagina pubblica Moments: `?lang=en` + selettore lingua
- [ ] Business editor: già predisposto (5 lingue in `editor.html`)

## Sprint H — Logistica e marketplace

- [ ] Packlink / tracking spedizioni (E4)
- [ ] Etsy / Amazon / TikTok (E5)
- [ ] Dashboard automazioni (stock basso, ordine non attivato)

## Configurazione secrets Worker

```bash
cd worker
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put PAYPAL_WEBHOOK_ID
```

## Webhook URL (produzione)

| Provider | URL |
|----------|-----|
| Shopify ordini | `https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/shopify/orders` |
| Stripe | `https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/stripe` |
| PayPal | `https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/paypal` |
| Resend | `https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/resend` |

Verifica stato: `GET /health` o Admin → Integrazioni → **Aggiorna stato Worker**.

## SQL da applicare

Dopo v65: `sql/khamakey-integrations-i18n-v66.sql`
