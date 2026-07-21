# 21 — Officina NFC Moments

> Aggiornamento 2026-07-20: sicurezza scaffale — codice attivazione **solo in confezione**; chip NFC = `/m/<slug opaco>`.

## Cosa fa questa consolle

| Attività | Dove |
|----------|------|
| Modelli prodotto magazzino (codice MOM-…) | Officina NFC |
| Generazione codici, PDF etichette Cricut (4 sezioni) | Officina NFC |
| Link chip `/m/<slug>`, attivazione editor | Officina NFC |
| Clienti attivati, pagine `/m/` | Officina NFC → Clienti |
| Supporto tecnico (codice, NFC, pagina) | Officina NFC → Supporto |

## Flusso operativo

```text
Officina NFC
  Modello (MOM-KEY-WED) → genera pezzo/i
  → CSV + PDF 4 sezioni Cricut: panoramica · ovali (spiega+codice) · barcode · URL NFC completo
  → stampa/taglia etichette · programma chip con URL completo · codice in inserto
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

### PDF etichette Cricut (Admin v177)

Export magazzino → un PDF A4 con **4 sezioni** (si ripaginano se il lotto è grande), stessa numerazione da 1:

1. **Panoramica** — CATEGORIA / QUANTITÀ + `# · ovale · barcode · URL NFC completo` (foglio di controllo, non da tagliare)
2. **Ovali codice** (52×22 mm) — inserto confezione: testo *«Per attivare la pagina»* + codice + *«Inseriscilo nell'app Moments»*
3. **Rettangoli barcode** (42×16 mm) — solo barcode magazzino (niente codice attivazione, niente # nel riquadro)
4. **Rettangoli link NFC** (72×18 mm) — URL completo `https://link.khamakeymoments.com/m/<slug>` da copiare sul chip

**Azione officina:** pezzi già in magazzino con chip vecchio `/k/CODICE` vanno **riprogrammati** con il nuovo Link NFC URL completo dal magazzino.

SQL: `sql/khamakey-moments-opaque-slug-v160.sql` (applicato su Supabase).

## Entry point

- URL produzione: `https://app.khamakeymoments.com/moments-admin`
- Su dominio Moments, `admin.html` (Business) reindirizza a `moments-admin.html`
- Se il magazzino sembra vuoto ma i codici esistono in DB: chip **Tutti** o **Mostra tutti** (filtri orfani)

Vedi anche [`19-admin-console-operativa.md`](19-admin-console-operativa.md).
