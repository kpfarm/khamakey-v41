# 33 — Controllo software e lacune (Moments)

> **Data:** 2026-09-12 · **Stato:** in corso · **Ticket copertina:** chiuso (v254–v255 / Worker v219–v220) · **Ticket contatore/scroll:** chiuso (v256 / Worker v221) · **Ticket video upload:** chiuso (v257/v222 + tetto **90 MB** v258/v223/SQL v173) · **Ticket obiettivi/sogni:** chiuso (v259 / Worker v224) · **Ticket ingresso spiegazioni:** chiuso (v260) · **Preventivo contrasto/PIN/liste:** chiuso (v261 / Worker v225) · **Assistenza:** email-only (v262 / Worker v226) · **Icone/emoji nascoste:** chiuso (Worker v227) · **Galleria ritagliata:** chiuso (Worker v228)  
> Live previsto dopo deploy: Worker **v228-gallery-full** · Privacy/Termini IT+EN **200**  
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
| 2026-09-06 | Sezione rinominata «Obbiettivi»: cerchi non flaggabili; testo illeggibile sul rosa | ✅ **v259/v224** cerchio spuntabile in editor + anteprima (Salva); contrasto inchiostro scuro sulle card. `/m/` mostra lo stato, senza toggle visitatore. |
| 2026-09-06 | Pagina con spiegazioni (Riepilogo) come primo schermo all’ingresso editor / dopo attivazione | ✅ **v260** atterra su Pagina → Riepilogo. QR/NFC pubblico `/m/` invariato (pagina ospite). |
| 2026-09-06 | Controllo preventivo (nessun ticket ancora): contrasto card rosa, PIN primo tap, liste intro-only | ✅ **v261/v225** inchiostro scuro su firma/numeri/lettera/RSVP; PIN senza hijack touchend; intro lista senza voci = vuota in pubblico. |
| 2026-09-06 | Assistenza: ricevere i ticket via email e risolverli da lì | ✅ **v262/v226** form Account → email staff; Reply-To = cliente. Niente Officina. |
| 2026-09-07 | Icona inserita (emoji) non visibile in pagina | ✅ **Worker v227** fill contrasto non si applica più alle emoji/icone. |
| 2026-09-07 | Foto galleria ritagliate nel riquadro (es. Parigi); niente regolazione inquadratura | ✅ **Worker v228** tutta la foto + sfondo sfuocato (come copertina). Niente pulsanti per foto. **＋** resta per lo zoom. |
| 2026-09-18 | Foto conto alla rovescia tagliata, niente adattamento orizzontale/verticale | ✅ **Worker v233** contain in `/m/` `/k/`. Editor pannello **v282 live**. |
| 2026-09-18 | Invitato: upload galleria/video sembra ok, notifica illeggibile, file sparisce; 2°–3° tentativo funziona | ✅ **v282 live**: auto-salva dopo upload, retry conflitto senza cancellare il form, errori che restano. |
| 2026-09-18 | Scambi tra editor e anteprime di 3 prodotti (2 titolare, 1 invitato) | ✅ **v283 live**: anteprima e Salva restano agganciati al pezzo aperto; niente copia da un form all’altro. |

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
| 3 | Assistenza | Form Account → email staff; Reply da Gmail (non Officina) | Basso | ✅ by design 2026-09-06 v262/v226 |
| 4 | i18n chrome residuo | `confirm()` «Prepara tutto» / cambio categoria + `TYPE_LABELS` in meta | Basso se solo stringhe | ✅ 2026-09-05 Moments **v253** — Officina resta IT |
| 5 | Seed EN | Con UI EN, «Prepara tutto» → testi EN; frase non in mappa resta IT | Basso (solo mappa) | ⬜ spot su 1 categoria |
| 6 | `/m/` fallback IT | Titoli sezione vuoti / empty hint Worker ancora italiani (non chrome visitatore) | Alto (Worker) | ⬜ annotare, **non** sistemare senza lock Worker |
| 7 | P.IVA | Privacy/Termini senza ragione sociale / sede / partita IVA | Nessuno finché non ci sono dati | ⏸ attesa dati reali |
| 8 | Auth email minori | Magic link, change email, invite (Moments usa conferma + reset) | Ops dashboard | ⏸ basso |
| 9 | Stripe Plus/Pro | Decisione 2026-09-25: un solo piano fino a nuova scelta. Seed Plus/Pro resta in Officina, senza checkout | Pagamenti | ⏸ non al lancio |
| 10 | Leaked password | Piano Auth Free — non disponibile | Ops | ⏸ documentato |
| 11 | Guida cliente / dove si invita | v266 non è intuitiva per i clienti (ok per chi ha fatto l’app) | Basso se solo copy | ⏸ **dopo**, non ora |
| 12 | GDPR Moments | Opt-in marketing assente; consenso legale solo gate UI. P.IVA a parte (#7) | Medio (signup + Privacy IT/EN) | ✅ 2026-09-17 v268 / SQL v176 — export/cancella in Profilo. Resta P.IVA e niente campagne |

---

## Cosa non è una lacuna

- Etichette/titoli **scritti dal cliente** che restano in italiano con UI EN — voluto.
- Chrome `/m/` (PIN, RSVP di sistema) nella lingua del **visitatore**, non del titolare — voluto.
- Guestbook pubblico spento — escluso dal prodotto.
- Ticket clienti — coda separata, dopo questo elenco o in parallelo solo se critici (NFC/upload).

---

## Prossimo check consigliato

**1 — Catena NFC** su un pezzo già attivato (Salva + `/m/` + 1 foto), oppure **2 — RSVP WhatsApp**.

Assistenza: canale = **email** (form in Account). Non aspettare ticket in Officina.
