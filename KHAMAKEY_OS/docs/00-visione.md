# 00 — Visione

## Cos'è KhamaKey

KhamaKey è una piattaforma SaaS che trasforma **tag NFC fisici** in **pagine digitali personalizzate** per due linee di prodotto:

| Linea | Target | Esperienza |
|-------|--------|------------|
| **Business** | Attività commerciali (ristoranti, hotel, negozi…) | Pagina vetrina con menu, prenotazioni, contatti |
| **Moments** | Eventi personali (matrimoni, compleanni, memorial…) | Pagina ricordo con galleria, programma, RSVP |

---

## Modello prodotto

### Business
- Vendita online + rivenditori con portale personalizzazione
- Personalizzazione alta: logo, brand, contenuti
- Spedizione diretta al cliente **o** al rivenditore (prodotti custom)
- Editor: `editor.html` — sidebar, anteprima live, sezioni a card

### Moments
- Vendita online (Shopify) + offline (rivenditori locali)
- Personalizzazione post-attivazione codice NFC
- Spedizione diretta (online) o tramite rivenditore (offline)
- Editor: `moments.html` — parità UX Business

---

## Architettura tecnica

```text
Browser (editor / admin / moments)
        │
        ▼
Cloudflare Pages (statico)
        │
        ▼
Supabase (auth, dati, storage metadata)
        │
        ▼
Cloudflare Worker (pagine pubbliche, API, webhook)
        │
   ┌────┴────┬─────────┬──────────┐
   ▼         ▼         ▼          ▼
Shopify   Stripe    PayPal    Resend
   │
   ▼
Cloudflare R2 (media: foto, video, audio)
```

---

## Flussi URL

| Percorso | Servizio | Descrizione |
|----------|----------|-------------|
| `/` | Pages | App editor clienti Business |
| `/admin.html` | Pages | Pannello admin piattaforma |
| `/moments.html` | Pages | Area utente Moments |
| `/p/{slug}` | Worker | Pagina pubblica business |
| `/m/{slug}` | Worker | Pagina pubblica Moment |
| `/k/{code}` | Worker | Redirect NFC → business o moment |

---

## Obiettivo strategico

Costruire un **sistema operativo del progetto** (KhamaKey OS) dove:

- Ogni AI lavora sullo stesso cervello
- La documentazione resta allineata al codice
- La conoscenza non si perde tra chat e sessioni

Vedi [`../MASTER_INDEX.md`](../MASTER_INDEX.md).

---

## Servizi centrali condivisi

- Supporto unificato (filtro Business / Moments)
- CRM parallelo (due pipeline)
- Hub spedizioni (automazione corriere + allocazioni rivenditori)
- Integration Hub (Shopify, Stripe, PayPal, Resend, i18n)
