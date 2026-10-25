# Autosave — collaborazione e compatibilità media, NON LIVE

25 ottobre 2026. Proseguito il collaudo del candidato nel solo laboratorio. Eseguito il codice saveMoment candidato con due account fittizi autenticati e RPC reali, DOM di prova: 11 controlli riusciti comprendono accettazione senza email, lettura/salvataggio del collaboratore, rifiuto della bozza obsoleta senza retry, conservazione del testo locale e remoto, salvataggio con versione aggiornata, revoca e ripristino della fixture con contenuti/PIN/NFC preservati. Questo non è un collaudo browser simultaneo di due persone.

Nel browser verificato l'avviso di conflitto su una versione effettivamente aggiornata nel laboratorio, mantenendo il testo locale; provato anche autosalvataggio del testo di una sezione con anteprima. I contenuti fittizi della prova sono stati riportati allo stato precedente. Nessuna email inviata o modifica a produzione.

La revisione della matrice sezioni/media ha riprodotto, con la funzione candidata e un archivio solo in memoria, un'incompatibilità fra Annulla mantenuto dopo salvataggio e cancellazione fisica immediata di un file: una vecchia istantanea può contenere un collegamento non più disponibile. Nessun file reale cancellato nella riproduzione. Non dichiarare corretto il ritorno completo dei media né pronto al deploy il candidato.

Aggiunto al programma un requisito prioritario: recupero sicuro dei media rimossi/sostituiti per i passaggi annullabili, con salvataggi concorrenti, permessi, quota e pulizia verificati. La soluzione va progettata e collaudata prima di estendere il rilascio; nessun rinvio indiscriminato delle cancellazioni o nuovo costo introdotto. Inventario delle sezioni e proposta tecnica restano privati.

Stato: collaborazione avanzata nei casi descritti; rilascio bloccato dalla compatibilità media/Annulla e dagli altri controlli ancora aperti. Restauro grafico e Sezioni modulari restano separati. Codice del prodotto, Worker, SQL e Officina non modificati in questa fase; sul ramo pubblico viene registrato solo questo riepilogo neutro.
