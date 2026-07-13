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
- Aprire ticket assistenza dall'area Account dell'editor; il ticket entra nella console Admin Supporto

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

### Supporto cliente

- Business: nel modal Account dell'editor e' presente la tab `Assistenza`. Il form invia il ticket tramite `pages/app.js`, collegandolo a `business_id` e profilo autenticato.
- Moments: menu account `Assistenza` porta alla scheda Account dell'editor, dove l'utente puo' aprire un ticket collegato al proprio profilo.
- SQL v89 consente agli utenti autenticati di creare/leggere solo ticket con `profile_id = auth.uid()`; lo staff continua a usare `support.read`/`support.write`.

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
