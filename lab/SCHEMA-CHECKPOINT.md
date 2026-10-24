# Schema del laboratorio — checkpoint 2026-10-23

Destinazione esclusiva: ybmnrtvksvndpdiofmqm. Produzione Moments cuxlwaocjqwzluycznyp non modificata. Nessun merge o deploy.

## Risultato verificato

- Catalogo strutturale letto senza righe cliente: 70 tabelle, 102 funzioni, 124 policy e 4 trigger ricostruiti nel progetto nuovo. Sequenza bigint conservata come testo per evitare arrotondamenti JavaScript.
- Conteggio effettivo su tutte le 70 tabelle: **0 righe**. Nessun account Auth o dato fittizio ancora creato.
- Accesso anon/authenticated alle tabelle: 0; funzioni eseguibili: 0. Accessi ordinari chiusi intenzionalmente. Lo schema non è uno staging utilizzabile.
- Funzione Business analytics disabilitata nella sola copia laboratorio; ingest key privata assente e senza fallback. Nessun segreto o binding remoto di produzione configurato.
- Nessun frontend/Worker locale avviato, nessun bucket remoto o servizio email/webhook collegato.
- Test locali: **27/27 pass** (22 upload/protezioni esistenti + 5 isolamento schema). Non sostituiscono prove browser o iPhone/Safari.

## Incidenti e recupero

Primo tentativo schema annullato per bigint arrotondato; successiva richiesta troppo grande fallita nel trasporto. Verificato target vuoto prima di ricostruire per gruppi di definizioni.
La revisione automatica ha respinto la copia integrale per una chiave legacy incorporata e permessi troppo ampi. Chiave esclusa dalla copia laboratorio e Business analytics disabilitata. Un successivo gruppo di permessi è stato nuovamente respinto (grant autenticati ampi e RPC amministrative/distruttive). **Quel gruppo non è stato applicato né ritentato**: revocati gli accessi ordinari, completate solo policy e trigger mancanti. Nessun aggiramento della revisione.

## Riproducibilità e limiti

lab/schema-catalog.sql è una lettura di catalogo, non esporta righe. Le definizioni possono però contenere segreti legacy: snapshot e SQL generati devono rimanere in .lab/ ignorata da Git, mai stampati o pubblicati.
lab/restore-schema.mjs genera SQL solo se LAB_PROJECT_REF è la destinazione esatta, richiede un database senza tabelle applicative e chiude tutti gli accessi. Non applica SQL e non gestisce migrazioni incrementali. **Non rieseguire sul laboratorio ormai popolato di struttura.** Le ACL del sorgente sono deliberatamente ignorate. Nessun file sql/ storico modificato o applicato alla produzione.

Advisory laboratorio: 8 INFO RLS senza policy (negazione dell'accesso diretto; non aggiungere policy permissive per silenziare il controllo) e 3 WARN search_path: app_private.default_moments_plan_limits, app_private.random_moment_public_slug, public.moment_page_editor_cap. Da revisionare prima dell'abilitazione; nessuna correzione automatica in produzione.
Dipendenze Worker installate dal lock esistente solo per uso locale. Wrangler 4.108.0 avvisa di problemi deploy CI; non è stato usato per deploy né aggiornato.

## Passaggi ancora aperti

1. Revisionare ogni chiamata necessaria e abilitare un elenco minimo di permessi nel solo laboratorio. Nessun grant globale, reset, cancellazione, cron, integrazione o servizio reale.
2. Configurazione frontend separata, Worker locale con R2 locale e controllo automatico di destinazioni/credenziali. Non servire pages/ e non usare worker/wrangler.toml di produzione.
3. Account inventati e prove Officina → attivazione → editor → upload → Salva/riapertura → PIN → pagina pubblica → QR/NFC. Verificare anche rifiuto accessi tra due account.
4. Backup/ripristino e decisione esplicita prima di proporre rilascio. PR #6 resta bozza.
