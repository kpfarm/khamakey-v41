# 34 — GDPR Moments

> Inventario + registro consensi. Non è una consulenza legale. Non inventare P.IVA.  
> Live: Privacy IT `pages/moments-privacy.html` · Termini IT `pages/moments-terms.html`.  
> Registro richieste staff: [[34-gdpr-richieste]].  
> SQL: `sql/khamakey-moments-consents-v175.sql` (prod 2026-09-15). Editor **v267**. Worker **invariato**.

---

## Come è stato sistemato

| Fase | Cosa | Tocca la web app? | Stato |
|------|------|-------------------|--------|
| **0** | Niente mail promo; registro trattamenti; procedura diritti via Gmail | No | Attiva |
| **1** | Privacy + Termini IT/EN: novità/offerte solo con consenso specifico | Solo pagine legali | **Fatta** 2026-09-15 |
| **2** | Checkbox marketing facoltativa + registro + revoca in Account | Signup + Profilo, additivo | **Fatta** 2026-09-15 (v267 / SQL v175) |
| **3** | P.IVA / sede / ragione sociale | Solo pagine legali | Quando i dati sono **reali** |
| **4** | Export/cancella in-app | Sì | Non ora; oggi si fa da Gmail |

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

## Registro dei trattamenti (Moments)

| Trattamento | Dati | Base | Fornitore | Conservazione |
|-------------|------|------|-----------|----------------|
| Account | email, nome, password hash, lingua UI | Contratto | Supabase Auth | Finché l’account esiste |
| Consensi | legal / marketing, data, fonte, versione policy | Contratto (legal) / consenso (marketing) | `moment_user_consents` | Finché serve prova del consenso |
| Pagina Moments | testi, media, PIN hash, slug | Contratto | Supabase + R2 | Finché la pagina esiste |
| Attivazione NFC | codice, evento collegato | Contratto | Supabase | Vita del pezzo |
| Invito co-editor | email invitata, token | Contratto | Worker + Resend + Supabase | Finché membro / invito valido |
| RSVP / guestbook | dati ospite | Contratto / legittimo interesse titolare pagina | Worker + Supabase | Finché la funzione è attiva |
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
5. Cancellazione account: **vietato** delete di massa; solo con via esplicita del titolare prodotto su **quell’** uid.

Agenti AI: non usare questa procedura per SQL di delete.

---

## Non è questo ticket

- Restyling guida / dove si invita.  
- Ticket editor `docs/33`.  
- Business (`editor.html`).  
- Inventare dati societari.  
- Inviare la prima newsletter (serve un lavoro a parte, solo su chi ha `granted = true`).
