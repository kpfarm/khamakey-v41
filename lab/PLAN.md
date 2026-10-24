# Piano di miglioramento — 23 ottobre 2026

Un intervento per volta, con test ed esito registrato. Nessuna riscrittura generale. Nessuna promessa di rischio zero.

| # | Operazione | Stato / criterio per chiuderla |
|---|---|---|
| 1 | Isolamento, rilascio e ripristino | Copia Git e test locali; database remoto separato creato vuoto dopo sospensione autorizzata Moment Custom; schema e permessi minimi pronti, 0 dati persistenti; anteprima/Worker/R2 locali avviati, 2 account fittizi e prime prove browser/HTTP pass; conflitti, altri formati, etichette e chip ancora aperti; verificare backup dati prima del rilascio |
| 2 | Difetto scope `kindCap` nell'upload | Correzione minima v256 sul ramo, 22/22 test locali pass inclusi auth/quote/tipi/sostituzione; smoke reali ancora necessari |
| 3 | Conflitti di salvataggio fra collaboratori | Rischio statico in `moments.js`: ripetizione payload vecchio con timestamp nuovo; riprodurre su due account di test prima di modificare |
| 4 | Privacy dei collegamenti diretti ai file | Comportamento CDN nel codice: nessun PIN; definire requisito, testare senza sessione, preservare URL esistenti |
| 5 | Backup e recupero contenuti | Da verificare: recupero separato di DB, file R2, associazioni e utenti, in ambiente di test |
| 6 | Diagnostica errori | Da progettare: identificativo errore e log senza dati personali/segreti |
| 7 | Spazi desktop | Osservato campo titolo circa 209 px a viewport 920 px; prototipo e test a più larghezze |
| 8 | Percorso mobile | Prototipo separato, test utente su foto/dedica/anteprima/condivisione prima del codice online |
| 9 | Regole visive/accessibilità | Seguire docs/01-brand; verificare contrasto, zoom, tastiera, focus e lettura assistita |
| 10 | Bozza/salvato/pubblicato e guide | Osservato «pronto da regalare» su bozza; rimuovere indicazioni obsolete guestbook senza riattivare la funzione |
| 11 | Stato upload | Distinguere trasferimento file e salvataggio pagina, verificare rete lenta/interrotta |
| 12 | Regalo e proprietà | Due percorsi cliente, trasferimento/inviti con account fittizi; non cambiare codici/slug reali |
| 13 | Promessa commerciale | Limiti inclusi e demo reperibili nello shop; piano unico incluso, nessun abbonamento introdotto |
| 14 | Guide e coordinamento Git | Documentare ramo/percorso Windows, stato non-live e blocchi; mantenere versioni live, aggiornare log ad ogni intervento |

## Componenti protetti

Officina v203: `create_moment_product_batch`, codici inserto, barcode magazzino, PDF/PNG/CSV etichette, QR e slug pubblico; attivazione e percorsi `/m/` e `/k/`. Hash baseline non significa prova funzionale completa: lo smoke Officina resta obbligatorio prima di ogni rilascio.
