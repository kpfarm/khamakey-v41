# 06 — Rivenditori

## Modello

KhamaKey vende attraverso una **rete di rivenditori** con due flussi distinti:

### Business (custom)
```text
Rivenditore compila brief personalizzazione
        │
        ▼
Ordine produzione KhamaKey
        │
        ▼
Spedizione al rivenditore
        │
        ▼
Rivenditore consegna al cliente finale
```

### Moments (codici NFC)
```text
KhamaKey alloca lotto codici a rivenditore
        │
        ▼
Rivenditore vende sul posto (offline)
        │
        ▼
Cliente attiva codice su moments.html
```

---

## Rete v68 (SQL applicato)

| Concetto | Implementazione |
|----------|-----------------|
| Tier / grado | Tabella gerarchica agenti |
| Listini | Prezzi per tier |
| Consegne | Tracking fulfillment |
| RPC | Funzioni Supabase per assegnazione |

File SQL: `sql/khamakey-reseller-network-v68.sql`

---

## Tracciabilità

Campi su `moment_activation_codes`:

- `sold_channel` — online / offline / reseller
- `assigned_agent_id` — rivenditore assegnato
- `platform_order_id` — collegamento ordine

SQL: v61 (canali), v62 (ordini + assegnazione).

---

## Admin

Sezione **Rete rivenditori** in admin:
- Gestione agenti e tier
- Listini per grado
- Assegnazione lotti e consegne
- Copy umano per partner (v106)

---

## Portale self-service

File: `pages/reseller.html` + `pages/reseller.js` + `pages/reseller.css`.

Funzionalità completate:
- primo accesso / login / recupero password via Supabase Auth;
- riepilogo provvigioni da incassare, approvate e pagate;
- tabella provvigioni personali;
- rete downline fino a 3 livelli;
- consegne assegnate al rivenditore.

Sicurezza:
- SQL v86 introduce RPC `get_my_agent_profile`, `get_my_commissions`, `get_my_network`, `get_my_deliveries`;
- SQL v87 indurisce `current_agent_id()`: nessun `agent_id` viene accettato dal client e il collegamento agente passa solo da `platform_agents.member_id -> platform_members.user_id`;
- il fallback via email e' stato rimosso per evitare accessi basati solo su email dichiarata nel JWT;
- SQL v88 aggiunge il primo collegamento sicuro: al login/signup, il portale prova a collegare `platform_members.user_id` solo se esiste gia' un profilo agente attivo creato dall'admin con la stessa email confermata e non assegnato ad altri utenti.

---

## Roadmap

- [x] SQL v68 rete rivenditori
- [x] Admin rete partner
- [x] Portale rivenditori self-service
- [x] Hook provvigioni su ordini Shopify/Stripe/admin (v85)
