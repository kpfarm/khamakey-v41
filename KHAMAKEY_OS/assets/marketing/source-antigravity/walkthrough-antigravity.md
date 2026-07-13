# Walkthrough: Generatore di Contenuti Marketing Visivi per KhamaKey

Ho implementato lo strumento **Visual Marketing Lab** all'interno del progetto KhamaKey. Questo strumento permette di configurare ed esportare grafiche promozionali per i social, schede prodotto e-commerce (Amazon, TikTok Shop), infografiche e storyboard/script per TikTok ed Instagram Reels.

---

## Modifiche Apportate

### 1. Nuovo File Creato
*   **[demo_marketing_assets.html](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/demo_marketing_assets.html)**:
    *   Una dashboard autonoma e interattiva scritta in HTML5, CSS3 Vanilla premium e JavaScript reattivo in tempo reale.
    *   Fornisce anteprime dinamiche dei post social in due formati principali: quadrato (1:1 per i feed) e verticale (9:16 per Stories/TikTok).
    *   Presenta una scheda Amazon Mockup con layout e callout focalizzati sulle conversioni dei tag NFC fisici.
    *   Include un'infografica "Come Funziona" in 3 passi con codice di incorporazione HTML/CSS pulito ed esportabile.
    *   Integra un generatore di storyboard e copioni (script) per video TikTok suddivisi in scene basate su 3 diversi stili di copy (Emozionale, Aggancio Pratico e POV/Trend).

### 2. Documentazione Aggiornata
*   **[12-marketing.md](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/docs/12-marketing.md)**: Aggiunta la voce dello strumento alla todo list del marketing di KhamaKey.
*   **[CHANGELOG.md](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/CHANGELOG.md)**: Documentate le modifiche nella sezione `[Unreleased]`.
*   **[ROADMAP.md](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/ROADMAP.md)** e **[13-roadmap.md](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/KHAMAKEY_OS/docs/13-roadmap.md)**: Aggiunta la sessione al registro delle modifiche per l'allineamento degli agenti futuri.

---

## Dettagli di Verifica

*   **Logica del Codice**: Tutta la logica JavaScript (event listener, presets, modifiche dinamiche dei testi, toggle font ed elementi grafici in SVG) è stata implementata senza dipendenze esterne, garantendo stabilità e caricamento istantaneo del file.
*   **Verifica nel Browser**: Il tool di automazione del browser ha riscontrato un errore di download dei driver Playwright a causa di un problema di rete esterno (HTTP 404). Si consiglia di effettuare una verifica manuale aprendo il file direttamente nel proprio browser locale:
    
    [Apri demo_marketing_assets.html nel tuo browser](file:///Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated/demo_marketing_assets.html)

---

## Istruzioni d'Uso per l'Esportazione Grafica

1.  Apri il file nel tuo browser.
2.  Usa la sidebar sinistra per selezionare la linea di prodotto (Business o Moments), caricare un preset o digitare i testi personalizzati del post.
3.  Per esportare il post o la scheda prodotto ad alta risoluzione:
    *   Premi `F12` nel browser per aprire gli Strumenti per sviluppatori.
    *   Attiva la modalità responsiva e imposta lo zoom al 100% o 200%.
    *   Usa il comando cattura screenshot dell'elemento (ad esempio, seleziona il nodo `#instaPost` o `#amazonContainer`) per ottenere un file PNG ad altissima risoluzione, pronto per essere pubblicato su Instagram o caricato su Amazon/TikTok Shop.
4.  Per l'infografica, copia il codice generato nella scheda corrispondente e incollalo direttamente nel backend di Shopify o sul tuo sito.
