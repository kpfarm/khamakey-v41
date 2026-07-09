# 11 — Produzione NFC

> **Stato:** processo operativo — da documentare con dettaglio produzione fisica.

---

## Componenti fisici

| Elemento | Descrizione |
|----------|-------------|
| **Tag NFC** | Chip NTAG / equivalente |
| **Supporto** | Cartoncino, legno, acrilico… |
| **Personalizzazione** | Logo, testi, colori (Business custom) |
| **Codice** | URL `/k/{code}` univoco |

---

## Flussi produzione

### Business (custom)
```text
Brief rivenditore (logo, testi, colori, qty)
        │
        ▼
Produzione tag personalizzati
        │
        ▼
Spedizione al rivenditore
        │
        ▼
Rivenditore → cliente finale
```

### Moments (standard)
```text
Generazione lotti codici in admin (stock-first)
        │
        ▼
Produzione tag con codice pre-associato
        │
        ▼
Spedizione diretta (online) o a rivenditore (offline)
```

---

## Magazzino software

Gestito in admin (SQL v42+):
- Lotti con quantità
- Codici individuali con stato (disponibile, venduto, attivato)
- Assegnazione a ordine o rivenditore
- Stock-first: genera senza rivenditore, assegna dopo

---

## TODO

- [ ] Documentare fornitori tag NFC
- [ ] Tempi produzione e MOQ
- [ ] Template brief personalizzazione Business
- [ ] Processo QC pre-spedizione
- [ ] Tracking spedizioni (integrazione corriere)

---

## Riferimenti

- Magazzino admin: [`05-admin.md`](05-admin.md)
- Rivenditori: [`06-rivenditori.md`](06-rivenditori.md)
- Database codici: [`07-database.md`](07-database.md)
