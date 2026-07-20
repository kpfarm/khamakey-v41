# 20 — Attivazione Business + Magazzino NFC (v147 / v148)

> **Riferimento operativo** per agenti AI, admin e sviluppo.  
> Deploy Pages: Business **v147**, Admin **v148** (2026-07-15). SQL applicata su Supabase `cuxlwaocjqwzluycznyp`.

---

## Problema risolto

Prima di v147, un account Business poteva aprire l'editor **senza codice prodotto NFC**: niente attivazione controllata, save bar assente o editor non idratato, pagina pubblica incoerente con Moments.

Da v147 il flusso Business **è allineato a Moments**: codice obbligatorio per i nuovi account, inventario tracciato in admin, provisioning staff.

---

## Flusso cliente Business (v147)

```text
index.html (login / signup)
        │
        ├─ Signup: step 1 codice prodotto → step 2 account (email + password)
        ├─ Login: email + password (+ campo codice opzionale se senza attività)
        └─ ?code=XXX in URL → prefill codice
        │
        ▼
RPC activate_business_code(p_code, p_business_name)
        │
        ▼
Crea/aggiorna: businesses + business_public_pages + nfc_tags
        │
        ▼
Editor (editor.html) — shell app.js con save bar navy, Account, Anteprima
        │
        ▼
Pagina live /p/{slug}  ·  Chip NFC /k/{code} → redirect /p/{slug}
```

### Regole importanti

| Situazione | Comportamento |
|------------|---------------|
| **Nuovo utente** | Deve inserire codice valido da inventario `business_activation_codes` |
| **Utente già con business** (pre-v147) | Grandfathered: `ensureWorkspace` non richiede nuovo codice |
| **Codice già claimato dallo stesso email** | Riapre workspace esistente |
| **Codice claimato da altro email** | Errore RPC |
| **Senza business attivo** | Mostra `#activationForm` (non editor vuoto) |

### File applicativi

| File | Ruolo |
|------|-------|
| `pages/index.html` | Signup 2-step, login con codice opzionale, form attivazione loggato |
| `pages/app.js` | `activate_business_code`, `ensureWorkspace` (no auto-provision), handshake editor, save bar |
| `pages/editor.html` | Iframe editor — cache bust `?v=147` |
| `pages/editor-ui.css` | Save bar navy ripristinata (rimosso override che la nascondeva) |

---

## Database v147

**File:** `sql/khamakey-business-activation-v147.sql`

### Tabella `business_activation_codes`

| Colonna | Descrizione |
|---------|-------------|
| `code` | PK, 8–32 caratteri alfanumerici |
| `status` | `available` · `claimed` · `paused` · `archived` |
| `claimed_by_email` | Email proprietario dopo attivazione |
| `claimed_business_id` | FK `businesses` |
| `public_slug` | Slug pagina `/p/` |
| `batch_label` | Lotto produzione |

**Seed:** codici già presenti in `nfc_tags` importati come `claimed`.

### RPC `activate_business_code(p_code, p_business_name)`

- Richiede utente autenticato
- Valida codice in inventario
- Crea business + pagina pubblica + tag NFC se disponibile
- Restituisce `business_id`, `slug`, `code`, `nfc_url`

---

## Admin Magazzino NFC Business (v148)

**File:** `sql/khamakey-business-inventory-v148.sql`  
**UI:** tab `Magazzino NFC Business` (`data-admin-tab="businessInventory"`) in `admin.html` / `admin.js`

### Colonne aggiuntive su `business_activation_codes`

`sku`, `product_line`, `product_label`, `public_url`, `sold_channel`, `assigned_agent_id`, `platform_order_id`

### RPC admin

| RPC | Uso |
|-----|-----|
| `create_business_product_batch` | Genera lotti codici (max 500), prefisso default `KHAMA` |
| `get_business_product_inventory_stats` | KPI dashboard: stock, claimati, sotto soglia |
| `bulk_update_business_activation_codes` | Aggiornamento massivo stato/canale/agente |
| `admin_provision_business_customer` | Crea account + attiva codice + business in un passaggio staff |
| `activate_business_code_for_user` | Attivazione lato admin per utente esistente |

### Tab Clienti Business (arricchita v148)

- Colonne: email, codice NFC, slug, link Analytics
- Drawer cliente: email, codice NFC, URL NFC
- Editor impersonation: `index.html?business=<uuid>`

### Export

- CSV codici Business (Moments ha anche PDF etichette — Business **solo CSV** per ora)

---

## Parità Moments vs Business

| Aspetto | Moments | Business (v147+) |
|---------|---------|------------------|
| Tabella codici | `moment_activation_codes` | `business_activation_codes` |
| Attivazione RPC | `activate_moment_code` | `activate_business_code` |
| Admin magazzino | `Magazzino NFC` (Moments) | `Magazzino NFC Business` |
| Pagina pubblica | `/m/{slug}` | `/p/{slug}` |
| Redirect chip | `/k/{code}` | `/k/{code}` |
| Signup con codice | Sì | Sì (v147) |

---

## Contratto 4 punti (invariato)

Campo nuovo visibile su `/p/` → aggiornare tutti:

1. `editor.html` UI  
2. `editor.html` anteprima  
3. `app.js` → `publicStateFromEditor()`  
4. `worker.js` → renderer Business  

---

## Verifica manuale consigliata

1. Admin → Magazzino NFC Business → genera lotto 3 codici  
2. Signup nuovo utente con uno dei codici → editor operativo + save bar  
3. Admin → Clienti Business → verifica email, codice, slug, Analytics  
4. Apri `/k/{code}` → redirect a `/p/{slug}`  
5. Hard refresh (Cmd+Shift+R) dopo deploy Pages  

---

## Backlog noto

- [ ] PDF etichette codici Business (parità Moments)
- [ ] Integrazione ordini Shopify → assegnazione automatica codici Business
- [ ] Resend SMTP su Supabase Auth (rate limit email signup 2/h default)
- [ ] Commit git v147/v148 su `main` (deploy fatto, commit pendente)

---

## Versioni cache bust

| Componente | `?v=` |
|------------|-------|
| Business app | 147 (`app.js`, `editor.html`) |
| Admin | 148 (`admin.js`, `admin.html`) |
| Worker | 127 (invariato in questa release) |
