# 22 — Checklist ops: secrets Worker + Auth Supabase

> **Solo ops.** Non richiede deploy codice. Non tocca Moments runtime.  
> Verifica live: `GET https://link.khamakeymoments.com/health` (2026-07-20)

## Stato verificato (health Worker v144)

| Integrazione | Stato live | Impatto Moments |
|--------------|------------|-----------------|
| Media R2 | OK | Nessuno |
| Shopify | `active` | Catalogo/ordini |
| Resend API | `active` | Email ticket staff, prenotazioni, anniversari |
| Stripe | `not_configured` | Solo pagamenti Business — **Moments non bloccato** |
| PayPal | `not_configured` | Opzionale Business |
| OpenAI | `not_configured` | Traduzioni Business i18n |

`/health` non espone `RESEND_WEBHOOK_SECRET`: se manca, `POST /webhooks/resend` risponde **503** (sicuro, nessuna accettazione non firmata). L’invio email usa `RESEND_API_KEY` (già attivo).

Advisor Supabase (2026-07-20): **WARN** `auth_leaked_password_protection` ancora disabilitato.

---

## A — Auth: Leaked Password Protection (5 minuti)

Sicuro per Moments: vale solo su **nuove** password / cambio password; account esistenti restano validi.

1. Apri [Supabase → Auth → Providers → Email](https://supabase.com/dashboard/project/cuxlwaocjqwzluycznyp/auth/providers?provider=Email)
2. Attiva **Prevent use of leaked passwords** (HaveIBeenPwned)
3. Salva

Note:
- Richiede piano **Pro** (o entitlement equivalente). Se il toggle è grigio, è un limite piano — non è un bug codice.
- Docs: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Dopo: `get_advisors(type=security)` non deve più segnalare `auth_leaked_password_protection`.

---

## B — Resend webhook signing (opzionale, sicuro di default)

Serve solo se vuoi ricevere eventi delivery/bounce da Resend sul Worker.

1. Resend Dashboard → Webhooks → endpoint verso  
   `https://link.khamakeymoments.com/webhooks/resend`  
   (o l’URL Worker già configurato)
2. Copia il signing secret (`whsec_...` / Svix)
3. Dalla macchina con Wrangler loggato:

```bash
cd worker
npx wrangler secret put RESEND_WEBHOOK_SECRET
# incolla il secret — mai in git
```

4. Nessun redeploy obbligatorio per i secret Wrangler (disponibili al request successivo).
5. Smoke: un evento test Resend non deve più dare 503 per secret mancante.

**Non urgente per Moments** finché l’invio ticket con `RESEND_API_KEY` funziona.

---

## C — Stripe (solo quando servono pagamenti Business)

Moments NFC/editor **non dipendono** da Stripe. Configurare solo quando apri billing Business.

Guida completa: [`STRIPE-PERSONAL-SETUP.md`](../../STRIPE-PERSONAL-SETUP.md) (URL webhook aggiornato a `link.khamakeymoments.com`).

Minimo:

```bash
cd worker
npx wrangler secret put STRIPE_SECRET_KEY      # sk_test_... o sk_live_...
npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_...
```

Webhook Stripe → `https://link.khamakeymoments.com/webhooks/stripe`  
Eventi minimi: `checkout.session.completed`

Verifica:

```bash
curl -sS https://link.khamakeymoments.com/health | python3 -m json.tool
# stripe.configured: true, stripe.webhook: true
```

Poi Admin → Configurazioni → Piani: Price ID `price_...`.

---

## D — Cosa non fare

- Non committare `.dev.vars`, chiavi, `whsec_`, `sk_`
- Non “aggiustare” CSP/RLS per far passare un test secret
- Non deployare Worker/Pages solo per questa checklist
- Non toccare `worker.js` / Moments per Stripe finché non serve davvero

---

## Checklist chiusura

- [ ] Leaked password ON (o documentato blocco piano Free)
- [ ] (Opz.) `RESEND_WEBHOOK_SECRET` impostato
- [ ] (Quando serve Business) Stripe secrets + `/health` stripe active
- [ ] Aggiornare riga in `PROJECT_STATE.md` → Problemi aperti

*KhamaKey OS — ops checklist 2026-07-20*
