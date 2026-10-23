# Laboratorio Moments — non produzione

Ramo autorizzato dall'utente: `codex/laboratorio-sicuro`, base `762eac7a1fd60740882b3a76b3c448a186bc9694`.
Percorso Windows: `C:\Users\khama\Desktop\nuove collezioni\khamakey-v41-lab`.
Questa eccezione esplicita alla regola di main/root Mac vale per questo laboratorio. Non fare merge o deploy automaticamente.

## Stato reale

- Copia Git separata, nessun dato o segreto cliente copiato.
- Test locali del Worker con rete sostituita da risposte simulate e archivio R2 in memoria.
- Progetto Supabase nuovo e vuoto: `ybmnrtvksvndpdiofmqm` (KhamaKey Moments Laboratorio, eu-west-1). Dopo il primo rifiuto per quota gratuita, l’utente ha autorizzato la sospensione di Moment Custom: `bftmldytlhuznintdmdl` ora INACTIVE; Business già INACTIVE. Nessun progetto eliminato, nessun upgrade. Moments produzione `cuxlwaocjqwzluycznyp` non modificato.
- **Non esiste ancora uno staging completo** per login, generazione Officina e prove browser end-to-end.
- `pages/config.js` e `worker/wrangler.toml` restano configurazioni di produzione: **non avviare Pages dalla cartella sorgente, non lanciare wrangler dalla configurazione predefinita**.
- Nessun deploy, SQL, email, webhook, ordine, codice o lotto reale è autorizzato da questi script di laboratorio.

## Controlli locali (Node.js 22 o successivo, nessuna dipendenza da installare)

```sh
node --test lab/tests/*.test.mjs
```

I test eseguono il vero handler di upload con servizi simulati. Non certificano le configurazioni Cloudflare/Supabase reali né il percorso iPhone/Safari.
`protected-baseline.json` conserva gli hash di Officina, SQL e Worker fuori dal solo handler upload/versione: una variazione in quelle aree fa fallire il controllo. Non rigenerare gli hash per nascondere una regressione.

## Prima di aprire una vera anteprima

1. Progetto Supabase nuovo e separato, schema revisionato (non applicare indiscriminatamente tutti gli SQL storici), solo account/dati inventati.
2. Worker di test e bucket R2 di test distinti, nessun binding remoto verso `khamakey-media`, nessun cron/webhook/chiave di servizi reali.
3. Configurazione frontend generata separatamente; verifica automatica che URL/chiavi non siano quelli di produzione né quelli degli altri progetti.
4. Nessuna copia del database cliente; nessun login cliente in staging.
5. Attivazione → editor → upload → Salva → PIN → `/m/` → NFC con codici esclusivamente di laboratorio.
6. Officina: genera lotto fittizio, esporta CSV/etichette/QR, verifica slug opaco diverso dal codice, corrispondenza QR/NFC e attivazione. Solo sul database di test.

## Rilascio e ritorno indietro

La base Git non è un backup del database o dei file R2. Prima del rilascio verificare backup e ripristino separatamente.
La correzione resta sul ramo, con PR in bozza. Il passaggio in produzione richiede ambiente pronto, smoke completi e una decisione esplicita di rilascio. Ordine esistente SQL (solo se necessario) → Worker → Pages. Un fallimento critico blocca il rilascio; ripristinare l'artefatto precedente senza annullare dati cliente.

Il piano delle 14 operazioni è in `PLAN.md`; le verifiche manuali ancora aperte non vanno considerate superate dai test simulati.

## Esito correzione upload (NON LIVE)

Worker candidato `v256-media-kindcap-scope`: `kindCap` dichiarata nello scope comune e assegnata dopo la lettura dei limiti. Nessun cambiamento ai valori di quota, auth, MIME, fallback R2 o sicurezza.

Test 23/10/2026 con Node 24.19: prima 15 pass e 7 fail (`ReferenceError: kindCap is not defined`); dopo 22/22 pass. Verificati upload immagini/video/audio/PDF, mancata sessione, permessi, rate limit, servizio indisponibile, spazio, dimensione/formato, cap video, race post-write, sostituzione e fallback contabilità R2.

Baseline: 78 file Officina/SQL e Worker fuori handler upload/versione identici. Non sostituisce smoke reali: login/attivazione, Salva/riapertura, upload reale, PIN, pagina pubblica, QR/NFC, generazione lotto etichette sono ANCORA DA ESEGUIRE in staging. Non usare questa frase come attestazione di produzione funzionante.

### Accesso GitHub bloccato
Il connettore rifiuta create_branch con HTTP 403 `Resource not accessible by integration`. Git locale non ha autenticazione disponibile. Commit locali conservati; push e PR non effettuati finché non viene autorizzato l’accesso. Nessuna fusione in main o pubblicazione.
