# Prima verifica produzione — 2026-10-24

Eseguita su richiesta esplicita dell'utente, in sola lettura: catalogo/permessi/advisory database, asset pubblici e intestazioni HTTP. Nessun deploy, SQL modificativo, salvataggio/upload/trasferimento o tentativo PIN su pagine cliente.

Sono emerse criticità che richiedono correzioni separate e collaudo nel laboratorio. Il repository GitHub è pubblico: dettagli operativi e prove delle criticità non corrette restano nel rapporto locale riservato, fuori Git (.lab/production-audit/REPORT.md e copia consegnata all'utente). Nessun segreto, dato cliente, URL privato o prova di sfruttamento viene aggiunto a questa PR.

Le verifiche modificative sono state limitate alla fixture artificiale del lab e annullate con ROLLBACK; controllati anche assenza di grant/righe temporanee residui e piano originale. I controlli non costituiscono certificazione di assenza di vulnerabilità né analisi completa di eventuali incidenti.

Risultati di versione pubblici: Moments v327/CSS v310; Worker health v255-transfer-guard. HTTP 200 e intestazioni di sicurezza presenti; 69/69 tabelle public con RLS attiva. Questo non dimostra che ogni policy o funzione sia corretta. Advisory automatici esaminati senza equiparare avvisi a falle.

Nessun fix applicativo aggiunto in questa fase. Ramo laboratorio/PR #6 in bozza, main e produzione invariati. Prima di proporre cambi a permessi, PIN o salvataggi leggere il rapporto locale con l'utente e definire regressioni core/Officina; eventuale rilascio richiede decisione separata.
