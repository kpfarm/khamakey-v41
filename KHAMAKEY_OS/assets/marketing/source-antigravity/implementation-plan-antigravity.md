# Piano di Implementazione: Strumento di Generazione Content Marketing per KhamaKey

Creazione di un'applicazione web interattiva a file singolo (`demo_marketing_assets.html`) che funge da generatore e visualizzatore di contenuti visivi di marketing. Questo strumento permetterà al team di KhamaKey (o ai clienti/rivenditori) di creare, personalizzare ed esportare grafiche promozionali per Social Media (Instagram, TikTok Shop), schede prodotto per Amazon, infografiche interattive e script video per acquisire clienti.

---

## Proposta e Funzionalità Centrali

Il file `demo_marketing_assets.html` sarà una dashboard interattiva con design premium (glassmorphism, animazioni fluide e tipografia curata) contenente 4 moduli principali:

1.  **Generatore di Post Social (Instagram & TikTok Shop)**:
    *   Simulatore di post quadrato (1:1) e verticale (9:16).
    *   Pannello di controllo per modificare in tempo reale testi (titolo, sottotitolo, call to action), allineamento, gradienti di sfondo (Palette Business vs Palette Moments) ed emoji decorative.
    *   Possibilità di caricare un'immagine di sfondo o selezionare preset di alta qualità.
2.  **Mockup di Schede Prodotto (Amazon & TikTok Shop)**:
    *   Layout ottimizzato per e-commerce con callout tecnici (es. "NFC Chip Integrato", "Nessuna App Richiesta", "Impermeabile").
    *   Visualizzazione 3D simulata del tag NFC fisico affiancato allo smartphone con la pagina attiva.
3.  **Infografica Interattiva ("Come Funziona")**:
    *   Timeline animata in 3 passaggi (Acquista → Avvicina & Configura → Condividi col Tap).
    *   Codice HTML/CSS pulito ed esportabile per essere incorporato sul sito web `khamakey.it` o Shopify.
4.  **Storyboard & Script Creator per TikTok / Reels**:
    *   Generatore di script video basato su formule di copy ad alto impatto (es. Gancio emotivo, Dimostrazione pratica NFC, Chiamata all'azione).
    *   Tabella con scene, testi in sovrimpressione, audio consigliati ed effetti visivi.

---

## Modifiche Proposte

### [NEW] `demo_marketing_assets.html`
#### [NEW] [demo_marketing_assets.html](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/demo_marketing_assets.html)
Un unico file HTML interattivo contenente la struttura, gli stili CSS moderni (senza Tailwind, usando CSS Vanilla con variabili CSS) e la logica JavaScript per l'interazione in tempo reale.

---

## Piano di Verifica

### Verifica Manuale
1.  Aprire il file `demo_marketing_assets.html` in un browser.
2.  Testare i controlli interattivi (modifica del testo dei post, cambio gradienti tra brand Business e Moments).
3.  Verificare la reattività sui diversi formati (Desktop e simulazione Mobile).
4.  Verificare la correttezza del design e la ricchezza estetica.
