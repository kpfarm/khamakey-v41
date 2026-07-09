# 15 — Decisioni

> Indice delle decisioni architetturali. Dettaglio in [`../decisions/`](../decisions/).

---

## Decisioni attive

| ID | Decisione | Data | File |
|----|-----------|------|------|
| ADR-001 | Stack Cloudflare Pages + Worker + Supabase | 2026-07-06 | [`../decisions/001-stack-cloudflare-supabase.md`](../decisions/001-stack-cloudflare-supabase.md) |
| ADR-002 | Contratto pagina pubblica a 4 punti | 2026-07-06 | [`../decisions/002-contratto-4-punti.md`](../decisions/002-contratto-4-punti.md) |
| ADR-003 | Versioning unificato `?v=` + `WORKER_VERSION` | 2026-07-09 | [`../decisions/003-versioning-unificato.md`](../decisions/003-versioning-unificato.md) |
| ADR-004 | KhamaKey OS come cervello condiviso | 2026-07-09 | [`../decisions/004-khamakey-os.md`](../decisions/004-khamakey-os.md) |
| ADR-005 | Shopify prima, Etsy/marketplace dopo | 2026-07-09 | [`../decisions/005-shopify-first.md`](../decisions/005-shopify-first.md) |
| ADR-006 | Secrets solo su Cloudflare Worker | 2026-07-09 | [`../decisions/006-secrets-worker.md`](../decisions/006-secrets-worker.md) |

---

## Come aggiungere una decisione

1. Crea `decisions/NNN-titolo-breve.md` con formato ADR
2. Aggiungi riga in questa tabella
3. Se la decisione cambia comportamento del codice, aggiorna il doc in `docs/` correlato

### Template ADR

```markdown
# ADR-NNN: Titolo

**Data:** YYYY-MM-DD
**Stato:** Accettata | Proposta | Deprecata

## Contesto
Perché serve questa decisione.

## Decisione
Cosa abbiamo deciso.

## Conseguenze
Cosa implica (positivo e negativo).
```
