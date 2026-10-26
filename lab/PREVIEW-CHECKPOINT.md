# Anteprima isolata — 2026-10-24 (NON LIVE)

## Stato verificato

- Interfaccia locale: http://127.0.0.1:8080/moments — risposta HTTP 200 con intestazione isolated-laboratory e fascia LABORATORIO SEPARATO. Worker locale: http://127.0.0.1:8787/health — 200, R2 locale, nessun cron.
- Server in ascolto esclusivamente su 127.0.0.1. Nessuna anteprima pubblicata. Il collegamento browser è stato richiesto, ma l'automazione browser è andata in timeout: nessuna verifica visuale o di login da dichiarare superata.
- Database esclusivo ybmnrtvksvndpdiofmqm. Frontend attraverso proxy locale che consente soltanto operazioni espressamente elencate. Worker con filtro di destinazione e redirect manuali, nessun segreto di produzione passato al gestore.
- Fonte pages/ e worker/wrangler.toml invariata. Copia generata in .lab/runtime/ ignorata da Git. CSP locale permette connessioni applicative solo ai due server locali; proxy/Worker raggiungono soltanto il database laboratorio. SDK esm.sh e font restano risorse esterne di lettura.
- HTTP verificati: lookup RPC di prova 200 con array vuoto; signup, erase account, inviti e webhook 403. Login a password/refresh consentiti; registrazione, recupero password e invio email deliberatamente esclusi. Nessun account Auth ancora creato: non utilizzare credenziali cliente o di produzione.

## Permessi nel solo laboratorio

Applicata laboratory_minimum_core_access (script lab/minimum-access.sql). Controllo preventivo richiede il marker della Business analytics disabilitata, presente solo nella copia laboratorio. Zero grants globali; default EXECUTE chiuso per funzioni future.
- anon: 0 tabelle e 5 RPC pubbliche (PIN/risoluzione/attivazione e rate limit).
- authenticated: SELECT su 5 tabelle con RLS esistenti; 13 RPC pubbliche e 3 helper privati. Nessun INSERT/UPDATE/DELETE/TRUNCATE diretto. Generazione lotto sempre protetta dal permesso moments.write/admin.full.
- Corrette solo nel laboratorio le 3 funzioni con search_path mutabile, fissato a pg_catalog: default_moments_plan_limits, random_moment_public_slug, moment_page_editor_cap.
- Advisory successivi: 8 INFO RLS senza policy (accesso diretto negato); 5 WARN RPC SECURITY DEFINER anon e 13 WARN authenticated, corrispondenti all'elenco intenzionale. Non silenziare con grants ampi o rimozione RLS; mantenere controlli interni e test negativi. Riferimenti: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

## Prove eseguite

31/31 test locali pass: precedenti upload/baseline/schema + 4 verifiche del filtro anteprima. File protetti Officina/SQL e Worker fuori handler upload/versione invariati.
Due prove SQL transazionali sul database laboratorio, con ruoli authenticated/anon e claim sintetici, sempre ROLLBACK:
1. Due identità vedono solo la propria pagina, cliente senza permessi staff non genera lotti, scrittura diretta/cancellazione account negate.
2. Staff fittizio genera 1 unità: codice 12 caratteri, barcode 12 cifre, slug diverso dal codice, URL /m/slug. Attivazione owner A, salvataggio, owner B non legge/non modifica; PIN errato/assente non espone titolo/state, PIN corretto restituisce pagina; codice NFC risolve lo stesso slug. Nessuna etichetta o QR grafico esportato in questa fase.
Verifica finale: 0 eventi, 0 codici, 0 membri; 69 tabelle pubbliche con RLS, 0 tabelle scrivibili direttamente da authenticated. Nessuna modifica auth.users. Le prove SQL non certificano il flusso frontend o JWT autentici.

## Avvio riproducibile

Richiede Node e le dipendenze Worker del lock originale. Impostazioni locali .lab/settings.json: project uguale al riferimento laboratorio e key pubblicabile del laboratorio (sb_publishable_...). Mai service-role o chiavi produzione; file escluso da Git.

Avvia dalla root: node lab/start-preview.mjs. Il runner genera la copia, avvia server e Wrangler --local con configurazione separata, rimuove le credenziali di servizi ereditate dall'ambiente. Arresto Ctrl+C. Non usare la configurazione Wrangler di produzione.

Il primo avvio confinato non era raggiungibile; arrestato e riavviato con autorizzazione dell'ambiente. Nessun deploy. /health ora è una verifica locale e non richiama la diagnostica integrazioni.

## Ancora da completare

Account fittizi confermati nel solo laboratorio, login reale e verifica visuale browser/mobile; upload reale in R2 locale, Salva/riapertura, conflitti tra sessioni, export CSV/PDF/PNG/QR e lettura NFC. Nessuna promessa di staging completo. Prima di un rilascio servono inoltre backup/ripristino e decisione esplicita dell'utente. PR #6 resta bozza; main e produzione invariati.
