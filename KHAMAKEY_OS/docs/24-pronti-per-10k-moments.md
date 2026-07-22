# 24 — Pronti per 10.000 Moments (basi solide)

> **Obiettivo:** vendere/consegnare fino a ~10.000 pezzi con tranquillità, senza recensioni negative da “software rotto”.  
> **Non è un refactor.** È ops + disciplina di release. Business resta fuori scope.  
> Stack: Cloudflare Pages + Worker + Supabase + R2 — adatto a questa scala.

## Cosa regge già

| Pezzo | Perché |
|-------|--------|
| Pagina `/m/` + NFC `/k/` | Edge Cloudflare — migliaia di letture/giorno ok |
| Media (foto/video) | R2 — non gonfia il database |
| Account / pagine / RSVP | Supabase — 10k profili/eventi è carico normale |
| Rate limit | Già su upload, RSVP, PIN, API — protegge i picchi |

**10.000 pezzi ≠ 10.000 online insieme.** Tipico: attivazioni sparse + tante aperture NFC leggere.

---

## Checklist basi (prima / durante la crescita)

### 1 — Smoke fisso (ogni release Moments)

Prima di pubblicare codice che tocca editor o Worker:

1. Attiva / apri un Moment di prova  
2. Salva + pubblica  
3. Apri `/m/…` da **smartphone**  
4. Prova chip `/k/…` (o URL NFC)  
5. Carica 1 foto + 1 video corto  

Dettaglio: [`23-smoke-moments.md`](23-smoke-moments.md).  
**Regola:** se lo smoke fallisce → niente release, fix mirato, zero redesign.

### 2 — Monitoraggio minimo

| Cosa | Dove | Azione se rosso |
|------|------|-----------------|
| Errori Worker | Cloudflare → Workers → Logs / Observability | Fermare deploy, fix |
| Errori Pages | Cloudflare → Pages | Idem |
| Auth / DB | Supabase Dashboard → logs / advisors | Non “ampliare” RLS alla cieca |

Obiettivo: accorgersi in ore, non dalle recensioni.

### 3 — Media e quote (recensioni tipiche)

- Limiti piano Free/Plus/Pro già in prodotto — **non** promettere video illimitati  
- Messaggi chiari se upload fallisce (peso / tipo file)  
- Evitare release che cambiano upload R2 senza smoke telefono

### 4 — Attivazione e NFC (recensioni tipiche)

- Codice confezione ≠ URL chip (già separati in Officina)  
- PDF / etichette: smoke su 1 pezzo reale prima di lotti grossisti  
- Se un lotto non apre: procedura “sostituisci / ri-associa” in Admin, non silenzio

### 5 — Supporto (prima del picco)

- Ticket Moments → email staff già operativo  
- Decinire risposta target (es. entro 24–48h lavorative)  
- Template risposte: attivazione, NFC, upload, “pagina non si apre”

### 6 — Servizi esterni (non devono far sembrare Moments rotto)

| Servizio | Se cade | Comportamento atteso |
|----------|---------|----------------------|
| AstroWay (oroscopo) | Timeout / key | Pagina `/m/` ok; oroscopo assente o fallback — **mai** pagina bianca |
| Resend | Problemi invio | Ticket/RSVP email; prodotto core resta usabile |
| Shopify / e-commerce | Checkout | Fuori dal runtime Moments editor |

### 7 — Database quando cresci (additivo, basso rischio)

Verso migliaia di righe: indici sulle FK Moments (backlog performance già noto).  
**Non** riscrivere RLS “per performance” senza piano dedicato.

Secrets / Auth: [`22-ops-secrets-auth-checklist.md`](22-ops-secrets-auth-checklist.md).

---

## Cosa non fare (protegge dalle regressioni)

- Refactor grandi di `moments.js` / `renderMomentPage` “per scalare”  
- Multilingua UI finché non serve davvero vendere estero  
- Toccare Business nello stesso deploy di Moments  
- Release senza smoke telefono  
- Ampliare CSP / RLS per sbloccare un bug

---

## Soglie mentali

| Scala | Postura |
|-------|---------|
| ~1.000 pezzi | Ok con smoke + supporto base |
| ~10.000 pezzi | Ok con checklist sopra + monitoraggio attivo |
| Decine di migliaia + molto video | Rivedere quote R2, indici DB, eventuale piano Cloudflare/Supabase — **senza** rifare il prodotto |

---

## Priorità unica

> **Stabilità > feature.**  
> Recensioni negative si evitano tenendo attivazione, NFC, salva/pubblica e upload affidabili — non aggiungendo sezioni.

*KhamaKey OS — basi 10k Moments · 2026-07-22*
