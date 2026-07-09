# ADR-001: Stack Cloudflare + Supabase

**Data:** 2026-07-06  
**Stato:** Accettata

## Contesto

KhamaKey serve pagine pubbliche veloci (NFC tap), un editor ricco e un backend per ordini/webhook. Serve hosting economico, edge performance e database relazionale con auth.

## Decisione

- **Frontend:** HTML/CSS/JS statico su Cloudflare Pages
- **API + renderer:** Cloudflare Worker (edge)
- **Database + auth:** Supabase (Postgres + RLS)
- **Media:** Cloudflare R2

## Conseguenze

- Zero server da gestire, deploy con `wrangler`
- Pagine pubbliche servite dall'edge (bassa latenza NFC)
- RLS Supabase per sicurezza multi-tenant
- Vendor lock-in moderato su Cloudflare + Supabase
