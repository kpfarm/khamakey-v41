# Collaborazione e conflitti — 2026-10-24 (NON LIVE)

## Collaborazione autorizzata

Solo database ybmnrtvksvndpdiofmqm e server locali. A è titolare della fixture q7x5m9v3b2n8; B è l'utente fittizio lab-owner-b@example.invalid. Nessun dato cliente.

Abilitate nel solo laboratorio 5 RPC aggiuntive, dopo revisione dei controlli interni: invite_moment_page_editor, list_moment_page_editors, accept_moment_page_invite, revoke_moment_page_editor per authenticated; peek_moment_page_invite per anon/authenticated. Nessun grant diretto su moment_page_members e nessuna nuova policy permissiva. Script lab/collaboration-access.sql con marker di laboratorio obbligatorio.

La creazione dell'invito usa la vera RPC con JWT del titolare A (lab/collaboration-fixture.mjs). Link salvato solo in .lab/collaboration-invite.json; endpoint Worker di invio email ancora bloccato. **Consegna email non testata** e non simulata come avvenuta.

Prova browser: aperto link locale, accesso con B destinatario, accettazione tramite flusso originale dell'app; appartenenza accepted verificata. B vede la pagina, modifica la frase e riceve Pagina salvata. Lettura con A conferma la modifica di B. Upload reale con JWT B accettato (200), PNG sintetico aggiuntivo in R2 locale, copertina esistente non sostituita.

Revoca da A tramite RPC originale: B con JWT emesso prima della revoca non legge più la pagina; save negato 400, upload negato 403. Invito invalidato (hash null), accesso del titolare preservato. L'interfaccia già aperta può conservare una vista dei dati caricati prima della revoca: non equivale ad autorizzare nuove letture/scritture.

## Difetto riprodotto e correzione candidata Moments v328

Prima: B tiene aperta una bozza con il vecchio titolo. A salva Titolo recente A prima del fix tramite un'altra sessione Auth. B preme Salva nel browser: il primo RPC restituisce CONFLICT_STALE_SAVE, ma il client aggiorna soltanto il timestamp e rimanda lo stesso vecchio payload. Risultato verificato: il titolo recente A è sovrascritto dal vecchio titolo B. Solo fixture di laboratorio.

Test automatico sul vero blocco RPC di saveMoment: prima **1 fail / 3 pass**, dimostrati 2 invii invece di 1. Non è un test che ricopia il comportamento in un modello separato.

Correzione minima candidata in pages/moments.js: rimosso il retry automatico con timestamp aggiornato. Il percorso di errore già esistente conserva la bozza locale. Messaggio IT/EN aggiornato: nessun invito a ripremere subito Salva, avvisa che la bozza non è salvata e va conservata prima di ricaricare. Cache JS e modulo messaggi v328 sul solo ramo; **live resta Moments v327, CSS v310**. Nessun cambiamento al renderer pubblico, campi di stato, Worker oltre fix upload già candidato, SQL storico o Officina.

Dopo: ripetuta la prova con B nel browser e A via altra sessione reale. A mantiene Titolo recente A protetto; B riceve il messaggio di conflitto e conserva i testi locali. Ripetuto con il messaggio nuovo in una seconda scheda: titolo e frase B restano nei campi, titolo A remoto non sovrascritto. Screenshot .lab/browser-conflict-protected.jpg. Bozze fittizie copiate in .lab/conflict-draft-b*.json prima di uscire senza salvarle.

**35/35 test locali pass**: upload/protezioni/schema/filtro e 4 regressioni save (conflitto non reinviato, normale owner save, RPC admin distinta, altri errori non reinviati). Hash dei 78 file protetti Officina/SQL e Worker fuori upload/versione ancora identici.

## Limiti e verifiche aperte

- Questa prova riguarda un salvataggio A completato prima che arrivi la vecchia bozza B. Non certifica due transazioni DB che leggono/modificano la stessa riga esattamente insieme. La funzione save_my_moment_page legge updated_at e poi aggiorna: atomicità/locking da verificare separatamente prima di dichiarare chiuso tutto il problema concorrenza. Nessuna modifica SQL di salvataggio in questa fase.
- Non introdotto merge automatico o nuovo recupero della bozza dopo chiusura. Il test attesta permanenza nel form e avviso; conservare manualmente le modifiche prima di ricaricare.
- Test revoca/invito a livello RPC e accettazione/salvataggio browser; invio email e pulsante invio commerciale esclusi. Nessuna chiave Resend o servizio reale collegato.
- Advisory laboratorio: 8 INFO RLS senza policy (accesso diretto negato), 6 WARN RPC definer anon e 18 authenticated intenzionali con guardie; 1 WARN protezione password trapelate non abilitata di default nel lab. Nessun all-clear globale e nessuna configurazione Auth produzione modificata. Riferimenti: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

## Stato finale dei soli dati di prova

Testi originari della fixture A ripristinati usando il titolare, con timestamp corrente: LAB · Salvato dal browser / Immagine sintetica, nessun contenuto cliente. B revocato intenzionalmente al termine del test, non è uno staff e non è un blocco generale della collaborazione. 2 utenti fittizi, 2 unità artificiali, 1 evento A, 0 membri staff; 2 PNG locali per 2052 byte (il secondo è prova upload collaboratore, non inserito nella pagina). Nessun file eliminato automaticamente.

Strumenti: lab/collaboration-fixture.mjs crea un nuovo invito solo quando B non è già accepted; lab/collaboration-probe.mjs esegue fasi esplicite inspect, remote-before/after, upload, revoke, restore solo su questi account/fixture. restore tocca esclusivamente la pagina artificiale salvata nel checkpoint locale. Credenziali, link token, screenshot e report in .lab/ ignorata da Git.

PR #6 in bozza. Nessun merge, deploy o SQL produzione. Restano concorrenza DB, altri formati/dispositivi/rete, etichette/QR/CSV Officina, chip fisico e backup/ripristino prima di proporre rilascio.
