# ADR-005: Shopify first

**Data:** 2026-07-09  
**Stato:** Accettata

## Contesto

Moments può vendere su Shopify, Etsy, Amazon, rivenditori. Serve un canale primario prima di espandersi.

## Decisione

- **Shopify** = e-commerce principale Moments (Sprint E)
- **Stripe** = pagamenti Business (khamakey.it)
- **Etsy/Amazon** = fase 2, via Shopify hub o LitCommerce
- **Rivenditori** = già operativo (lotti NFC offline)

## Conseguenze

- Focus integrazione Shopify completata prima di marketplace
- Worker gestisce webhook ordini Shopify → codici NFC + email
- Etsy documentato ma non implementato (`docs/10-etsy.md`)
