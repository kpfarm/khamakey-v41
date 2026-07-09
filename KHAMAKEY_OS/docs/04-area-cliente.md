# 04 — Area Cliente

## Business — flusso utente

```text
khamakey.it / khamakey-app.pages.dev
        │
        ▼
Login Supabase (email + password)
        │
        ▼
Lista attività → Editor (editor.html)
        │
        ▼
Pubblica → Pagina live su /p/{slug}
        │
        ▼
Tag NFC /k/{code} → redirect a /p/{slug}
```

### Funzionalità cliente
- Creare e gestire più attività
- Editor con anteprima live
- Pubblicazione bozza/live
- Upload media (logo, galleria)
- Prenotazioni con notifica email

---

## Moments — flusso utente

```text
Acquisto (Shopify) o codice da rivenditore
        │
        ▼
Email con codice NFC + link attivazione
        │
        ▼
moments.html?code=XXX → attivazione
        │
        ▼
Signup / login Supabase
        │
        ▼
Wizard onboarding (3 step)
        │
        ▼
Editor Moments → Pubblica
        │
        ▼
Pagina live su /m/{slug} (PIN opzionale)
```

### Canali vendita Moments

| Canale | Flusso |
|--------|--------|
| **Online** | Ordine Shopify → spedizione KhamaKey → attivazione codice |
| **Offline** | Lotto a rivenditore → vendita sul posto → attivazione |

Tracciabilità: `sold_channel`, `assigned_agent_id` su `moment_activation_codes`.

---

## Attivazione codice

- Slug e hash PIN allineati al `public_slug` del prodotto
- Fix attivazione in SQL v41
- Pagina pubblica con PIN opzionale per privacy

---

## Pagine pubbliche (Worker)

| URL | Renderer | CSS |
|-----|----------|-----|
| `/p/{slug}` | `renderBusinessPage()` | `public-page.css` snapshot |
| `/m/{slug}` | `renderMomentPage()` | Temi da `moment-themes.js` |
| `/k/{code}` | Redirect NFC | — |

---

## i18n

5 lingue predisposte: IT, EN, FR, DE, ES (SQL v66).

- Business editor: già predisposto in `editor.html`
- Moments pubblico: `?lang=en` (da completare)
- Catalogo Shopify: traduzioni parziali
