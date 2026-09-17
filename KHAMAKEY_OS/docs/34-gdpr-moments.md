# 34 — GDPR Moments

> Inventario + registro consensi. Non è una consulenza legale. Non inventare P.IVA.  
> Live: Privacy IT `pages/moments-privacy.html` · Termini IT `pages/moments-terms.html`.  
> Registro richieste staff: [[34-gdpr-richieste]].  
> SQL: `sql/khamakey-moments-consents-v175.sql` (prod 2026-09-15) + `sql/khamakey-moments-erase-account-v176.sql` (prod 2026-09-17). Editor **v268**. Worker **invariato**.

---

## Come è stato sistemato

| Fase | Cosa | Tocca la web app? | Stato |
|------|------|-------------------|--------|
| **0** | Niente mail promo; registro trattamenti; procedura diritti via Gmail | No | Attiva |
| **1** | Privacy + Termini IT/EN: novità/offerte solo con consenso specifico | Solo pagine legali | **Fatta** 2026-09-15 (diritti in-app aggiornati 2026-09-17) |
| **2** | Checkbox marketing facoltativa + registro + revoca in Account | Signup + Profilo, additivo | **Fatta** 2026-09-15 (v267 / SQL v175) |
| **3** | P.IVA / sede / ragione sociale | Solo pagine legali | Quando i dati sono **reali** |
| **4** | Export/cancella in-app | Profilo, additivo | **Fatta** 2026-09-17 (v268 / SQL v176) |

La guida «Come funziona» / dove si invita **non** è questo lavoro.

---

## Fase 2 — vincoli rispettati

- Checkbox marketing **separata**, non obbligatoria, **non** pre-spuntata.
- Se non la mettono, account, NFC e Salva partono uguale.
- Se il registro SQL fallisce, signup **non** si blocca (sync al login, `console.warn`).
- Worker, upload, PIN, `/m/`, RPC inviti: **non toccati**.
- Account esistenti: nessun consenso marketing assunto. Possono darlo in Profilo.
- **Niente newsletter** finché non si decide di inviarle (il sì è solo in archivio).

Registro: tabella append-only `moment_user_consents` (RLS: select/insert solo le proprie righe). Ultima riga per tipo = stato. Metadati Auth `kk_mkt` / `kk_legal` solo per coprire la conferma email (niente sessione al signup). Non usare i metadati per autorizzare NFC.

Smoke obbligatorio: login esistente, form signup (Termini required, marketing no), Profilo toggle, Salva, una `/m/` già in uso.

---

## Fase 4 — export e cancellazione (v268 / SQL v176)

Da **Account → Profilo**, dopo il box marketing:

- **Scarica i miei dati** → RPC `export_my_moment_account()` (solo `authenticated`). JSON: account, consensi, pagine di cui è titolare (`page_state`, senza colonna `pin_hash`), elenco pagine dove è solo invitato (niente contenuti del titolare), codici attivazione, RSVP e guestbook delle pagine proprie.
- **Elimina account** → checkbox + email scritta a mano, poi RPC `erase_my_moment_account(p_confirm_email)`. Cancella membership, `moment_events` con `owner_email` = email JWT, `moment_accounts`, consensi, `auth.users` di **quel** uid.

Vincoli:

- Pagine di **altri** titolari intatte (l’invitato sparisce solo come membro).
- Codici NFC già claimed **non** si riciclano (`claimed_event_id` va a NULL per cascade; status resta claimed).
- Staff (`admin.full` / `moments.write`) e profili con `businesses.profile_id` **bloccati** in SQL (`MOMENT_ERASE_STAFF` / `MOMENT_ERASE_BUSINESS`).
- Se l’RPC fallisce, l’account resta (fail-safe). Non si cancellano media R2 dal client: dopo l’erase il JWT non vale più per `POST /api/media/delete`; eventuali file orfani restano nel bucket (non sono pagine di altri).
- **Non** eseguire erase E2E su account reali in produzione.

Execute: `authenticated` sì, `anon` no.

---

## Registro dei trattamenti (Moments)

| Trattamento | Dati | Base | Fornitore | Conservazione |
|-------------|------|------|-----------|----------------|
| Account | email, nome, password hash, lingua UI | Contratto | Supabase Auth | Finché l’account esiste (cancellabile da Profilo) |
| Consensi | legal / marketing, data, fonte, versione policy | Contratto (legal) / consenso (marketing) | `moment_user_consents` | Finché serve prova del consenso; cancellati con l’account |
| Pagina Moments | testi, media, PIN hash, slug | Contratto | Supabase + R2 | Finché la pagina esiste; all’erase titolare le pagine proprie spariscono |
| Attivazione NFC | codice, evento collegato | Contratto | Supabase | Vita del pezzo; dopo erase il codice resta claimed, senza pagina |
| Invito co-editor | email invitata, token | Contratto | Worker + Resend + Supabase | Finché membro / invito valido |
| RSVP / guestbook | dati ospite | Contratto / legittimo interesse titolare pagina | Worker + Supabase | Finché la funzione è attiva; cascade se il titolare cancella la pagina |
| Assistenza | oggetto, messaggio, email | Contratto | Resend → Gmail staff | Tempo utile al supporto |
| Email di servizio | destinatario, contenuto transazionale | Contratto | Resend / SMTP Auth | Log fornitore |
| Sicurezza | IP/UA in hash, rate limit PIN | Interesse legittimo / sicurezza | Worker + Postgres | Breve, tecnica |
| Acquisto fisico | ordine, spedizione | Contratto vendita | Shopify | Policy Shopify |

**Non trattiamo (oggi):** profilazione marketing, newsletter, cookie pubblicitari, vendita di liste.

---

## Procedura staff — diritti (Gmail)

Canale: Assistenza Moments o `info@khamakeymoments.com`.

1. Identità: rispondere all’email dell’account.  
2. Annotare in [[34-gdpr-richieste]].  
3. Obiettivo 30 giorni.  
4. Opposizione marketing: il cliente può già togliere il consenso in Account → Profilo. Se scrive a Gmail, confermare e (se serve) far spuntare off in Profilo.  
5. Accesso / portabilità: il cliente può già scaricare il JSON da Profilo. Se non riesce, assistenza.  
6. Cancellazione account: il cliente può già farlo da Profilo (email + spunta). **Vietato** delete di massa. Se l’RPC blocca (staff / business collegato), non cancellare da SQL: gestire a mano con via esplicita del titolare prodotto su **quell’** uid.

Agenti AI: non usare questa procedura per SQL di delete.

---

## Non è questo ticket

- Restyling guida / dove si invita.  
- Ticket editor `docs/33`.  
- Business (`editor.html`).  
- Inventare dati societari.  
- Inviare la prima newsletter (serve un lavoro a parte, solo su chi ha `granted = true`).
- Pulizia orfani R2 dopo self-erase.
