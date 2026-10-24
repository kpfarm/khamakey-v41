# Trasferimento proprietà — 2026-10-24 (NON LIVE)

## Ambito e risultato

Solo Supabase ybmnrtvksvndpdiofmqm, server 127.0.0.1:8080/8787 e pagina artificiale 46d02893-9668-4583-9ffd-64615c8f80c9. Account A/B @example.invalid, nessun cliente. Nessuna modifica a produzione, Officina, SQL storico, renderer o codice applicativo. Nessuna correzione del trasferimento necessaria per le prove svolte.

Funzioni originali copiate dal catalogo: request, cancel, get, peek, decline, accept_moment_ownership_transfer. lab/transfer-access.sql abilita nel solo laboratorio 5 RPC authenticated e peek anon/authenticated, con marker obbligatorio. Nessun accesso diretto alla tabella moment_ownership_transfers; RLS invariata. lab/network.mjs consente queste sole RPC aggiuntive verso il database lab. Il Worker /api/moment/transfer e i servizi email restano bloccati.

## Prove effettive

lab/transfer-probe.mjs usa JWT reali dei due account fittizi e fasi esplicite original, prepare, verify, restore. **24 controlli superati** nei report ignorati .lab/transfer-*-report.json:

- Richiesta originale accetta email valida; proprietario invariato finché pending.
- Rifiutati auto-trasferimento, indirizzo invalido, richiesta da non proprietario, token sconosciuto e accettazione dall'account sbagliato.
- Annullamento, rifiuto e sostituzione richiesta invalidano i token precedenti.
- Link locale aperto nel browser: A vede destinatario diverso; uscita A e accesso B mostrano «Moment da ricevere», zero pagine prima dell'accettazione. Clic su Accetta porta B nell'editor della stessa pagina. Screenshot .lab/browser-transfer-accepted.jpg con account B e pagina.
- Lettura successiva conferma B proprietario; tutti gli altri campi di moment_events identici, tranne account_id/updated_at previsti dal trasferimento. A non legge più la pagina, save 400, upload 403. B salva con successo senza alterare i contenuti; token accettato non riutilizzabile.
- Stessa URL della copertina sintetica, stessi byte SHA-256; stesso slug pubblico e redirect /k/LABA20261024 → /m/q7x5m9v3b2n8; pagina pubblica senza PIN ancora gated, titolo non esposto. Il chip fisico non è stato provato. La correttezza del PIN resta anche garantita dal confronto del campo hash invariato; non è un nuovo test browser di inserimento PIN.
- Trasferimento inverso B → A tramite le stesse RPC, senza scritture amministrative: proprietario fittizio originale ripristinato, contenuti invariati, B senza lettura; il JWT B emesso prima di questo trasferimento inverso non può salvare (400).
- Stato finale: 4 richieste cancelled, 1 declined, 2 accepted, 0 pending; tutti i token hash null. Una cancellazione deriva dalla prima richiesta diagnostica creata correttamente ma inizialmente interpretata male dal test. Nessuna richiesta/righe cancellate e nessun nuovo media scritto dal test negativo.

**Nota diagnostica:** sospetto iniziale su escape della regex email NON confermato. Un'espressione SQL ricostruita a mano aveva escape diversi; il vero RPC ha risposto 200 e creato correttamente la richiesta. Aspettativa errata del primo test corretta, richiesta diagnostica annullata tramite RPC originale. Nessun fix regex applicato o proposto.

## Limiti

Non è una certificazione completa del trasferimento commerciale: creazione richiesta effettuata tramite RPC, non tramite pulsante Worker/email; consegna email, errori Resend, scadenza 14 giorni, race tra richieste concorrenti, signup di un destinatario nuovo e mantenimento di altri collaboratori accettati ancora da provare. Nessuna chiave Resend e nessun invio reale. Le funzioni guard v183 del file SQL pendente non sono presenti nella copia catalogo laboratorio: valutare/applicare e testare separatamente nel lab prima di collaudare Worker email. Non applicare automaticamente SQL in produzione.

35/35 test locali pass dopo l'estensione dell'allowlist; 78 file protetti Officina/SQL e Worker fuori upload/versione identici. Nessuna nuova versione frontend/Worker in questa fase.

Advisory sicurezza dopo i grant: 8 INFO RLS senza policy (negazione diretta intenzionale), 7 WARN definer anon e 24 WARN definer authenticated (RPC con controlli interni; non un all-clear globale), 1 WARN protezione password trapelate disabilitata nel lab. Nessun grant diretto o modifica Auth/RLS.
Riferimenti: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

PR #6 resta in bozza; nessun merge/deploy/SQL produzione. Credenziali, link token e screenshot solo in .lab/ ignorata.
