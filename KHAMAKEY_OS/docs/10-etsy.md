# 10 — Etsy e marketplace

> **Stato:** fase 2 — non ancora implementato.

---

## Strategia

Marketplace esterni (Etsy, Amazon, TikTok Shop) come **canali secondari** per Moments.

### Opzioni di integrazione

| Approccio | Pro | Contro |
|---------|-----|--------|
| **Via Shopify** | Un solo hub ordini | Dipendenza Shopify |
| **LitCommerce** | Sync multi-marketplace | Costo aggiuntivo |
| **Manuale** | Zero integrazione | Operativo pesante |

**Raccomandazione attuale:** consolidare Shopify prima, poi valutare LitCommerce o Shopify Markets.

---

## Flusso target

```text
Marketplace (Etsy / Amazon)
        │
        ▼
Shopify (hub ordini) oppure import manuale
        │
        ▼
Worker webhook → Supabase
        │
        ▼
Codici NFC + email attivazione
```

---

## TODO

- [ ] Definire SKU Moments per Etsy
- [ ] Valutare LitCommerce vs Shopify Markets
- [ ] Template listing Etsy (copy + immagini)
- [ ] Politica resi e spedizioni marketplace

---

## Riferimenti

- Canali vendita: [`09-shopify.md`](09-shopify.md)
- Produzione NFC: [`11-produzione.md`](11-produzione.md)
