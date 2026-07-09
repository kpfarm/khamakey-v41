# 06 — Rivenditori

## Modello

KhamaKey vende attraverso una **rete di rivenditori** con due flussi distinti:

### Business (custom)
```text
Rivenditore compila brief personalizzazione
        │
        ▼
Ordine produzione KhamaKey
        │
        ▼
Spedizione al rivenditore
        │
        ▼
Rivenditore consegna al cliente finale
```

### Moments (codici NFC)
```text
KhamaKey alloca lotto codici a rivenditore
        │
        ▼
Rivenditore vende sul posto (offline)
        │
        ▼
Cliente attiva codice su moments.html
```

---

## Rete v68 (SQL applicato)

| Concetto | Implementazione |
|----------|-----------------|
| Tier / grado | Tabella gerarchica agenti |
| Listini | Prezzi per tier |
| Consegne | Tracking fulfillment |
| RPC | Funzioni Supabase per assegnazione |

File SQL: `sql/khamakey-reseller-network-v68.sql`

---

## Tracciabilità

Campi su `moment_activation_codes`:

- `sold_channel` — online / offline / reseller
- `assigned_agent_id` — rivenditore assegnato
- `platform_order_id` — collegamento ordine

SQL: v61 (canali), v62 (ordini + assegnazione).

---

## Admin

Sezione **Rete rivenditori** in admin:
- Gestione agenti e tier
- Listini per grado
- Assegnazione lotti e consegne
- Copy umano per partner (v106)

---

## Portale self-service (da costruire)

File previsto: `reseller.html` o area con permesso `agents.write`.

Funzionalità target:
- Brief personalizzazione Business (logo, testi, colori, quantità)
- Indirizzo spedizione rivenditore
- Stato ordini e consegne
- Dashboard vendite Moments offline

---

## Roadmap

- [x] SQL v68 rete rivenditori
- [x] Admin rete partner
- [ ] Portale rivenditori self-service
- [ ] Hook provvigioni su ingest Stripe (v69)
