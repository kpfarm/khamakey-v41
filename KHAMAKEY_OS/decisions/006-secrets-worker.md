# ADR-006: Secrets solo su Worker

**Data:** 2026-07-09  
**Stato:** Accettata

## Contesto

Integrazioni con Shopify, Stripe, PayPal, Resend richiedono chiavi API. L'admin è un frontend statico accessibile dal browser.

## Decisione

- Tutti i **secrets** restano su Cloudflare Worker (`wrangler secret put`)
- L'admin tiene solo **metadati e stato** (configurato sì/no, ultimo sync…)
- Mai committare `.env`, `.dev.vars`, chiavi API

## Conseguenze

- Sicurezza: chiavi non esposte nel frontend
- Worker come unico punto di contatto con API esterne
- Setup secrets documentato in `docs/08-cloudflare.md` e `docs/09-shopify.md`
