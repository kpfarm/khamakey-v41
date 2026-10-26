# Recupero media — protezione server privata, fase 1 NON LIVE

25 ottobre 2026. Implementata una copia privata del Worker per il recupero dei file, separata dal sorgente condiviso e dagli ambienti attivi. La funzione resta dietro un flag di laboratorio, disattivato per impostazione predefinita. Nessun deploy, migrazione o nuovo servizio remoto.

Nella prova, rimozione e sostituzione conservano il file originale; il registro di recupero non è scaricabile dal CDN. Ripetizioni e registrazioni concorrenti usano una scrittura condizionata; dimensione ed ETag identificano il file. Il recupero ricontrolla i permessi e la presenza del contenuto, senza dichiarare salvata la pagina. Errori e revoca non provocano cancellazione del file precedente. Lo spazio conservato continua a essere conteggiato.

44 test isolati superati: 23 sul recupero e 21 regressioni dell'upload con funzione disattivata. Aggiunti 13 controlli con Worker/R2 locali effettivi, compatibilità 2026-06-25: byte originali, registro, recupero, sostituzione e contabilizzazione verificati. Auth e database simulati e rete esterna bloccata: non è una certificazione del servizio remoto o della collaborazione reale. Controllo baseline Officina/SQL/Worker condiviso superato.

Non collegato alle frecce o all'editor attivo. Pulizia definitiva non implementata né abilitata. La finestra di 24 ore è un parametro di prova, non una durata di servizio approvata. La conservazione prudenziale può limitare sostituzioni a spazio quasi esaurito e successive sostituzioni di formati con tetto: questi comportamenti richiedono una soluzione prima del rilascio. Il file resta al suo URL originale durante questa fase.

Restano integrazione con salvataggio e Annulla/Ripeti, politica di spazio/recupero, pulizia coordinata con riferimenti e sessioni, prove complete e pacchetto di ritorno. Non attivare il flag su clienti o distribuire questa fase da sola. Codice, baseline, prove e limiti salvati nella consegna privata; programma e guide aggiornati. Produzione, Officina e grafica invariate.
