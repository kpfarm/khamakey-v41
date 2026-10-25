# Prima correzione isolata — 25 ottobre 2026, NON LIVE

Acquisiti in sola lettura codice, configurazione e identità della versione Worker effettivamente attiva. Preparato un pacchetto privato con la sola correzione upload: codice al di fuori dell'handler e dell'etichetta versione identico alla copia acquisita, senza modifiche frontend o database.

Confronto su copie isolate: 14 prove riuscite e 7 fallite sulla base, 21/21 riuscite sul candidato. Otto controlli con Auth reale e file fittizio nel laboratorio confermano caricamento, lettura, conservazione del nuovo file tornando al codice base e ripristino dello stato iniziale. Dry-run riuscito, uscita identica all'artefatto collaudato; baseline aree protette verificata.

Rapporto visibile nel laboratorio su /verifica-upload.html. Non è una nuova grafica dell'editor né un collaudo della produzione. Pacchetto, metadati, dettagli e prove conservati privatamente. Nessun deploy, merge, modifica SQL produzione o caricamento su pagine cliente.

Prima della promozione: revisione del pacchetto, riconferma della versione attiva e dei binding, pagina dimostrativa identificata per il controllo online e autorizzazione specifica. Ritorno provato solo localmente: conserva i nuovi file ma riporta anche il difetto noto della base. Non eseguire rollback del database per questo cambiamento.
