# 31 — Go-live Moments: checklist test funzionale

> **Data test:** 2026-07-29 · **Chi:** _________________  
> **Versioni attese:** Editor Moments **v222** · Admin/Officina **v179** · Worker **v187-media-i18n**  
> **Scopo:** ultimo giro prima di considerare il software pronto. Segna ✅ / ❌ / N/A + nota breve.  
> Smoke storici: [`23-smoke-moments.md`](23-smoke-moments.md) · i18n [`28-moments-i18n-smoke.md`](28-moments-i18n-smoke.md)

**Regola:** se fallisce un check **critico** (sezioni 1–3), stop — fix mirato, non “si va avanti lo stesso”.

---

## 0 — Ambiente (2 min)

| # | Check | Come | Esito | Nota |
|---|-------|------|-------|------|
| 0.1 | Worker live | `https://link.khamakeymoments.com/health` → `version` = `v187-media-i18n`, `media: true` | ⬜ | |
| 0.2 | Editor cache | `moments.html` / Network → `moments.js?v=222`, `moments.css?v=222` | ⬜ | hard refresh se serve |
| 0.3 | Officina cache | `moments-admin` → `admin.js?v=179` | ⬜ | |

---

## 1 — Catena prodotto NFC (CRITICO)

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 1.1 | Login Moments | `app.khamakeymoments.com/moments` → Accedi | ⬜ | |
| 1.2 | Editor apre | Esce da “Apertura…”, topbar + sezioni | ⬜ | |
| 1.3 | Attivazione *(se hai codice fresco)* | Codice confezione → account → editor sulla pagina del pezzo | ⬜ | N/A se usi pezzo già claimato |
| 1.4 | Salva | Piccola modifica testo → Salva → toast ok | ⬜ | |
| 1.5 | Ricarica editor | Reload → modifica ancora lì | ⬜ | |
| 1.6 | Pubblica | Sezione Pubblica / toggle → live | ⬜ | |
| 1.7 | Link pubblico | Riepilogo → Apri / Copia → `/m/<slug>` 200 | ⬜ | |
| 1.8 | Chip = stesso URL | URL chip/Officina = stesso `/m/<slug>` della pagina | ⬜ | **mai** codice attivazione sul chip |
| 1.9 | PIN *(se attivo)* | Gate PIN → PIN corretto apre; sbagliato no | ⬜ | N/A se senza PIN |

---

## 2 — Upload media (CRITICO)

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 2.1 | Foto galleria | Carica 1 foto → ok in editor | ⬜ | |
| 2.2 | Persistenza | Ricarica editor → foto ancora lì | ⬜ | |
| 2.3 | Pagina pubblica | `/m/` mostra la foto | ⬜ | |
| 2.4 | Video *(se piano lo consente)* | 1 video entro limite → ok | ⬜ | Free: 1 clip |
| 2.5 | Delete | Rimuovi un media → sparisce da editor e sync storage | ⬜ | |
| 2.6 | Contatore storage | Riepilogo: MB usati **> 0** dopo upload (non restare a 0 B) | ⬜ | |
| 2.7 | Limite file | File oltre max piano → rifiuto chiaro (client o 413) | ⬜ | es. foto > 8 MB |

---

## 3 — QR (Officina + Editor)

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 3.1 | PDF lotto 5 sezioni | Officina → genera 1 pezzo (o riesporta) → PDF `…-cricut5.pdf` | ⬜ | |
| 3.2 | Sezione 5 QR | Quadretti 28×28 mm, numerati da 1, contorno taglio | ⬜ | |
| 3.3 | QR = URL pagina | Inquadra QR PDF → apre `/m/<slug>` (**non** codice attivazione) | ⬜ | telefono |
| 3.4 | QR Riepilogo | Editor → Riepilogo → anteprima QR visibile | ⬜ | |
| 3.5 | Scarica QR | Scarica PNG → inquadra → stesso `/m/<slug>` | ⬜ | |

---

## 4 — Pagina pubblica / ospiti

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 4.1 | Contenuti | Titolo, media, sezioni attive ok su `/m/` | ⬜ | |
| 4.2 | Footer legale | Privacy + Termini (o link) presenti | ⬜ | |
| 4.3 | Locale chrome | `?lang=en` o Accept-Language: chrome EN, **testi cliente invariati** | ⬜ | spot check |
| 4.4 | RSVP WA *(se attivo)* | Invio da `/m/` → arriva in editor / WA | ⬜ | N/A se off |
| 4.5 | Oroscopo *(se attivo)* | Persone/segni in editor → testo su `/m/` | ⬜ | N/A se off |

---

## 5 — Editor chrome IT\|EN (spot)

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 5.1 | Default IT | UI in italiano | ⬜ | |
| 5.2 | Toggle EN | Riepilogo / shell (Salva, Copia, QR…) in EN | ⬜ | |
| 5.3 | Torna IT | Toggle IT → italiano di nuovo | ⬜ | |
| 5.4 | Contenuti cliente | Titoli/testi scritti da te **non** tradotti automaticamente | ⬜ | |

---

## 6 — Officina (produzione)

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 6.1 | Magazzino lista | Pezzi visibili; filtri non “nascondono tutto” | ⬜ | chip Tutti se serve |
| 6.2 | CSV export | Codice attivazione + URL NFC completo | ⬜ | |
| 6.3 | Programmazione chip | Copia URL sezione 4 / CSV sul tag | ⬜ | |
| 6.4 | Inserto codice | Ovale = solo attivazione (testo), non nel QR | ⬜ | |

---

## 7 — Account / assistenza (opzionale stesso giorno)

| # | Check | Passo | Esito | Nota |
|---|-------|------|-------|------|
| 7.1 | Ticket Moments | Account → Assistenza → invio | ⬜ | |
| 7.2 | Ticket in Officina | Compare in Supporto Admin | ⬜ | |

---

## Esito finale

| | |
|--|--|
| **Data chiusura** | |
| **Critici 1–3** | ⬜ tutti ✅ · ⬜ con ❌ (elenco sotto) |
| **Pronto per go-live Moments?** | ⬜ Sì · ⬜ Sì con riserve · ⬜ No |
| **Riserve / bug aperti** | |
| **Prossimo passo** | Stripe Plus/Pro · altro: ________ |

### Bug trovati (copia qui)

```text
1.
2.
3.
```

---

## Come usare con un agente

Se qualcosa fallisce, apri chat con:

```text
Go-live smoke docs/31 — fallito check X.Y
Versioni: Moments v222 / Admin v179 / Worker v187
Sintomo:
Passi:
Atteso vs ottenuto:
```

*KhamaKey OS — go-live smoke Moments 2026-07-29*
