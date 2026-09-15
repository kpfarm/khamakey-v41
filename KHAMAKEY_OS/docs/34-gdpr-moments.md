# 34 — GDPR Moments

> Inventario + **come sistemiamo senza toccare la web app**.  
> Non è una consulenza legale. Non inventare P.IVA / ragione sociale / sede.  
> Live: Privacy IT `pages/moments-privacy.html` · Termini IT `pages/moments-terms.html`.  
> Registro richieste staff: [[34-gdpr-richieste]].

**Regola di questa correzione:** finché non c’è un via esplicito, **zero** modifiche a `moments.html`, `moments.js`, Worker, SQL, NFC, upload, editor. La web app resta com’è.

---

## Come iniziamo (ordine)

| Fase | Cosa | Tocca la web app? | Stato |
|------|------|-------------------|--------|
| **0** | Regole interne: niente mail promo; registro trattamenti; procedura diritti via Gmail | No | **Attiva** (2026-09-15) |
| **1** | Due frasi in Privacy IT+EN: «non inviamo comunicazioni promozionali» (pagine legali già esistenti) | Solo 4 HTML legali, non editor/NFC | In attesa via |
| **2** | Checkbox marketing + salvataggio consenso | Sì, solo signup/Account, additive | Non ora |
| **3** | P.IVA / sede / ragione sociale in Privacy+Termini | Solo pagine legali | Quando i dati sono **reali** |
| **4** | Export/cancella in-app | Sì | Non ora; oggi si fa da Gmail |

La guida «Come funziona» / dove si invita **non** è questo lavoro.

---

## Fase 0 — cosa vale da oggi (senza codice)

1. **Niente newsletter, promo, broadcast Resend, sequenze marketing.** Resend resta solo per mail di servizio già in produzione: conferma account, reset password, invito co-editor, assistenza.
2. **Niente liste contatti / Audience Resend** costruite dagli account Moments.
3. **Richieste privacy** (accesso, cancellazione, opposizione): arrivano da Account → Assistenza → Gmail. Si rispondono da lì. Si annotano in [[34-gdpr-richieste]]. **Nessuno** cancella dati in SQL o R2 senza conferma esplicita del titolare del prodotto.
4. La checkbox Termini+Privacy al signup **resta com’è**. Non la spostiamo, non la togliamo, non aggiungiamo marketing finché non si apre la Fase 2.

---

## Cosa c’è già nel prodotto (non toccare)

| Pezzo | Dove | Limite |
|-------|------|--------|
| Checkbox obbligatoria Termini + Privacy | `#momentsSignupLegal` — anche signup da invito | Gate UI. Non è un registro (niente data/versione salvata). |
| Privacy + Termini IT/EN | `moments-privacy*.html`, `moments-terms*.html` | Titolare = marchio. Mancano ragione sociale, sede, P.IVA. |
| Basi in Privacy §3 | Contratto, sicurezza, assistenza, email **operative** | Nessuna finalità marketing. |
| Cookie su `/m/` | Notice: no cookie marketing; hash server-side PIN/rate-limit | Storage tecnico (sessione Auth, dismiss avviso). |
| Diritti | Privacy §7: via assistenza | Niente pulsante in-app. |

---

## Registro dei trattamenti (Moments)

| Trattamento | Dati | Base | Fornitore | Conservazione |
|-------------|------|------|-----------|----------------|
| Account | email, nome, password hash, lingua UI | Contratto | Supabase Auth | Finché l’account esiste |
| Pagina Moments | testi, media, PIN hash, slug | Contratto | Supabase + R2 (Cloudflare) | Finché la pagina esiste |
| Attivazione NFC | codice, evento collegato | Contratto | Supabase | Vita del pezzo |
| Invito co-editor | email invitata, token | Contratto (chi invita indica un collaboratore) | Worker + Resend + Supabase | Finché membro / invito valido |
| RSVP / guestbook | dati inseriti dall’ospite | Contratto / interesse legittimo del titolare pagina | Worker + Supabase | Finché la funzione è attiva sulla pagina |
| Assistenza | oggetto, messaggio, email | Contratto | Resend → Gmail staff | Tempo utile al supporto |
| Email di servizio | destinatario, contenuto transazionale | Contratto | Resend / SMTP Auth | Log fornitore |
| Sicurezza | IP/UA in hash, rate limit PIN | Interesse legittimo / sicurezza | Worker + Postgres | Breve, tecnica |
| Acquisto fisico | ordine, spedizione | Contratto vendita | Shopify | Policy Shopify |

**Non trattiamo (oggi):** profilazione marketing, newsletter, cookie pubblicitari, vendita di liste.

---

## Procedura staff — diritti (Gmail)

Canale: email da Assistenza Moments (`Reply-To` = cliente) o `info@khamakeymoments.com`.

1. **Identità** — rispondere solo all’indirizzo dell’account (o chiedere conferma se arriva da un’altra casella).
2. **Annotare** la riga in [[34-gdpr-richieste]] (data, email, tipo, esito). Non mettere dati extra inutili.
3. **Termini di risposta** — obiettivo 30 giorni.
4. **Accesso / portabilità** — elenco di cosa teniamo (tabella sopra). Export concreto: solo con via del titolare prodotto; non inventare dump da agenti.
5. **Cancellazione** — **vietato** `drop` / `truncate` / delete di massa. Cancellare un account è un atto umano, confermato, su **quell’** uid. Media R2 e pagina: stesso criterio. Non farlo “di passaggio” in un altro task.
6. **Opposizione marketing** — rispondere: *non inviamo email promozionali; la richiesta è annotata*. Non serve un flag in app finché non esiste la Fase 2.
7. **Reclamo Garante** — non discutere in chat pubblica; passare al titolare.

Agenti AI: questa procedura **non** autorizza SQL di delete né cambi a signup.

---

## Fase 1 (dopo, via esplicito — ancora senza editor)

Aggiungere in Privacy IT e EN, sezione finalità, una riga vera:

- IT: non inviamo comunicazioni promozionali o newsletter in assenza di un consenso specifico.
- EN: equivalente.

Niente altre riscritture. P.IVA resta in attesa. File: solo `moments-privacy.html` + `moments-privacy-en.html` (+ `?v=` CSS legale se serve). **Non** `moments.js` / Worker.

---

## Fase 2 (prima volta che si tocca la web app — solo con via)

Checkbox marketing **separata**, non obbligatoria, non pre-spuntata. Salvataggio additivo (metadata o tabella nuova). Account: off.  
Fuori scope: NFC, Salva, upload, `/m/`, PIN, inviti RPC.

---

## Non è questo ticket

- Restyling guida / dove si invita.  
- Ticket editor `docs/33`.  
- Business (`editor.html`, cookie analytics Business).  
- Inventare dati societari.
