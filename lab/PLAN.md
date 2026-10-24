# Piano di miglioramento — 23 ottobre 2026

Un intervento per volta, con test ed esito registrato. Nessuna riscrittura generale. Nessuna promessa di rischio zero.

| # | Operazione | Stato / criterio per chiuderla |
|---|---|---|
| 1 | Isolamento, rilascio e ripristino | Laboratorio isolato e core verificato con fixture fittizie; candidati protetti separati, PR in bozza. Ripristino completo, generazione etichette/lettura chip fisico e rilascio ancora da completare. |
| 2 | Difetto scope `kindCap` nell'upload | Fix candidato v256: regressioni upload e immagine reale riuscite nel lab. In suite corrente 111 test integrati; altri formati e dispositivi reali ancora da collaudare prima del rilascio. |
| 3 | Conflitti di salvataggio fra collaboratori | Retry vecchia bozza rimosso; atomicità DB verificata separatamente nel laboratorio. Editor v329 rileva anche digitazione durante Salva: riproduzione e regressione browser riuscite. Produzione invariata; evidenze tecniche riservate locali. |
| 4 | Privacy dei collegamenti diretti ai file | Decisione in attesa: proteggere anche i file delle pagine PIN oppure mantenerne la condivisione diretta. Domanda presentata all’utente; nessuna modifica ai collegamenti esistenti. |
| 5 | Backup e recupero contenuti | Recupero dimostrativo DB/R2 riuscito su dati fittizi; recupero completo Auth/RLS/configurazioni ancora aperto. Backup esterno rinviato esplicitamente dall’utente; nessun servizio/costo attivato. |
| 6 | Diagnostica errori | Da progettare e implementare: identificativo correlato e log privi di dati personali/segreti, verificando anche errori di rete. Nessun servizio esterno di monitoraggio attivato. |
| 7 | Spazi desktop | Candidato CSS v311: a 920 px titolo da circa 209 a 433 px, nessun overflow nelle otto larghezze collaudate. Navigazione e anteprima conservate. Da revisione finale prima del rilascio. |
| 8 | Percorso mobile | Candidato v329: titolo prima della foto; navigazione mobile Contenuti/Anteprima/Modifica/Condividi verificata. Da completare prova utente e upload completo su telefoni fisici. |
| 9 | Regole visive/accessibilità | Focus visibile, campi mobile 16 px, barra Salva chiusa non focalizzabile e avvisi accessibili. Da completare contrasto sistematico, zoom e lettori vocali/dispositivi reali. |
| 10 | Bozza/salvato/pubblicato e guide | Candidato v329: messaggi coerenti con bozza/pubblicazione/modifiche non salvate; correzione istruzioni obsolete sul libro ospiti. Nessuna riattivazione della funzione. |
| 11 | Stato upload | Candidato v329: avvisi separati file in caricamento / file caricato e pagina in salvataggio / pagina non salvata; regressioni simulate su errore e cambio pagina riuscite. Rete interrotta e file grandi su telefono ancora aperti. |
| 12 | Regalo e proprietà | Trasferimento A → B → A, revoca e percorso email catturata verificati nel lab. Invio reale, nuovo signup, scadenza e concorrenza restano aperti; nessun invio o dato cliente modificato. |
| 13 | Promessa commerciale | Shop consultato in lettura: pagina inclusa e nessun abbonamento coerenti con il piano unico. Limiti visibili nell’editor; nessuna promessa di spazio illimitato introdotta. Da verifica incrociata completa prodotto/limiti/condizioni. |
| 14 | Guide e coordinamento Git | Guide aggiornate per fase, Git su ramo dedicato e PR in bozza; dettagli tecnici riservati fuori repository pubblico. Versioni live restano distinte dai candidati e non si chiude il programma prima delle verifiche mancanti. |

## Componenti protetti

Officina v203: `create_moment_product_batch`, codici inserto, barcode magazzino, PDF/PNG/CSV etichette, QR e slug pubblico; attivazione e percorsi `/m/` e `/k/`. Hash baseline non significa prova funzionale completa: lo smoke Officina resta obbligatorio prima di ogni rilascio.
