# 21 — Officina NFC Moments

> Aggiornamento 2026-07-20: sicurezza scaffale — codice attivazione **solo in confezione**; chip NFC = `/m/<slug opaco>`.

## Cosa fa questa consolle

| Attività | Dove |
|----------|------|
| Modelli prodotto magazzino (codice MOM-…) | Officina NFC |
| Generazione codici, etichette barcode | Officina NFC |
| Link chip `/m/<slug>`, attivazione editor | Officina NFC |
| Clienti attivati, pagine `/m/` | Officina NFC → Clienti |
| Supporto tecnico (codice, NFC, pagina) | Officina NFC → Supporto |

## Flusso operativo

```text
Officina NFC
  Modello (MOM-KEY-WED) → genera pezzo/i
  → CSV/PDF: codice attivazione (inserto) + Link NFC /m/slug (chip)
  → programma chip con /m/slug · metti codice in confezione
  → scaffale

Cliente
  apre confezione → codice sull’inserto → moments.html → editor → pagina /m/ live
```

## Formato codici (v156 + sicurezza v160)

| Uso | Formato | Chi lo usa |
|-----|---------|------------|
| **Attivazione** | 12 caratteri alfanumerici, stampati `XXXX-XXXX-XXXX` | Cliente (digitazione su moments.html) — **solo inserto confezione** |
| **Barcode confezione** | 12 cifre numeriche | Solo magazzino (scan etichetta) |
| **Chip NFC** | URL → `/m/{slug opaco}` | Programmazione chip — **mai** il codice attivazione |
| **Slug pubblico** | 12 caratteri opachi ≠ codice (SQL v160) | Link pagina pre/post attivazione |

### Perché

Prima il codice compariva sulla pagina pre-attivazione e spesso coincideva con `/k/codice` o `/m/codice`: in negozio bastava scansionare per rubare l’attivazione. Ora:

1. la pagina `/m/` pre-attivazione **non mostra** il codice (brand Moments)
2. lo slug è **opaco** e diverso dal codice
3. `/k/<codice>` non risolve pezzi `available` (solo dopo claim)
4. CSV/PDF restano la fonte del codice per stampa inserto

**Azione officina:** pezzi già in magazzino con chip vecchio `/k/CODICE` vanno **riprogrammati** con il nuovo Link NFC `/m/slug` dal magazzino.

SQL: `sql/khamakey-moments-opaque-slug-v160.sql` (applicato su Supabase).

## Entry point

- URL produzione: `https://app.khamakeymoments.com/moments-admin`
- Su dominio Moments, `admin.html` (Business) reindirizza a `moments-admin.html`
- Se il magazzino sembra vuoto ma i codici esistono in DB: chip **Tutti** o **Mostra tutti** (filtri orfani)

Vedi anche [`19-admin-console-operativa.md`](19-admin-console-operativa.md).
