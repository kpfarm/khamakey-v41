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

---

## TODO

- [ ] Caricare logo SVG/PNG in `assets/`
- [ ] Documentare palette ufficiale brand
- [x] Guida tipografia (serif Moments vs sans Business)
- [ ] Template social e materiali rivenditori

