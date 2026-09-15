# 34 — GDPR Moments (inventario, non ancora implementato)

> **Segnato 2026-09-15.** Non è una consulenza legale. Non inventare P.IVA / ragione sociale / sede.  
> **Non implementare** checkbox marketing, tabelle consensi o cambi Privacy/Termini finché non c’è un via esplicito.  
> Pagine live: [[03-editor]] (legale) · Privacy IT `pages/moments-privacy.html` · Termini IT `pages/moments-terms.html`.

---

## Perché è in backlog

In registrazione i clienti **non accettano email di marketing**. Non esiste opt-in, né un registro del consenso. Il GDPR del prodotto non è stato calcolato come pacchetto (basi, prove, revoca, dati societari).

La guida «Come funziona» / dove si invita resta un ticket **separato**, da fare dopo: v266 è un primo passo interno, **non** è intuitiva per i clienti.

---

## Cosa c’è già (non è zero)

| Pezzo | Dove | Limite |
|-------|------|--------|
| Checkbox obbligatoria Termini + Privacy | `#momentsSignupLegal` in `pages/moments.html` (IT/EN). Submit JS blocca se non spuntata (`auth.msg.legal_required`). Vale anche per signup da invito. | Solo gate UI. **Non** si salva data, versione policy, IP, né `user_metadata`. Non è un registro art. 7. |
| Privacy + Termini IT/EN | `moments-privacy*.html`, `moments-terms*.html` | Titolare = marchio KhamaKey. **Mancano** ragione sociale, sede, P.IVA. Disclaimer: va revisione legale. |
| Basi dichiarate | Privacy §3: contratto, sicurezza, assistenza, email **operative** (Resend) | Nessuna finalità «marketing / newsletter». |
| Cookie marketing su `/m/` | Notice pubblica: no cookie marketing; `visitorId` hash server-side per PIN/rate-limit | Storage tecnico (sessione Auth, dismiss avviso). |
| Diritti | Privacy §7: accesso/cancellazione/portabilità **via assistenza** | Niente export/delete in-app. |

Email che partono oggi (Resend / SMTP Auth) sono **di servizio**: conferma account, reset password, invito co-editor, assistenza. Non sono campagne promozionali.

---

## Cosa manca (da fare quando si decide)

1. **Consenso marketing (opt-in)**  
   Checkbox **separata**, non obbligatoria, non pre-spuntata, distinta da Termini/Privacy. Testo chiaro (es. novità / offerte KhamaKey Moments). Senza questo **non si inviano** newsletter o promo.

2. **Registro consensi**  
   Salvare almeno: uid/email, `legal_accepted_at`, versione Privacy/Termini, `marketing_opt_in` sì/no + timestamp, fonte (signup NFC / signup invito). Additive; niente `drop`.

3. **Revoca**  
   In Account: togliere il consenso marketing; rispettare unsubscribe se si mandano mail promo.

4. **Dati societari**  
   Inserire P.IVA, sede, ragione sociale **solo** quando sono reali. Stesso blocco già in attesa su Privacy/Termini.

5. **Diritti più pratici**  
   Oggi solo «scrivi all’assistenza». In seguito: procedura documentata (e magari pulsante) per accesso/cancellazione, senza perdere dati per errore.

6. **Altri punti da far vedere al legale**  
   Invito co-editor (email di un terzo); RSVP/guestbook su pagina pubblica (titolare pagina vs KhamaKey); Shopify checkout; minori; transfer extra-UE dei fornitori già elencati.

---

## Ordine suggerito (quando si implementa)

1. Testo Privacy: finalità marketing + come si revoca (IT e EN insieme).  
2. Checkbox marketing in signup (NFC + invito) + salvataggio prova.  
3. Account: stato consenso + off.  
4. Solo dopo: qualunque mail non transazionale.

Non mischiare con restyling guida / NFC / upload.

---

## Non è questo ticket

- Restyling «Come funziona» e dove si invita — **dopo**, UX cliente.  
- Ticket editor in `docs/33`.  
- Business / `editor.html` (consenso cookie analytics Business è un altro prodotto).
