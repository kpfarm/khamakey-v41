# 21 — Officina NFC Moments

> Aggiornamento 2026-07-18: `moments-admin.html` è la consolle **solo Moments** (produzione NFC + clienti + assistenza). Non mostra Attività Business né integrazioni Shopify.

## Cosa fa questa consolle

| Attività | Dove |
|----------|------|
| Modelli prodotto magazzino (codice MOM-…) | Officina NFC |
| Generazione codici, etichette barcode | Officina NFC |
| Link chip `/k/`, attivazione editor | Officina NFC |
| Clienti attivati, pagine `/m/` | Officina NFC → Clienti |
| Supporto tecnico (codice, NFC, pagina) | Officina NFC → Supporto |

## Flusso operativo

```text
Officina NFC
  Modello (MOM-KEY-WED) → genera pezzo/i → etichetta barcode → confezione a scaffale
  → consegna al cliente

Cliente
  moments.html + codice attivazione in confezione → editor → pagina /m/ live
```

## Formato codici (v156)

| Uso | Formato | Chi lo usa |
|-----|---------|------------|
| **Attivazione** | 12 caratteri alfanumerici, stampati `XXXX-XXXX-XXXX` | Cliente (digitazione su moments.html) |
| **Barcode confezione** | 12 cifre numeriche | Solo magazzino (scan etichetta) |
| **Chip NFC** | QR → `/k/{codice attivazione}` | Programmazione chip in officina |

Lo script SQL `sql/khamakey-moments-activation-codes-v156.sql` va applicato su Supabase prima di generare nuovi pezzi.

## Entry point

- URL produzione: `https://app.khamakeymoments.com/moments-admin`
- Su dominio Moments, `admin.html` (Business) reindirizza a `moments-admin.html`
- Se il magazzino sembra vuoto ma i codici esistono in DB: chip **Tutti** o **Mostra tutti** (filtri orfani)

Vedi anche [`19-admin-console-operativa.md`](19-admin-console-operativa.md).
