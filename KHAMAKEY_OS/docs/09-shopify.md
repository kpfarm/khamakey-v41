# 09 — Shopify e pagamenti

## Architettura integrazioni

```text
Admin KhamaKey (fonte catalogo / ordini)
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
Supabase (ordini, codici NFC, log webhook)
```

---

## Shopify (Moments)

**Priorità 1** — e-commerce principale Moments.

### Flusso
1. Admin crea SKU in catalogo vendita
2. Sync prodotto su Shopify (bozza → live con `shopify_live`)
3. Cliente ordina su Shopify
4. Webhook ordine → Worker → Supabase
5. Generazione codici NFC + email Resend con link attivazione

### Setup
Guida completa: [`../../SHOPIFY-SETUP.md`](../../SHOPIFY-SETUP.md)

Checklist account:
- [ ] Negozio Shopify creato
- [ ] Custom app con scopes `read/write_products`, `read/write_orders`
- [ ] Webhook ordini configurato
- [ ] Secrets in Worker

### SQL
- v64: sales channels
- v65: catalogo Shopify live

---

## Stripe (Business)

Abbonamenti e setup fee per linea Business.

### Stato
- [x] Webhook `checkout.session.completed` → `ingest_stripe_checkout_event`
- [x] `POST /api/billing/stripe/checkout-session` da Admin
- [ ] Secrets in produzione

Setup temporaneo: [`../../STRIPE-PERSONAL-SETUP.md`](../../STRIPE-PERSONAL-SETUP.md)

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## PayPal (opzionale)

- [ ] OAuth app PayPal + webhook
- [ ] Stesso flusso ordine → `platform_payment_transactions`
- Admin Integration Hub predisposto

---

## Resend (email)

| Uso | Stato |
|-----|-------|
| Prenotazioni Business | ✅ Operativo |
| Email ordine Moments (codici NFC) | ✅ Implementato |
| Template multilingua | 🟡 IT/EN base |

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
```

---

## Canali vendita

| Canale | Ruolo | Stato |
|--------|-------|-------|
| **Shopify** | E-commerce Moments | Operativo |
| **Stripe** | Business + landing khamakey.it | Predisposto |
| **Etsy / Amazon** | Marketplace fase 2 | Via Shopify o LitCommerce |
| **Rivenditori** | Lotti NFC offline | Operativo |
| **khamakey.it** | Landing Business + lead | Stripe Payment Link (futuro) |

---

## Sprint F (prossimo)

- [ ] Stripe secrets in produzione
- [ ] Price ID in Admin → Piani
- [ ] Template email multilingua completo
- [ ] Hook provvigioni rete su ingest Stripe (v69)

Vedi anche [`../../INTEGRATIONS-ROADMAP.md`](../../INTEGRATIONS-ROADMAP.md).
