# 32 — Email Auth Moments (conferma account)

> **Ops dashboard.** Non richiede deploy codice. Progetto Supabase Moments: `cuxlwaocjqwzluycznyp`.  
> Da qui l’agente **non** può salvare i template: vanno incollati nel dashboard.

Le mail di conferma **non** escono dal Worker: le invia **Supabase Auth** via SMTP Resend.

## Dominio mittente

| Campo | Valore |
|-------|--------|
| Da | `KhamaKey Moments <noreply@khamakeymoments.com>` |
| SMTP | Auth → Settings → SMTP: `smtp.resend.com`, porta `465`, user `resend` |
| Rispondi a (opz.) | `info@khamakeymoments.com` |

Se l’utente vede ancora `@supabase.co` / `noreply@mail.app.supabase.io`, il mittente SMTP non è applicato: ricontrolla SMTP + DNS (SPF/DKIM Resend sul dominio `khamakeymoments.com`).

Non usare un mittente Business. Questo progetto Auth è Moments.

## Testo conferma (semplice)

Obiettivo: una riga chiara + un bottone.

**Subject**

```text
Attiva il tuo account
```

**Body HTML** — Auth → Email Templates → **Confirm signup**  
Il link **deve** essere `{{ .ConfirmationURL }}` (mai solo `{{ .SiteURL }}`).

```html
<!doctype html>
<html lang="it">
<body style="margin:0;padding:24px;background:#FFF9F5;font-family:Georgia,'Times New Roman',serif;color:#18202F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;">
    <tr>
      <td style="padding:32px 28px;">
        <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#AA626C;">KhamaKey Moments</p>
        <h1 style="margin:16px 0 0;font-size:24px;line-height:1.25;color:#071A3C;">Attiva il tuo account</h1>
        <p style="margin:14px 0 0;font-size:16px;line-height:1.5;">Clicca sul link per attivare l’account. Poi torna su Moments e accedi.</p>
        <p style="margin:28px 0 0;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#AA626C;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;font-family:Arial,sans-serif;">Attiva account</a>
        </p>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#5a6270;">Se il pulsante non si apre, copia questo indirizzo:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#AA626C;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#5a6270;">Activate your account by clicking the button, then sign in to Moments.</p>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Dove incollare

1. [Auth → SMTP](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/settings)  
   Sender name = `KhamaKey Moments` · Sender email = `noreply@khamakeymoments.com`
2. [Auth → Email Templates → Confirm signup](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/templates)  
   Subject + HTML sopra → Save
3. Signup di test (o re-invia conferma) → nella mail deve comparire **Attiva account**, mittente Moments, link verso `app.khamakeymoments.com/moments`

Le mail **già inviate** restano col vecchio testo. Serve una mail nuova.

## Recovery (stesso tono, opzionale)

**Subject:** `Reimposta la password`

Stesso HTML, ma:

- titolo: `Reimposta la password`
- bottone: `Scegli nuova password`
- href sempre `{{ .ConfirmationURL }}`

*KhamaKey OS — 2026-08-29*
