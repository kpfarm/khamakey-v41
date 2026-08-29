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

Logo (sfondo chiaro):  
`https://app.khamakeymoments.com/khamakey-moments-wordmark-on-light.png`

## Dove incollare

[Auth → Email Templates → Confirm signup](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/templates)

- **Subject** → oggetto sotto
- **Body** → HTML sotto  
- Il link resta **`{{ .ConfirmationURL }}`** (mai solo `{{ .SiteURL }}`)
- Save → re-invia conferma (le mail già partite non cambiano)

## Tono

Prima mail dopo l’acquisto + registrazione. Non è un avviso tecnico.

Struttura:

1. Logo
2. Invito al mondo esclusivo
3. Grazie per aver scelto / acquistato
4. Cosa è KhamaKey Moments (il Moment = chiave di uno spazio privato)
5. Tre passi per entrare
6. Bottone **Entra nel tuo spazio**
7. Firma del team

## Testo (come lo legge il cliente)

**Oggetto**

```text
Benvenuto nel mondo KhamaKey Moments
```

**Corpo**

Ciao,

grazie per averci scelto. Sei entrato in un mondo riservato, dove ogni Moment apre un ricordo — non una pagina qualsiasi.

Il Moment che hai tra le mani è la chiave. Che tu lo tenga per te o lo doni, custodisce uno spazio privato: foto, parole, date, una storia. Tu la prepari da Moments. Chi ha il Moment può entrarvi. Il PIN è una scelta tua: lo aggiungi o lo togli quando vuoi.

Tre passi:

1. Attiva l’account (il bottone qui sotto)
2. Accedi a Moments: è l’area privata dove crei e aggiorni la pagina del tuo Moment
3. Dai vita alla pagina. Chi tiene il Moment la apre.

Bottone: **Entra nel tuo spazio**

A presto,  
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
              <p style="margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#AA626C;">Il tuo invito</p>
              <h1 style="margin:12px 0 0;font-size:28px;line-height:1.28;font-weight:normal;">Benvenuto nel mondo KhamaKey Moments.</h1>
              <p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:#18202F;">Ciao,</p>
              <p style="margin:12px 0 0;font-size:16px;line-height:1.65;color:#18202F;">grazie per averci scelto. Sei entrato in un mondo riservato, dove ogni Moment apre un ricordo — non una pagina qualsiasi.</p>
              <p style="margin:14px 0 0;font-size:16px;line-height:1.65;color:#18202F;">Il Moment che hai tra le mani è la chiave. Che tu lo tenga per te o lo doni, custodisce uno spazio privato: foto, parole, date, una storia. Tu la prepari da Moments. Chi ha il Moment può entrarvi. Il PIN è una scelta tua: lo aggiungi o lo togli quando vuoi.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E3DE;border-radius:16px;">
                <tr>
                  <td style="padding:20px 22px;font-family:Georgia,'Times New Roman',serif;color:#071A3C;">
                    <p style="margin:0 0 12px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#AA626C;">I tuoi prossimi passi</p>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#18202F;"><strong style="color:#071A3C;">1.</strong> Attiva l’account — è il bottone qui sotto.</p>
                    <p style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#18202F;"><strong style="color:#071A3C;">2.</strong> Accedi a Moments: è l’area privata dove crei e aggiorni la pagina del tuo Moment.</p>
                    <p style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#18202F;"><strong style="color:#071A3C;">3.</strong> Dai vita alla pagina. Chi tiene il Moment la apre.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 36px 8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#AA626C;color:#ffffff;text-decoration:none;padding:15px 32px;border-radius:999px;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Entra nel tuo spazio</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 32px;font-family:Georgia,'Times New Roman',serif;text-align:center;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#071A3C;">Siamo felici che tu sia dei nostri.</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#071A3C;">A presto,<br>Il team KhamaKey Moments</p>
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

Nota: in testata si usa il wordmark su navy (`khamakey-moments-wordmark.png`, rosa+bianco). Se l’immagine non carica, resta l’`alt` «KhamaKey Moments».

## Recovery (stesso mondo, altro scopo)

**Subject:** `Reimposta la password`

Stesso involucro visivo, ma:

- titolo: `Reimposta la password`
- niente «mondo esclusivo»: solo «Scegli una nuova password per tornare nel tuo spazio.»
- bottone: `Scegli nuova password`
- href: `{{ .ConfirmationURL }}`

*KhamaKey OS — 2026-08-29*
