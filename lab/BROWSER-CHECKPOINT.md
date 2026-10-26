# Prove browser e Auth reale — 2026-10-24 (NON LIVE)

## Perimetro

Solo progetto ybmnrtvksvndpdiofmqm, frontend 127.0.0.1:8080, Worker 127.0.0.1:8787, R2 locale. Main, database cliente, file R2 remoti e Officina live invariati.

Due utenti fittizi creati dal modulo ufficiale Supabase Authentication → Create new user, Auto confirm attivo: lab-owner-a@example.invalid e lab-owner-b@example.invalid. Il modulo conferma che non invia email. Nessuna modifica manuale alle tabelle Auth, nessun ruolo staff sui due utenti. Credenziali solo in .lab/test-accounts.json, esclusa da Git; non riutilizzare in altri ambienti.

## Esiti verificati nell'interfaccia

- Login A riuscito, attivazione dell'unità fittizia LABA20261024 riuscita.
- PNG sintetico a scacchi 320×180, 1026 byte, senza dati personali: upload reale dalla scelta file del browser → R2 locale, conferma Copertina caricata.
- Modificati titolo e frase, Salva → Pagina salvata. Ricarica e riapertura della copertina: titolo LAB · Salvato dal browser, frase Immagine sintetica, nessun contenuto cliente e immagine conservati. Contatore 1.0 KB.
- Pagina pubblica locale: senza PIN mostra solo gate; PIN errato respinto; PIN corretto mostra titolo, frase e copertina salvati.
- /k/LABA20261024 ridirige allo stesso /m/q7x5m9v3b2n8 e conserva il gate PIN. Verifica HTTP/browser, non lettura di un chip fisico.
- Logout A → login B riuscito: 0 prodotti, nessuna pagina A nella lista o nel menu.
- Screenshot locali: .lab/browser-saved-cover.jpg e .lab/browser-public-pin.jpg, esclusi da Git.

## Verifiche con JWT autentici

lab/smoke-authenticated.mjs usa esclusivamente le impostazioni/credenziali locali di prova, non legge lo stato del browser. 7 controlli completati: 2 login reali; lettura del salvataggio e PNG locale di 1026 byte; B non legge A; salvataggio di B sulla pagina A respinto con 400 e messaggio di autorizzazione; upload di B su A respinto con 403; titolo e contabilità invariati dopo i rifiuti. Il resoconto senza token/password è in .lab/authenticated-smoke.json. Il test non crea upload autorizzati: verifica quello già caricato dal browser.
31/31 test locali upload/baseline/schema/filtro anteprima ancora superati. Le credenziali non sono nel codice del test.

## Anomalie e limiti osservati

- Due tentativi di preparazione lotto con staff temporaneo sono falliti per richiesta connettore scaduta. Verificati 0 codici e 0 membri prima di cambiare metodo. Per le prove browser sono state inserite **2 fixture artificiali** nel solo laboratorio, senza concedere permessi staff: non equivalgono a una prova browser della generazione Officina. La RPC generatore era stata provata separatamente con rollback nella fase precedente.
- Upload locale 1026 byte: Worker ha risposto 200 dopo circa 31 s; una sincronizzazione successiva circa 17 s. Non è una misura delle prestazioni di produzione. Dashboard Supabase mostrava un avviso generico di problema tecnico del servizio; non è stata stabilita la causa.
- Durante autosalvataggio comparso Preview resource unavailable. Salvataggio manuale successivo e riapertura riusciti. Il proxy del laboratorio ora distingue errore upstream 502 da risorsa statica 404 e registra solo metodo, percorso senza query e tipo di errore, senza token/contenuti. Nessuna modifica a salvataggio/autoretry dell'app sorgente.
- Primo smoke HTTP scaduto al limite di 15 s. Aggiunto resoconto progressivo e limite di 45 s; riesecuzione completa superata in circa 4 s. Nessuna ripetizione automatica di scritture dopo timeout.
- Dopo riapertura l'AX dell'editor riportava Hai modifiche non salvate, mentre undo era disabilitato e dati persistenti corretti. Da riprodurre e diagnosticare prima di cambiare la barra/stato.
- Conflitto di salvataggio tra sessioni: rischio di autoretry su payload vecchio già rilevato nel codice; riproduzione browser e correzione ancora aperte.
- Test reale limitato a PNG. HEIC/iPhone, video, audio, PDF, rete interrotta e limiti reali ancora da verificare; test simulati non li certificano. Etichette/CSV/PDF/PNG/QR Officina e chip fisico ancora aperti.

## Dati di prova rimasti intenzionalmente

2 utenti Auth fittizi; 2 unità artificiali (A attivata, B disponibile), 1 evento di A; nessun evento B; 0 membri staff persistenti; 1 file R2 locale, 1026 byte. Non cancellare automaticamente: servono per riprodurre le prove. Nessun dato cliente copiato.

PR #6 resta bozza. Prima del rilascio servono ulteriori smoke, backup/ripristino e decisione esplicita.
