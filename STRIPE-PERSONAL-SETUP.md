# Stripe personale → aziendale (KhamaKey)

Guida per collegare **temporaneamente** il tuo account Stripe personale, finché non avete il conto aziendale. Il codice è già pronto nel Worker (v103); mancano solo chiavi e Price ID.

## Stato attuale (2026-07-09)

| Componente | Stato |
|------------|--------|
| Worker `/webhooks/stripe` | ✅ codice pronto |
| Worker `/api/billing/stripe/checkout-session` | ✅ codice pronto |
| Supabase `ingest_stripe_checkout_event` | ✅ v67 applicato |
| Secrets Cloudflare `STRIPE_*` | ❌ non configurati |
| Admin → Piani → Price ID | ❌ da compilare |

Verifica live: `GET https://link.khamakeymoments.com/health` → `integrations.stripe.configured`  
(2026-07-20: ancora `false` — Moments non dipende da Stripe.)

---

## Fase 1 — Stripe Dashboard (account personale)

Consiglio: partire in **modalità Test** (`sk_test_...`), poi passare a Live quando siete pronti.

1. Accedi a [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Prodotti** → crea i piani Business (es. Starter, Business, Premium)
   - Tipo: **Abbonamento ricorrente**
   - Prezzo mensile e/o annuale in EUR
3. Copia i **Price ID** (`price_...`) — servono in Admin → Configurazioni → Piani

### Naming consigliato (facilita migrazione)

| Piano KhamaKey | Prodotto Stripe (test) | Note |
|----------------|------------------------|------|
| `starter` | KhamaKey Starter (TEST) | prefisso TEST nel nome |
| `business` | KhamaKey Business (TEST) | |
| `premium` | KhamaKey Premium (TEST) | |

---

## Fase 2 — Webhook Stripe → Worker

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL:
   ```
   https://link.khamakeymoments.com/webhooks/stripe
   ```
   (fallback workers.dev solo se il custom domain non risponde)
3. Eventi da abilitare (minimo):
   - `checkout.session.completed`
   - (opzionale) `invoice.paid`, `customer.subscription.updated`
4. Copia il **Signing secret** (`whsec_...`)

---

## Fase 3 — Secrets Cloudflare Worker

Dalla cartella `worker/` (serve login Wrangler):

```bash
cd worker
npx wrangler secret put STRIPE_SECRET_KEY
# incolla sk_test_... (o sk_live_...)

npx wrangler secret put STRIPE_WEBHOOK_SECRET
# incolla whsec_...
```

**Non committare mai** le chiavi nel repo.

Dopo il deploy, `/health` deve mostrare:
```json
"stripe": { "configured": true, "webhook": true, "status": "active" }
```

---

## Fase 4 — Admin KhamaKey

1. Apri `admin.html` → **Configurazioni → Piani**
2. Per ogni piano attivo, incolla:
   - `stripe_product_id` (opzionale, `prod_...`)
   - `stripe_price_monthly_id` (`price_...`)
   - `stripe_price_yearly_id` (se previsto)
3. Salva piano
4. Usa **Stripe mese** / **Stripe anno** per testare checkout (crea sessione reale)

L'ordine arriva in **Ordini** via webhook → `ingest_stripe_checkout_event`.

---

## Fase 5 — Test end-to-end

1. Admin → Piani → **Stripe mese** su un piano di test
2. Completa pagamento con carta test Stripe (`4242 4242 4242 4242`)
3. Verifica:
   - Admin → Ordini (nuovo ordine `subscription`)
   - Admin → Integrazioni → Webhook events
   - Supabase → `platform_payment_transactions`

---

## Migrazione al conto Stripe aziendale (quando pronto)

1. Crea **nuovo account Stripe Business** (o attiva business sul conto esistente se Stripe lo permette)
2. Ricrea prodotti/prezzi (i `price_...` **non sono trasferibili** tra account)
3. Aggiorna secrets Worker con le nuove chiavi aziendali
4. Ricrea webhook sul nuovo account (stesso URL Worker)
5. Aggiorna **tutti** i `stripe_price_*_id` in Admin → Piani
6. Aggiorna `platform_integrations` (note: "Stripe Business live")
7. Disattiva webhook sul vecchio account personale

I dati storici in Supabase (`platform_orders`, `platform_payment_transactions`) restano — cambiano solo i Price ID futuri.

---

## Provvigioni rete rivenditori + Stripe (prossimo hook)

Quando Stripe è attivo, il passo successivo (SQL v69, da implementare) è:

- Passare `agent_id` o `referral_code` nei metadata checkout Stripe
- In `ingest_stripe_checkout_event`, se pagamento `paid` e agente presente → chiamare `distribute_network_commissions`

Oggi la rete rivenditori (v68) funziona già in admin; le provvigioni automatiche su abbonamento partiranno con questo hook.

---

## Coordinamento agenti AI

Prima di toccare Stripe secrets o `worker.js` (webhook), leggere `CODEX-COLLAB.md` → sezione **Lock attivi**.

Chi configura Stripe: annotare in `ROADMAP.md` log sessioni quando le chiavi sono state impostate (senza scrivere i valori).
