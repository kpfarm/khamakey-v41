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

## Dove incollare

[Auth → Email Templates → Confirm signup](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/templates)

- **Subject** → oggetto sotto
- **Body** → HTML sotto
- Il link resta **`{{ .ConfirmationURL }}`**
- Save → re-invia conferma (le mail già partite non cambiano)

## Tono

Caldo, amichevole, come un messaggio da persone vere. Niente “mondo esclusivo”, niente tono da club.

1. Logo
2. Ciao + siamo felici che tu sia qui
3. Grazie per aver scelto Moments
4. Il tuo oggetto = casa per i ricordi
5. Tre passi, senza fretta
6. Bottone **Apri il tuo spazio**
7. Un abbraccio dal team

## Testo

**Oggetto**

```text
Ciao, siamo felici che tu sia qui
```

**Corpo**

Ciao,

grazie di cuore per aver scelto KhamaKey Moments. Siamo davvero felici di averti con noi.

Il pezzo che hai in mano apre uno spazio solo tuo: foto, parole, date, i momenti che vuoi tenere vicini. Tu lo curi. Chi ami lo apre con il PIN.

Quando vuoi, fai così — senza fretta:

1. Attiva l’account (il bottone qui sotto)
2. Accedi a Moments
3. Inizia a riempire la pagina del tuo oggetto

[Apri il tuo spazio]

Un abbraccio,  
Il team KhamaKey Moments

## Body HTML

```html
<!doctype html>
<html lang="it">
<body style="margin:0;padding:0;background:#F3E3DE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E3DE;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FFF9F5;border-radius:22px;overflow:hidden;">
          <tr>
            <td style="background:#071A3C;padding:28px 32px 22px;text-align:center;">
              <img src="https://app.khamakeymoments.com/khamakey-moments-wordmark.png" width="200" alt="KhamaKey Moments" style="display:block;margin:0 auto;width:200px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 0;font-family:Georgia,'Times New Roman',serif;color:#071A3C;text-align:left;">
              <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#AA626C;">Un piccolo benvenuto</p>
              <h1 style="margin:12px 0 0;font-size:26px;line-height:1.32;font-weight:normal;">Che bello averti con noi.</h1>
              <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#18202F;">Ciao,</p>
              <p style="margin:10px 0 0;font-size:16px;line-height:1.7;color:#18202F;">grazie di cuore per aver scelto KhamaKey Moments. Siamo davvero felici che tu sia qui.</p>
              <p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#18202F;">Il pezzo che hai in mano apre uno spazio caldo e privato: foto, parole, date, i momenti che vuoi tenere vicini. Tu lo curi. Chi ami lo apre con il PIN.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E3DE;border-radius:16px;">
                <tr>
                  <td style="padding:20px 22px;font-family:Georgia,'Times New Roman',serif;color:#071A3C;">
                    <p style="margin:0 0 12px;font-size:13px;color:#AA626C;">Quando vuoi, senza fretta</p>
                    <p style="margin:0;font-size:15px;line-height:1.75;color:#18202F;"><strong style="color:#071A3C;">1.</strong> Attiva l’account — è il bottone qui sotto.</p>
                    <p style="margin:10px 0 0;font-size:15px;line-height:1.75;color:#18202F;"><strong style="color:#071A3C;">2.</strong> Accedi a Moments, come a casa.</p>
                    <p style="margin:10px 0 0;font-size:15px;line-height:1.75;color:#18202F;"><strong style="color:#071A3C;">3.</strong> Inizia a riempire la pagina del tuo oggetto. C’è tempo.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 36px 8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#AA626C;color:#ffffff;text-decoration:none;padding:15px 32px;border-radius:999px;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Apri il tuo spazio</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 32px;font-family:Georgia,'Times New Roman',serif;text-align:center;">
              <p style="margin:0;font-size:16px;line-height:1.65;color:#071A3C;">Grazie ancora per la fiducia.</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#071A3C;">Un abbraccio,<br>Il team KhamaKey Moments</p>
              <p style="margin:22px 0 0;font-size:11px;line-height:1.5;color:#8a6a70;">Se il pulsante non si apre, copia questo indirizzo:<br>
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

## Recovery (stesso calore)

**Subject:** `Ti aiutiamo a rientrare`

Corpo: `Nessun problema. Scegli una nuova password e torni nel tuo spazio.`  
Bottone: `Scegli una nuova password`  
href: `{{ .ConfirmationURL }}`

*KhamaKey OS — 2026-08-29*
