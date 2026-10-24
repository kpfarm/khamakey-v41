# Editor: spazio e stati — 24 ottobre 2026

Candidato **Moments v329 / CSS v311**, solo laboratorio. A 920 px il titolo passa da 208,8 a 432,8 px; otto larghezze controllate senza overflow orizzontale. Titolo prima della foto, focus visibile, barra Salva chiusa esclusa dalla tastiera e dalla lettura assistita. Distinti bozza, pubblicazione, modifiche non salvate e fasi del caricamento file; nessuna riattivazione del libro ospiti.

Riprodotto e corretto il mancato conteggio delle modifiche durante un salvataggio: prima due test su quattro fallivano, dopo quattro riusciti. Nel browser il testo digitato dopo l’invio resta non salvato e disponibile; un secondo salvataggio ripristina il titolo originale della fixture. **111/111 test locali integrati**, 7 controlli ordinari Auth/API e navigazione mobile Contenuti → Anteprima → Modifica → Condividi riusciti.

In questa fase nessuna modifica a Worker, SQL, Officina, payload o autorizzazioni. Nessun merge o deploy. Il programma completo resta aperto: stato puntuale in [PLAN.md](PLAN.md); prove su telefoni/chip reali, rete interrotta, diagnostica, recupero completo e decisione sulla privacy dei file ancora necessarie. Backup esterno rinviato dall’utente.

Verifica finale barra Salva: visibilità per tastiera e lettura assistita sincronizzata anche per «Rimetti modifica» e avvisi di errore. Tre regressioni aggiuntive riuscite, incluse nella suite da 111 test.
