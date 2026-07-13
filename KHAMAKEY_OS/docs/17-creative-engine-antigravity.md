# 17 — Creative Engine Antigravity

> Protocollo operativo per usare Antigravity come motore creativo KhamaKey.

---

## Obiettivo

Antigravity deve produrre contenuti pronti o quasi pronti per vendere:

- immagini prodotto;
- mockup ambientati;
- grafiche social;
- asset per Amazon e TikTok Shop;
- storyboard e script per video verticali;
- prototipi HTML di landing e generatori visuali.

Il risultato deve essere riusabile da Codex, Cursor, Claude e futuri agenti senza dipendere dalla chat o da percorsi locali temporanei.

---

## Flusso Standard

1. **Brief**
   - linea: `moments`, `business`, `reseller`;
   - prodotto/SKU se esiste;
   - canale: Shopify, Amazon, TikTok Shop, Instagram, Reels, brochure;
   - formato richiesto: 1:1, 4:5, 9:16, hero, PDF, HTML demo;
   - CTA e offerta.

2. **Generazione**
   - Antigravity crea varianti visuali e copy.
   - Ogni output deve avere nome descrittivo, non timestamp puro.
   - Le immagini approvate vengono copiate nel vault.

3. **Archiviazione**
   - immagini social: `KHAMAKEY_OS/assets/marketing/social/`;
   - immagini prodotto: `KHAMAKEY_OS/assets/marketing/product/`;
   - asset marketplace: `KHAMAKEY_OS/assets/marketing/marketplace/`;
   - asset landing/demo: `KHAMAKEY_OS/assets/marketing/landing/`;
   - materiali rivenditori: `KHAMAKEY_OS/assets/marketing/reseller/`;
   - script video: `KHAMAKEY_OS/assets/marketing/video/`;
   - sorgenti Antigravity: `KHAMAKEY_OS/assets/marketing/source-antigravity/`;
   - copy finale: `KHAMAKEY_OS/docs/`.

4. **Manifest**
   - ogni asset approvato ha una riga in `KHAMAKEY_OS/assets/marketing/asset-manifest.md`;
   - se l'asset deriva da un file esterno, il manifest indica il percorso sorgente;
   - se manca verifica visuale, stato = `da verificare`.

5. **Pubblicazione**
   - niente asset in produzione senza percorso stabile nel repo o in R2;
   - niente link `file:///Users/...` dentro documenti ufficiali;
   - ogni file > 5 MB va fuori Git e deve essere registrato nel manifest.

---

## Pacchetto Minimo Per Nuovo Prodotto

Per ogni prodotto fisico destinato alla vendita:

| Output | Necessario |
|--------|------------|
| Hero prodotto | Si |
| Immagine uso reale | Si |
| Immagine "come funziona" | Si |
| Copy breve social | Si |
| Scheda prodotto marketplace | Si |
| Script video 9:16 | Si |
| FAQ/obiezioni | Si |
| Manifest asset | Si |

---

## Convenzione Nomi

Formato consigliato:

```text
<linea>-<prodotto>-<canale>-<formato>-<variante>.<estensione>
```

Esempi:

```text
moments-love-keyring-product-hero-v1.png
moments-love-keyring-reels-script-v1.md
business-table-nfc-instagram-1x1-v1.png
reseller-starter-kit-whatsapp-card-v1.png
```

---

## Stato Degli Asset

Usare questi stati nel manifest:

- `bozza`: generato ma non revisionato;
- `da verificare`: visivamente promettente, manca controllo umano;
- `approvato`: pronto per uso commerciale;
- `pubblicato`: gia' usato su un canale;
- `archiviato`: non usare.

---

## Cosa Non Fare

- Non lasciare asset finali solo dentro `.gemini/`, download temporanei o chat.
- Non usare nomi come `image_123.png` o timestamp senza significato.
- Non mescolare mockup demo con asset approvati.
- Non inserire nei documenti ufficiali link assoluti `file:///Users/...`.
- Non sovrascrivere un asset approvato: creare `v2`, `v3`, ecc.

---

## Prima Applicazione

Asset normalizzati il 2026-07-13:

- `moments-promo-instagram.png`
- `business-promo-instagram.png`
- `khamakey-love-keyring.png`
- catalogo sorgente Antigravity e walkthrough del Visual Marketing Lab.

Vedi manifest: [`../assets/marketing/asset-manifest.md`](../assets/marketing/asset-manifest.md).
