# Trasferimento dal browser ed email catturata — 2026-10-24 (NON LIVE)

## Esito e isolamento

Percorso originale verificato: A → Account / Prodotti / Trasferisci proprietà → email B → Continua → Conferma e invia → Worker → RPC reali → email catturata localmente → link → accesso B → Accetta → editor B. **Nessuna email consegnata e nessuna chiamata al provider email**. Questo test certifica composizione e gestione del flusso nel laboratorio, non deliverability Resend, DNS o caselle reali.

Solo Supabase ybmnrtvksvndpdiofmqm, localhost 8080/8787, stessa pagina artificiale e due account @example.invalid del checkpoint precedente. Il servizio mail è intercettato in lab/mail-network.mjs prima di qualsiasi rete: accetta solo il segnaposto laboratory-capture-not-a-provider-key, mittente @example.invalid, un destinatario fittizio ammesso e tag moments_ownership_transfer. Altre credenziali, destinatari o endpoint sono rifiutati. Tutto il restante traffico passa ancora dall'allowlist del database lab. Nessuna credenziale reale Resend collegata.

lab/worker-entry.mjs consente l'endpoint di trasferimento solo per event_id artificiale fissato e destinatari A/B o lab-mail-failure@example.invalid. Il modulo Worker generato importa il fetch locale; worker/worker.js originale resta invariato. Il Worker sorgente continua a eseguire autenticazione, controllo proprietario e rate limit originali. Inviti, supporto, webhook, pagamenti, cron, erase/reset restano chiusi. CSP e RLS non allargate. Catture in memoria volatile (massimo 10), leggibili solo dal Worker loopback /__lab/transfer-mailbox, protetto dallo stesso controllo origine; i token riguardano esclusivamente la fixture. Nessun binding R2 remoto.

## SQL v183 solo laboratorio

Applicato lab/transfer-guard-access.sql: copia **inalterata** delle due funzioni già versionate in sql/khamakey-moments-transfer-guard-v183.sql, preceduta da guardia del marker laboratorio e racchiusa in transazione. Migrazione laboratory_transfer_guard_v183 sul solo lab. Confermato anon_execute false e authenticated_execute true per entrambe. Nessun accesso alle tabelle aggiunto. SQL storico e database produzione intoccati. Stato produzione v183 ancora da verificare/applicare con decisione di rilascio separata; non considerarlo applicato dal test lab.

## Prove effettive

**26 controlli reali del ciclo**: 10 in lab/transfer-mail-probe.mjs failure-and-guard, 5 in capture, 9 in lab/transfer-probe.mjs verify, 2 in restore. Report .lab/ ignorati. Fasi esplicite, nessun retry automatico delle scritture.

- Worker senza login 401; non proprietario 400; wrapper rifiuta destinatario reale e altro event_id (403).
- Destinatario lab-mail-failure provoca risposta mail 503 simulata: Worker restituisce 500 e RPC v183 annulla solo la propria richiesta. Evento interamente invariato.
- Due richieste successive via RPC: is_current riconosce solo la più recente e il suo titolare; abandon_unsent sul token vecchio risponde kept e conserva l'invito nuovo. B non può annullarlo. Richiesta diagnostica annullata da A tramite RPC originale.
- Browser A visualizza conferma e stato pending dopo il pulsante originale. Messaggio catturato: destinatario B, oggetto, HTML e testo presenti; link locale identico nei due corpi e nessuna origine app/link produzione. Il token identifica B e richiesta pending. Il proprietario resta A prima dell'accettazione.
- Link ottenuto dalla cattura, non costruito come fixture sostitutiva: aperto nel browser, accesso B, schermata Moment da ricevere, clic Accetta e apertura editor. Screenshot .lab/browser-transfer-mail-captured.jpg e .lab/browser-transfer-mail-accepted.jpg.
- Verifica dopo accettazione: B titolare e save riuscito; A senza lettura/save/upload. Tutti i campi evento invariati tranne owner_email/account_id/updated_at previsti. Stessa URL e SHA-256 della foto, stesso slug e redirect NFC, PIN ancora attivo e contenuti non esposti senza PIN; token accettato non riutilizzabile.
- Trasferimento inverso via RPC B → A riuscito; B senza lettura e il suo JWT emesso prima del ritorno non salva. Nessuna scrittura amministrativa o cancellazione. Stato finale complessivo fixture: 7 cancelled, 1 declined, 4 accepted, 0 pending, tutti i token hash null. Foto locali sempre 2 / 2052 byte; nessun file nuovo scritto dal test upload negativo.

**38/38 test locali pass**, compresi 3 nuovi test sul confine di cattura: rete esterna resa indisponibile durante invio catturato e fallimento simulato, rifiuto di destinatari/credenziali reali, endpoint alternativi e altri flussi chiusi. Baseline dei 78 file Officina/SQL e Worker fuori upload/versione identica. Nessun fix applicativo aggiunto in questo ciclo.

Advisory dopo SQL v183 lab: 8 INFO RLS senza policy, 7 WARN definer anon, 26 WARN definer authenticated (due nuove guardie authenticated intenzionali), 1 WARN protezione password trapelate lab disabilitata. Guardie titolare/token testate; nessun all-clear globale. Riferimenti: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Ancora aperto

Consegna email reale, dominio/mittente autorizzato, bounce/spam e rendering nei client email; registrazione destinatario nuovo, scadenza 14 giorni, mantenimento di altri collaboratori accettati, vera concorrenza di transazioni e chip fisico. Il test v183 riproduce in sequenza lo scenario token vecchio/nuovo, non uno stress concorrente. Rate limit reale preservato; le prove Worker usano due chiamate A (fallimento e successo) entro 5/ora, senza cancellare contatori.

Codice di laboratorio e guide soltanto sul ramo/PR #6 in bozza. Produzione Moments, Officina NFC, shop e servizi reali invariati. Nessun merge o deploy.

Osservazione UI riprodotta in entrambi i cicli: dopo accettazione e successivo logout, la schermata Auth può mostrare ancora il vecchio banner «vuole trasferirti». Un reload lo rimuove; il token resta invalidato e i permessi sono corretti. Difetto di aggiornamento del messaggio da correggere separatamente; nessun fix frontend introdotto qui.
