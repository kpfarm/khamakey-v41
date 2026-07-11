# 01 — Brand

> **Stato:** da completare con asset ufficiali.

---

## Identità

| Elemento | Valore |
|----------|--------|
| Nome | KhamaKey |
| Dominio principale | [khamakey.it](https://www.khamakey.it) |
| App | `khamakey-app.pages.dev` |
| NFC Worker | `khamakey-nfc.khamakey-nfc.workers.dev` |

---

## Linee prodotto

| Linea | Tono | Pubblico |
|-------|------|----------|
| **Business** | Professionale, affidabile | PMI, ristorazione, hospitality |
| **Moments** | Emotivo, elegante | Famiglie, coppie, organizzatori eventi |

---

## Asset

Logo, palette e mockup vanno in [`../assets/`](../assets/).

### Linee Guida Grafiche Moments (Adattivo)

Per preservare l'estetica premium senza alterare la struttura HTML, le modifiche grafiche si basano su un **Design System Adattivo** definito in `momentPageCss` (`worker/worker.js`):

1.  **Tipografia Dinamica (Font Pairs)**:
    *   *Temi Romantici/Eleganti* (`romantic`, `elegant`, `classic`): Usano titoli calligrafici (es. `Great Vibes`) e corpo in serif. I titoli delle card mantengono l'eleganza con un leggero tratto decorativo.
    *   *Temi Moderni/Minimali* (`modern`): Escludono i font corsivi. I titoli delle card e della Hero usano font geometrici sans-serif (es. `DM Sans`) ad alto spessore, interamente in maiuscolo e con spaziatura espansa (`letter-spacing: 0.05em`).
2.  **Ombre e Superfici (Profondità)**:
    *   Non usare bordi spessi o piatti per separare le schede. Preferire un'ombreggiatura morbida e diffusa:
        `box-shadow: 0 12px 30px -10px rgba(17,32,65,.04), inset 0 1px 0 rgba(255,255,255,.6)`
    *   Il raggio degli angoli (`border-radius`) è standardizzato a `24px` per le card principali, `18px` per gli elementi interni (tappe, moduli) e `12px` per gli input di testo.
3.  **Bottoni e Campi di Input**:
    *   I campi di input non usano l'outline blu nativo del browser. All'attivazione (focus), mostrano un bordo coordinato con il testo (`c.ink`) e un anello di selezione sfumato basato su `c.lineStrong` (`box-shadow: 0 0 0 4px ${c.lineStrong}`).
    *   Tutti i bottoni principali (`.moment-rsvp-submit`, `.moment-guestbook-submit`) hanno transizioni all'hover morbide (`transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease`): si sollevano di `1px` e proiettano un'ombra luminosa del loro stesso colore.

## Brand KhamaKey Business

Gli asset ufficiali di KhamaKey Business sono salvati nella cartella [`assets/brand/`](../assets/brand/):
*   **Logo Ufficiale**: [khamakey-business-logo.png](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/assets/brand/khamakey-business-logo.png)
*   **Palette Colori Ufficiale**: [khamakey-business-palette.jpg](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/assets/brand/khamakey-business-palette.jpg)

### Palette Colori Business:
*   **Verde Camaleonte**: `#7AC943` — Colore primario. Rappresenta energia, crescita e innovazione.
*   **Celeste Khama**: `#2FA8FF` — Colore secondario. Rappresenta tecnologia, chiarezza e comunicazione.
*   **Blu Key**: `#0B3A7A` — Colore di accento. Rappresenta sicurezza e professionalità.
*   **Antracite**: `#111827` — Colore per testi principali, icone e sfondi scuri.
*   **Grigio Chiaro**: `#F4F6F8` — Per sfondi leggeri, sezioni alternate e superfici.
*   **Bianco**: `#FFFFFF` — Colore per sfondi puliti e aree neutre.
*   **Gradienti di Supporto**:
    *   Verde → Celeste (`#7AC943` → `#2FA8FF`)
    *   Celeste → Blu (`#2FA8FF` → `#0B3A7A`)
    *   Verde Camaleonte → Blu Key (Gradiente principale brand)

---

## Proposte Evoluzione Brand per Moments (in corso di scelta)

Per la linea Moments (o una sua evoluzione di nome e logo), sono state elaborate 3 proposte visuali e di naming per differenziarsi dall'identità aziendale di KhamaKey Business e avvicinarsi a un tono più caldo, emotivo ed elegante.

### [SCARTATE] Opzioni A, B, C (Tiratura Corporate)
*Nota: Queste opzioni (KhamaMoments, KhamaMemories, KhamaCapsule basate sul camaleonte/chiave)* sono state scartate in quanto troppo collegate all'identità aziendale fredda di KhamaKey Business e poco allineate con la visione intima ed emotiva di Moments.

### Opzioni Attive: Focus Emozione, Indipendenza & Tipografia
Queste nuove opzioni escludono totalmente il camaleonte e la chiave aziendale, concentrandosi solo su una scritta (wordmark) con un font d'impatto emotivo e palette calde che trasmettono vibrazioni positive e gioia.

### Opzione D: "Moments" (Serif & Sole - Eleganza e Luce)
*   **Concept**: Scritta "MOMENTS" pulita e minimale con un font *serif* di alta classe. Sopra la scritta è presente un piccolo sole astratto disegnato a mano in color oro, simbolo di luce, gioia e calore.
*   **Atmosfera Visiva**: Sfondi in lino naturale, ombre di foglie calde, sensazione di un invito stampato di lusso.
*   **Palette Colori**:
    *   `Nero Caldo / Antracite Soft` (`#1C1C1C`): Per la tipografia, elegante e leggibile.
    *   `Oro Caldo` (`#D4AF37`): Per il sole e gli accenti luminosi.
    *   `Lino / Avorio` (`#F9F6F0` / `#ECE7DF`): Per sfondi e superfici tessurizzate.
*   **Anteprima Mockup**: [moments-proposal-d-serif.png](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/assets/brand/moments-proposal-d-serif.png)

### Opzione E: "Moments" (Script & Calore - Intimità e Condivisione)
*   **Concept**: Wordmark "Moments" in un font *calligrafico* fluido, morbido e moderno che evoca la scrittura a mano, il tocco umano e la vicinanza delle relazioni. Accompagnato dalla tagline *"Cherish every memory"*.
*   **Atmosfera Visiva**: Sfondi sfumati (gradienti) a tonalità pastello calde che avvolgono l'utente trasmettendo felicità e accoglienza.
*   **Palette Colori**:
    *   `Ruggine / Terracotta Caldo` (`#A34E36`): Per la scritta principale.
    *   `Pesca / Crema / Corallo Chiaro` (Gradiente): Per lo sfondo sfumato e luminoso.
*   **Anteprima Mockup**: [moments-proposal-e-script.png](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/assets/brand/moments-proposal-e-script.png)

---

## TODO

- [x] Caricare logo SVG/PNG in `assets/`
- [x] Documentare palette ufficiale brand
- [x] Guida tipografia (serif Moments vs sans Business)
- [ ] Template social e materiali rivenditori
