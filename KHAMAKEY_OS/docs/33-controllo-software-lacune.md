# 33 — Controllo software e lacune (Moments)

> **Data:** 2026-09-05 · **Stato:** in corso · **Ticket copertina:** chiuso (v254–v255 / Worker v219–v220) · **Ticket contatore/scroll:** chiuso (v256 / Worker v221) · **Ticket video upload:** chiuso (v257/v222 + tetto **90 MB** v258/v223/SQL v173)  
> Live previsto dopo deploy: Worker **v223-video-90** · Privacy/Termini IT+EN **200**  
> Smoke storico: [[23-smoke-moments]] · Go-live: [[31-go-live-smoke-moments]] · i18n: [[27-moments-i18n-rules]]

## Come usiamo questo file

1. Ticket / piccoli bug segnalati dai clienti → uno alla volta, con reproduce; esito sotto.
2. Qui restano **lacune di prodotto/ops** da controllare senza toccare la catena NFC/upload.
3. Ogni check chiuso: data + esito in tabella. Aggiornare anche [[PROJECT_STATE]] e [[13-roadmap]].

---

## Ticket clienti

| Data | Segnalazione | Esito |
|------|----------------|-------|
| 2026-09-05 | Selfie copertina ritagliato subito; Alto/Centro/Basso + zoom 100–200% giudicati inutili | ✅ **v254/v219** tutta la foto vs riempi; **v255/v220** sfondo sfuocato in «Tutta la foto». |
| 2026-09-05 | Contatore storto/incompleto in anteprima; scroll che si blocca | ✅ **v256/v221** etichette scure su card, griglia 3/4 col; iframe anteprima = unico scroll. |
| 2026-09-05 | Caricamento video: niente succede (salvo clip ~7 s); nessuna notifica | ✅ **v257/v222** banner visibile; **v258/v223/SQL v173** tetto **90 MB**/video (Free resta 1 clip). |

Altri ticket restano in coda, uno alla volta.

---

## Check automatici (senza login) — 2026-09-05

| # | Check | Esito |
|---|--------|-------|
| H1 | `GET https://link.khamakeymoments.com/health` → `v218-legal-en`, media, Supabase, Resend, Shopify, AstroWay | ✅ |
| H2 | Stripe / PayPal / OpenAI in health | `not_configured` (atteso) |
| H3 | Privacy IT `/moments-privacy` | ✅ 200 |
| H4 | Privacy EN `/moments-privacy-en` | ✅ 200 |
| H5 | Termini EN `/moments-terms-en` | ✅ 200 |

---

## Lacune da controllare (ordine)

| # | Area | Cosa verificare | Rischio se si tocca codice | Stato |
|---|------|-----------------|----------------------------|--------|
| 1 | Catena NFC | Smoke 1–3 di [[31-go-live-smoke-moments]]: login, Salva, `/m/`, chip = stesso slug, 1 foto | Alto se “fix” a caso | ⬜ da rifare su pezzo reale (ultime B 2026-07-22) |
| 2 | RSVP WhatsApp | Invio da `/m/` → compare in editor (smoke B8 mai fatto) | Medio (non toccare `wa.me` / numero) | ⬜ |
| 3 | Assistenza | Ticket da Account → email staff + riga in Officina (B10) | Basso | ⬜ — utile prima di lavorare i ticket clienti |
| 4 | i18n chrome residuo | `confirm()` «Prepara tutto» / cambio categoria + `TYPE_LABELS` in meta | Basso se solo stringhe | ✅ 2026-09-05 Moments **v253** — Officina resta IT |
| 5 | Seed EN | Con UI EN, «Prepara tutto» → testi EN; frase non in mappa resta IT | Basso (solo mappa) | ⬜ spot su 1 categoria |
| 6 | `/m/` fallback IT | Titoli sezione vuoti / empty hint Worker ancora italiani (non chrome visitatore) | Alto (Worker) | ⬜ annotare, **non** sistemare senza lock Worker |
| 7 | P.IVA | Privacy/Termini senza ragione sociale / sede / partita IVA | Nessuno finché non ci sono dati | ⏸ attesa dati reali |
| 8 | Auth email minori | Magic link, change email, invite (Moments usa conferma + reset) | Ops dashboard | ⏸ basso |
| 9 | Stripe Plus/Pro | Secrets non in Worker | Pagamenti | ⏸ prodotto, non bug editor |
| 10 | Leaked password | Piano Auth Free — non disponibile | Ops | ⏸ documentato |

---

## Cosa non è una lacuna

- Etichette/titoli **scritti dal cliente** che restano in italiano con UI EN — voluto.
- Chrome `/m/` (PIN, RSVP di sistema) nella lingua del **visitatore**, non del titolare — voluto.
- Guestbook pubblico spento — escluso dal prodotto.
- Ticket clienti — coda separata, dopo questo elenco o in parallelo solo se critici (NFC/upload).

---

## Prossimo check consigliato

**3 — Assistenza (B10)** su un account di prova: conferma che i ticket arrivano. Poi si aprono gli altri ticket clienti.

In alternativa, se vuoi solo “il software si apre”: **1 — catena NFC** su un pezzo già attivato (Salva + `/m/` + 1 foto).
