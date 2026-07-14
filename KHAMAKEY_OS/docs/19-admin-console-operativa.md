# 19 — Piano Admin Console Operativa

> Data: 2026-07-14.
> Obiettivo: trasformare il pannello Admin da insieme di sezioni cablate a console operativa quotidiana per vendita, produzione, supporto, CRM, ordini, magazzino e rete partner.

---

## Principio di lavoro

Si lavora su **1-2 sezioni alla volta**. Ogni blocco deve chiudersi con:

1. UI chiara e azione primaria visibile;
2. dati reali o seed di collaudo minimo;
3. filtri e ricerca utili;
4. dettaglio/drawer con modifica;
5. stati operativi chiari;
6. aggiornamento dashboard/alert;
7. verifica codice + Supabase + prova manuale guidata;
8. documentazione aggiornata.

Non si passa alla sezione successiva se il flusso principale non e' collaudabile.

---

## Stato supporto

Il supporto deve essere attivo sia per Business sia per Moments.

Stato attuale dopo v128/v89:

- **Business**: nell'Account dell'editor esiste `Assistenza`; `pages/app.js` salva ticket con `business_id`, `profile_id`, `source='business_editor'`.
- **Moments**: menu account `Assistenza` e form nella scheda Account; `pages/moments.js` salva ticket con `profile_id`, `source='moments_editor'`.
- **Admin**: tab `Supporto` mostra ticket globali, filtri, ricerca, cambio stato/priorita' e nota interna.
- **Supabase**: `platform_support_tickets` ha policy cliente `profile_id = auth.uid()` e policy staff `support.read/write`.

Gap ancora aperti:

- assegnazione responsabile ticket;
- risposta cliente/email;
- cronologia conversazione completa;
- SLA/priorita' con alert dashboard;
- test con ticket reale Business e ticket reale Moments.

---

## Definizione di sezione operativa

Una sezione Admin e' operativa solo quando:

- **crea** il record principale;
- **legge** lista e dettaglio;
- **modifica** stato/campi chiave;
- **filtra/cerca** per i campi usati ogni giorno;
- **collega** i record correlati (cliente, ordine, codice, agente, ticket);
- **produce output** quando serve (CSV, PDF, link, tracking, email);
- **ha stato vuoto utile** con CTA, non una tabella morta;
- **genera alert dashboard** se richiede azione;
- **ha test manuale documentato**.

---

## Ricontrollo pannello Admin

Mappa attuale: 19 sezioni, 27 form, `pages/admin.js` sintatticamente valido.

| Sezione | Stato oggi | Per renderla operativa |
|---------|------------|------------------------|
| Dashboard | Buono base v130 | Ora mostra KPI ordini/incassi, grafici base ordini/incassi e pipeline stati. Deve completare CTA per follow-up CRM, integrazioni rotte e margine netto reale. |
| Clienti Business | Buono base | Aggiungere azioni rapide: crea ticket, crea ordine, apri CRM, apri pagina/editor, stato onboarding visibile. |
| Clienti Moments | Buono/parziale | Serve wizard test account: SKU -> codice -> email -> pagina -> editor -> link `/k/` e `/m/`. |
| Moments | Buono base | Rafforzare dettaglio pagina, stato pubblicazione, PIN, link e azioni admin. |
| Ordini | Buono/parziale | Serve pipeline ordine: ricevuto, da produrre, da stampare, da spedire, spedito, problema. |
| Magazzino NFC | Buono dopo v127 | Va collaudato con lotto reale; serve alert stock minimo e collegamento diretto a spedizione. |
| Catalogo online | Buono base | Mancano asset vendita, copy, traduzioni SKU, stato Shopify piu' leggibile. |
| NFC / Spedizioni | Non operativa | Oggi e' rimando. Deve diventare console produzione/spedizione. |
| Supporto | Buono base dopo v128 | Aggiungere responsabile, risposta cliente/email, SLA e conversazione. |
| CRM | Buono/parziale | Serve vista oggi/settimana/scaduti, reminder e collegamento ticket/ordini. |
| Magazzino Business | Base | Serve carico/scarico reale, movimenti da ordine, alert minimi. |
| Partner e agenti | Parziale | Mancano dati di collaudo; serve wizard nuovo partner e link portale. |
| Chi segue chi | Parziale | Serve test con root/downline e viste rete verificabili. |
| Quanto spetta | Parziale | UI presente, ma 0 provvigioni live; serve ordine agente end-to-end. |
| Piani e pagamenti | Parziale | Checkout dipende da Stripe secrets/price; serve stato configurazione chiaro. |
| Piani abbonamento | Buono base | CRUD presente; manca validazione price ID e anteprima offerta. |
| Materiali | Buono base | Collegare materiali a agenti/clienti e output marketing. |
| Collegamenti | Parziale | Deve dire cosa manca per Shopify/Stripe/Resend/PayPal, senza salvare secrets nel DB. |
| Collaboratori/Permessi | Base | Serve preset ruoli e audit trail modifiche permessi. |

---

## Dati live che guidano il piano

Conteggi Supabase verificati il 2026-07-14:

| Dato | Conteggio | Impatto |
|------|-----------|---------|
| Business | 2 | Clienti Business testabili. |
| Moments | 1 | Flusso Moments esiste ma non basta per collaudo ampio. |
| Codici Moments disponibili | 0 | Blocco per nuovi test account NFC. |
| SKU Moments catalogo | 3 | Base catalogo presente. |
| Ordini | 1 | Pipeline ordine non ancora popolata. |
| Agenti | 0 | Rete partner non collaudabile finche' non si crea almeno un agente. |
| Provvigioni | 0 | Trigger/UI presenti ma non testati con ordine agente reale. |
| Ticket supporto | 0 | UI pronta, serve ticket reale Business + Moments. |
| Transazioni/Webhook | 0 | Billing/integrations non collaudati end-to-end. |
| Movimenti stock Business | 0 | Magazzino Business non collaudato. |

---

## Ordine operativo consigliato

### Blocco 1 — Supporto + CRM

Obiettivo: ogni richiesta utente entra in Admin e diventa lavoro tracciabile.

Sezioni: `Supporto`, `CRM`, scheda cliente.

Da fare:

1. aggiungere responsabile ticket (`assigned_member_id`) nella UI;
2. aggiungere risposta/note conversazione ticket;
3. creare vista CRM `Oggi`, `Scaduti`, `Questa settimana`;
4. mostrare ticket aperti nella scheda CRM cliente;
5. dashboard alert: ticket urgenti, ticket senza responsabile, follow-up scaduti;
6. creare 2 ticket reali di test: uno Business, uno Moments.

Output atteso:

- supporto Business/Moments verificato end-to-end;
- CRM usabile come agenda giornaliera;
- documento test manuale aggiornato.

### Blocco 2 — Ordini + NFC / Spedizioni

Obiettivo: dalla vendita alla consegna senza saltare tra sezioni.

Sezioni: `Ordini`, `NFC / Spedizioni`, `Magazzino NFC`.

Da fare:

1. trasformare `NFC / Spedizioni` in console reale;
2. pipeline stati: `da_produrre`, `da_stampare`, `da_spedire`, `spedito`, `problema`;
3. collegare ordine, codice NFC, cliente, agente, tracking;
4. azioni bulk: stampa PDF, esporta CSV, assegna tracking, segna spedito;
5. alert dashboard per ordini da evadere e codici disponibili a 0;
6. collaudo: genera 5 codici, crea ordine test, assegna codice, stampa/esporta, segna spedito.

Output atteso:

- primo flusso stock-first completo;
- account test Moments creabile senza blocchi;
- link `/k/` e `/m/` verificabili.

### Blocco 3 — Clienti Moments + Creazione Account Test

Obiettivo: poter creare account e pagine di test rapidamente.

Sezioni: `Clienti Moments`, `Magazzino NFC`, `Moments`.

Da fare:

1. wizard `Crea test Moments`;
2. scelta/creazione SKU;
3. generazione o selezione codice disponibile;
4. email cliente;
5. provisioning pagina;
6. apertura editor e pagina finale;
7. riepilogo link: NFC `/k/<code>`, pagina `/m/<slug>`, editor.

Output atteso:

- account test creato in meno di 2 minuti;
- nessun passaggio manuale nascosto.

### Blocco 4 — Partner + Provvigioni

Obiettivo: rete partner vendibile e verificabile.

Sezioni: `Partner e agenti`, `Chi segue chi`, `Quanto spetta`, `Ordini`.

Da fare:

1. wizard nuovo partner: dati, ruolo, territorio, listino, link portale;
2. creare agente root + downline;
3. creare consegna o assegnazione codici;
4. creare ordine con agente;
5. verificare provvigione pending -> approved -> paid/cancelled;
6. export report provvigioni per periodo.

Output atteso:

- rete partner collaudata con dati reali;
- provvigioni dimostrabili.

### Blocco 5 — Catalogo + Materiali + Creative Engine

Obiettivo: prodotti vendibili con asset pronti.

Sezioni: `Catalogo online`, `Materiali`, documenti marketing.

Da fare:

1. associare immagini/copy/video agli SKU;
2. campi marketplace/social per ogni prodotto;
3. stato contenuti: mancante, bozza, pronto, pubblicato;
4. export materiali per social/Shopify;
5. collegamento ai file Antigravity nel vault.

Output atteso:

- SKU pronti alla vendita, non solo record tecnici.

### Blocco 6 — Billing + Integrazioni

Obiettivo: sapere cosa blocca vendita e pagamenti.

Sezioni: `Piani e pagamenti`, `Piani abbonamento`, `Collegamenti`.

Da fare:

1. stato Stripe: secret, price ID, webhook, ultimo evento;
2. stato Shopify: shop, webhook ordini, ultimo sync;
3. stato Resend/PayPal;
4. test email e test checkout;
5. messaggi chiari su cosa manca, senza salvare secrets in Supabase.

Output atteso:

- pannello diagnostico per integrazioni;
- niente segreti nel codice o nel DB.

### Blocco 7 — Staff + Permessi + Audit Trail

Obiettivo: usare il pannello senza rischiare permessi confusi.

Sezioni: `Collaboratori`, `Permessi`.

Da fare:

1. preset ruoli: Owner, Operativo, Supporto, Magazzino, Marketing, Agente;
2. spiegazione permessi in linguaggio umano;
3. audit trail per modifiche sensibili;
4. controllo ultimo accesso e stato invito.

Output atteso:

- onboarding collaboratori chiaro;
- tracciabilita' modifiche critiche.

---

## Roadmap di esecuzione

| Sprint | Sezioni | Risultato |
|--------|---------|-----------|
| Sprint 1 | Supporto + CRM | Ticket Business/Moments reali, responsabile, follow-up, alert. |
| Sprint 2 | Ordini + Spedizioni | Pipeline evasione e tracking operativi. |
| Sprint 3 | Clienti Moments + Magazzino NFC | Wizard account test e stock collaudato. |
| Sprint 4 | Partner + Provvigioni | Agente, downline, ordine e provvigione verificati. |
| Sprint 5 | Catalogo + Materiali | SKU vendibili con asset/copy/social. |
| Sprint 6 | Billing + Integrazioni | Diagnostica vendita/pagamenti. |
| Sprint 7 | Staff + Permessi | Ruoli preset e audit trail. |

---

## Primo passo operativo

Partire da **Supporto + CRM**, perche':

- il supporto e' gia' attivo in Business e Moments;
- manca poco per renderlo davvero usabile ogni giorno;
- collega direttamente clienti, problemi, follow-up e dashboard;
- non richiede toccare `worker.js`, quindi non confligge con Antigravity.

Prima implementazione consigliata:

1. support ticket: responsabile + nota/risposta;
2. CRM: vista follow-up oggi/scaduti;
3. dashboard: alert ticket/follow-up;
4. test reale: aprire un ticket Business e uno Moments, chiuderli da Admin.
