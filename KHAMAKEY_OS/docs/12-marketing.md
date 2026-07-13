# 12 — Marketing

> Regia ufficiale per contenuti commerciali, social, marketplace e asset generati dagli agenti creativi.

---

## Ruolo di Antigravity

Antigravity e' il motore creativo operativo per:

- immagini prodotto e mockup premium;
- grafiche per vendita e marketplace;
- post social statici;
- storyboard e script video brevi;
- landing demo e prototipi visuali;
- varianti creative per linee Moments, Business e rivenditori.

Il suo output non deve restare in cartelle temporanee o in percorsi personali. Ogni consegna utile va normalizzata nel vault `KHAMAKEY_OS/` seguendo il sistema di stoccaggio in [`../assets/README.md`](../assets/README.md).

Percorso operativo unico: `KHAMAKEY_OS/assets/marketing/`.

---

## Canali

| Canale | Uso | Stato |
|--------|-----|-------|
| **khamakey.it** | Landing Business + lead | Attivo |
| **Shopify** | Vendita Moments | Sprint E completato |
| **Amazon / TikTok Shop** | Schede prodotto e marketplace secondari | In preparazione |
| **Instagram / Facebook** | Awareness, prove prodotto, retargeting | In preparazione |
| **TikTok / Reels** | Video brevi, POV, demo NFC | In preparazione |
| **Rivenditori** | Vendita locale + B2B | Operativo |

---

## Linee Prodotto

### Moments

- Oggetti NFC regalo: portachiavi, card, magneti, confezioni.
- Promessa: un ricordo fisico che apre una pagina digitale personale.
- Asset prioritari: prodotto in mano, tap NFC, pagina Memories sul telefono, confezione regalo, coppia/famiglia/evento.

### Business

- Tag NFC e supporti da tavolo per attivita' locali.
- Promessa: menu, prenotazioni, recensioni e informazioni sempre aggiornate in un tap.
- Asset prioritari: ristorante/hotel/bar, espositore NFC, telefono con pagina aperta, prima/dopo PDF vs pagina interattiva.

### Rivenditori

- Materiali per vendita locale e spiegazione rapida.
- Promessa: prodotto semplice da mostrare e rivendere.
- Asset prioritari: brochure, PDF, script WhatsApp, immagini dimostrative, listino visuale.

---

## Asset Ufficiali Salvati

| Asset | Tipo | Uso | Percorso |
|-------|------|-----|----------|
| Moments promo Instagram | Immagine social | Post, ads, copertina ecommerce | [`../assets/marketing/social/moments-promo-instagram.png`](../assets/marketing/social/moments-promo-instagram.png) |
| Business promo Instagram | Immagine social | Post B2B, ads, landing | [`../assets/marketing/social/business-promo-instagram.png`](../assets/marketing/social/business-promo-instagram.png) |
| KhamaKey Love keyring | Immagine prodotto | Shopify, Amazon, TikTok Shop, ads | [`../assets/marketing/product/khamakey-love-keyring.png`](../assets/marketing/product/khamakey-love-keyring.png) |
| Catalogo sorgente Antigravity | Documento sorgente | Archivio output originale | [`../assets/marketing/source-antigravity/marketing-assets-catalog-antigravity.md`](../assets/marketing/source-antigravity/marketing-assets-catalog-antigravity.md) |
| Piano Visual Marketing Lab | Documento sorgente | Roadmap tool creativo | [`../assets/marketing/source-antigravity/implementation-plan-antigravity.md`](../assets/marketing/source-antigravity/implementation-plan-antigravity.md) |
| Walkthrough Visual Marketing Lab | Documento sorgente | Uso e verifica | [`../assets/marketing/source-antigravity/walkthrough-antigravity.md`](../assets/marketing/source-antigravity/walkthrough-antigravity.md) |

Manifest operativo: [`../assets/marketing/asset-manifest.md`](../assets/marketing/asset-manifest.md).

---

## Copy e Video

| Documento | Contenuto |
|-----------|-----------|
| [`16-sales-copy-love.md`](16-sales-copy-love.md) | Copy vendita per Portachiavi KhamaKey Love: landing, e-commerce, social ads, FAQ |
| [`17-creative-engine-antigravity.md`](17-creative-engine-antigravity.md) | Protocollo per usare Antigravity come motore creativo e archiviare ogni output |

Per ogni nuovo prodotto creato da Antigravity devono esistere almeno:

1. immagine prodotto o mockup;
2. copy breve social;
3. copy scheda prodotto;
4. script video 9:16;
5. indicazione canale: Shopify, Amazon, TikTok Shop, Instagram, rivenditori;
6. manifest con autore, data, prompt o brief, percorso file, stato approvazione.

---

## Regole Di Pubblicazione

- Gli asset approvati stanno in `KHAMAKEY_OS/assets/marketing/`.
- La destinazione dipende dal tipo: `product/`, `social/`, `video/`, `marketplace/`, `landing/`, `reseller/`, `source-antigravity/`.
- I prototipi HTML o file demo restano nella root solo finche' sono in lavorazione; dopo approvazione vanno spostati o documentati.
- I file generati fuori repo, per esempio `.gemini/antigravity-ide/brain/...`, sono solo sorgenti temporanee.
- Ogni immagine usata in Shopify/Amazon/TikTok Shop deve avere una riga nel manifest.
- Ogni video deve avere storyboard, script, formato, CTA e destinazione.
- Non committare file oltre 5 MB: usare R2 o una cartella di consegna esterna documentata nel manifest.

---

## TODO

- [x] Creare `demo_marketing_assets.html` (completato e integrato nella root del progetto).
- [ ] Definire template ripetibili per immagini prodotto: Hero, Dettaglio, Come funziona, Confezione, Uso reale.
- [ ] Creare pacchetto rivenditori: PDF, immagini WhatsApp, script chiamata, listino visuale.
- [ ] Creare video demo tap NFC per Moments e Business.
- [ ] Preparare listing Amazon/TikTok Shop per linea Love.
- [ ] Collegare gli asset marketing agli SKU del catalogo Admin.

---

## Analytics

Worker endpoint `POST /event` per tracking visite pagine pubbliche.

Dashboard admin: alert operativi e lettura delle performance per ordini, pagine e conversioni.
