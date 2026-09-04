# 32 — Email Auth Moments (benvenuto + conferma)

> **Ops dashboard.** Non richiede deploy codice. Progetto Supabase Moments: `cuxlwaocjqwzluycznyp`.  
> Da qui l’agente **non** può salvare i template: vanno incollati nel dashboard.

Le mail di conferma **non** escono dal Worker: le invia **Supabase Auth** via SMTP Resend.

Lingua: la stessa scelta fatta in registrazione (`user_metadata.ui_locale`, default **italiano**). L’utente non traduce nulla. Chi ha scelto English riceve EN; gli altri (e i vecchi account senza metadato) restano in IT.

## Dominio mittente

| Campo | Valore |
|-------|--------|
| Da | `KhamaKey Moments <noreply@khamakeymoments.com>` |
| SMTP | Auth → Settings → SMTP: `smtp.resend.com`, porta `465`, user `resend` |
| Rispondi a (opz.) | `info@khamakeymoments.com` |

Logo (sfondo chiaro):  
`https://app.khamakeymoments.com/khamakey-moments-wordmark-on-light.png`

## Dove incollare

[Auth → Email Templates](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/templates)

1. **Confirm signup**
   - **Subject** → contenuto di [`email/moments-confirm-signup.subject.txt`](email/moments-confirm-signup.subject.txt)
   - **Body** → contenuto di [`email/moments-confirm-signup.html`](email/moments-confirm-signup.html)
2. **Reset password** (stessa lingua dell’account)
   - **Subject** → [`email/moments-recovery.subject.txt`](email/moments-recovery.subject.txt)
   - **Body** → [`email/moments-recovery.html`](email/moments-recovery.html)
3. Il link resta **`{{ .ConfirmationURL }}`** (mai solo `{{ .SiteURL }}`)
4. Save → le mail **già partite** non cambiano; vale dal prossimo invio

Se l’oggetto non accetta `{{ if }}`, usa: `Benvenuto / Welcome to KhamaKey Moments` (conferma) e `Reimposta la password / Reset your password` (recovery).

## Come sceglie la lingua

- Signup Moments v251 scrive `ui_locale` (`it` \| `en`) in `options.data`.
- Il template Go legge `{{ .Data.ui_locale }}`.
- `en` → inglese; qualunque altro valore o campo assente → italiano.

## Tono

Prima mail dopo l’acquisto + registrazione. Non è un avviso tecnico.

Struttura:

1. Logo
2. Invito al mondo esclusivo
3. Grazie per aver scelto / acquistato
4. Cosa è KhamaKey Moments (il Moment = chiave di uno spazio privato)
5. Tre passi per entrare
6. Bottone **Entra nel tuo spazio** / **Enter your space**
7. Firma del team

## Testo (come lo legge il cliente)

### Italiano (default)

**Oggetto:** Benvenuto nel mondo KhamaKey Moments

Ciao,

grazie per averci scelto. Sei entrato in un mondo riservato, dove ogni Moment apre un ricordo — non una pagina qualsiasi.

Il Moment che hai tra le mani è la chiave. Che tu lo tenga per te o lo doni, custodisce uno spazio privato: foto, parole, date, una storia. Tu la prepari da Moments. Chi ha il Moment può entrarvi. Il PIN è una scelta tua: lo aggiungi o lo togli quando vuoi.

Tre passi:

1. Attiva l’account (il bottone qui sotto)
2. Accedi a Moments: è l’area privata dove crei e aggiorni la pagina del tuo Moment
3. Riempi la pagina. Quando salvi, il Moment è pronto.

Bottone: **Entra nel tuo spazio**

A presto,  
Il team KhamaKey Moments

Questa è una mail automatica. Non rispondere a questo indirizzo.

### English (`ui_locale = en`)

**Subject:** Welcome to KhamaKey Moments

Hi,

thank you for choosing us. You’ve entered a private world, where every Moment opens a memory — not just any page.

The Moment in your hands is the key. Keep it for yourself or give it as a gift: it holds a private space — photos, words, dates, a story. You prepare it in Moments. Whoever has the Moment can enter. The PIN is optional: add it or remove it whenever you want.

Three steps:

1. Activate your account (the button below)
2. Sign in to Moments: it’s the private area where you create and update your Moment’s page
3. Fill in the page. When you save, the Moment is ready.

Button: **Enter your space**

See you soon,  
The KhamaKey Moments team

This is an automatic email. Please don’t reply to this address.

Nota: in testata si usa il wordmark su navy (`khamakey-moments-wordmark.png`, rosa+bianco). Se l’immagine non carica, resta l’`alt` «KhamaKey Moments».

## Recovery (stesso mondo, altro scopo)

Stesso involucro visivo. Lingua da `ui_locale` sull’account (anche se l’hanno cambiata dopo dal menu).

| | IT | EN |
|--|----|----|
| Oggetto | Reimposta la password | Reset your password |
| Titolo | Reimposta la password | Reset your password |
| Corpo | Scegli una nuova password per tornare nel tuo spazio. | Choose a new password to get back into your space. |
| Bottone | Scegli nuova password | Choose a new password |
| href | `{{ .ConfirmationURL }}` | `{{ .ConfirmationURL }}` |

*KhamaKey OS — 2026-09-04*
