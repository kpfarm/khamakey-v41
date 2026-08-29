# 32 — Email Auth Moments (benvenuto + conferma)

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

## Tono

Non è una mail tecnica. È il primo contatto dopo la registrazione: **logo**, **benvenuto**, **grazie**, poi il bottone per attivare.

Logo pubblico (sfondo chiaro):  
`https://app.khamakeymoments.com/khamakey-moments-wordmark-on-light.png`

## Dove incollare

[Auth → Email Templates → Confirm signup](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/templates)

- **Subject** → oggetto sotto
- **Body** → HTML sotto (il link resta `{{ .ConfirmationURL }}`)
- Save

Le mail già inviate restano vecchie. Serve una conferma nuova.

## Testo di benvenuto

**Subject**

```text
Benvenuto su KhamaKey Moments
```

**Cosa legge il cliente**

- Logo KhamaKey Moments
- Ciao,
- Grazie per aver scelto KhamaKey Moments.
- Il tuo spazio è pronto. Per entrarci, attiva l’account.
- Bottone: **Attiva il tuo account**
- Firma: Il team KhamaKey Moments

## Body HTML

```html
<!doctype html>
<html lang="it">
<body style="margin:0;padding:0;background:#F3E3DE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E3DE;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFF9F5;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:36px 32px 8px;text-align:center;">
              <img src="https://app.khamakeymoments.com/khamakey-moments-wordmark-on-light.png" width="220" alt="KhamaKey Moments" style="display:block;margin:0 auto;width:220px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:8px 48px 0;text-align:center;">
              <div style="height:1px;background:#D98C95;opacity:.55;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;font-family:Georgia,'Times New Roman',serif;color:#071A3C;text-align:center;">
              <p style="margin:0;font-size:15px;line-height:1.5;color:#AA626C;">Ciao,</p>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.3;font-weight:normal;color:#071A3C;">benvenuto su KhamaKey Moments.</h1>
              <p style="margin:18px 0 0;font-size:16px;line-height:1.6;color:#18202F;">Grazie per aver scelto di custodire i tuoi ricordi con noi. Il tuo spazio è pronto.</p>
              <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#18202F;">Per entrarci, attiva l’account con un tap.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#AA626C;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Attiva il tuo account</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 36px;font-family:Georgia,'Times New Roman',serif;text-align:center;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#071A3C;">A presto,<br>Il team KhamaKey Moments</p>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#8a6a70;">Se il pulsante non si apre, copia questo indirizzo:<br>
                <a href="{{ .ConfirmationURL }}" style="color:#AA626C;word-break:break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Recovery (stesso tono, opzionale)

**Subject:** `Reimposta la password`

Stesso HTML, ma:

- titolo: `Reimposta la password`
- corpo: `Clicca il pulsante per scegliere una nuova password.`
- bottone: `Scegli nuova password`
- href sempre `{{ .ConfirmationURL }}`

*KhamaKey OS — 2026-08-29*
