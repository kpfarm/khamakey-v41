# 03 — Editor

## Due editor, stessa filosofia UX

| | Business | Moments |
|---|----------|---------|
| File | `pages/editor.html` | `pages/moments.html` + `moments.js` |
| Sidebar | Sezioni a card con icone | Sezioni a card con icone |
| Anteprima | Live, sticky, toggle mobile | Live, sticky, toggle mobile |
| Topbar | Stato salvataggio, Pubblica/Bozza | Stato salvataggio, Pubblica/Bozza |
| Wizard | Setup guidato per settore (5 template) | Wizard post-attivazione (3 step) |
| Media | Upload R2 via Worker | Upload R2 via Worker |
| Temi | Palette colore Business | `moment-themes.js` (4 temi base) |
| Supporto | Ticket dalla tab Account | Ticket da menu Account + scheda Account |

---

## Editor Business

### Sezioni principali
- Informazioni (nome, logo, contatti)
- Copertina e hero
- Menu / catalogo prodotti
- Prenotazioni (con email Resend)
- Galleria, video YouTube
- Social, mappa, orari
- «Altre sezioni» configurabili

### Wizard onboarding
- Si apre su attività nuova/vuota
- 5 template per settore (ristorante, hotel, negozio…)
- Chiave wizard per attività (non globale)
- Salvataggio cloud automatico dopo template

### Comandi operativi v120-v124

- Il tasto `Salva` e' sempre visibile nella topbar, non solo nella barra modifiche.
- `Anteprima` e `Account` restano azionabili dalla shell principale; l'editor iframe non deve duplicare il tasto Anteprima in alto.
- `Apri pagina finale`, `Copia link` e `Scarica QR` usano il link NFC quando esiste; se il chip non e' ancora assegnato usano la pagina pubblica `/p/<slug>` come fallback operativo.
- `app.js` crea/aggiorna sempre la pagina pubblica `/p/<slug>` via upsert idempotente quando apre il workspace Business.
- Il controllo `Multilingua` vive nella card dedicata ed e' uno switch leggibile: disattivo, attivazione in corso o attivo.
- L'iframe editor usa un handshake di idratazione: il parent invia lo stato cloud quando l'editor e' pronto e ignora snapshot iniziali vuoti finche' l'idratazione non e' completata.

### Attivazione codice e accesso editor v147

- **Nuovi utenti**: devono attivare un codice da `business_activation_codes` (signup 2-step o form `#activationForm` se già loggati).
- **`ensureWorkspace`**: non crea più business/NFC automaticamente senza codice (account pre-v147 grandfathered).
- **Login**: campo codice opzionale per utenti senza attività; parametro URL `?code=XXX` precompila il codice.
- **Save bar**: colore navy ripristinato in `editor-ui.css` (rimosso override che la nascondeva).
- **Race fix**: snapshot pubblico ritardato fino a `editor-hydrated`; salvataggio consentito quando editor pronto.

Dettaglio flusso + admin magazzino: [`20-business-activation-inventory-v147-v148.md`](20-business-activation-inventory-v147-v148.md)

### Supporto
- Il modal Account contiene la tab `Assistenza`.
- L'iframe invia la richiesta a `pages/app.js`, che salva in `platform_support_tickets` con `business_id`, `profile_id`, `source='business_editor'` e stato `open`.
- Il form mostra conferma solo dopo inserimento Supabase riuscito.

### Contratto pagina pubblica (4 punti)

Ogni campo visibile su `/p/` richiede aggiornamento in:

1. `editor.html` — controllo UI
2. `editor.html` — `renderPublicPreview()`
3. `app.js` — `publicStateFromEditor()`
4. `worker.js` — renderer `/p/`

---

## Editor Moments

### Sezioni principali
- Copertina (sposta, centra, zoom)
- Sezioni evento (programma, storia, messaggi…)
- Galleria media (foto, video, audio) — ogni riga ha **Cambia foto** e **Rimuovi** (v144)
- RSVP configurabile per tipo evento
- Privacy (PIN opzionale)
- Lettera / messaggio speciale
- Contatore con etichetta personalizzabile (es. «Insieme da», «Ti sopporto da»)
- Supporto operativo: menu account `Assistenza` e form ticket nella scheda Account, con `source='moments_editor'`.

### Categorie evento
21 categorie con template bilanciati (v89–v90):
- Matrimonio, compleanno, battesimo, memorial, anniversario…
- «Altre sezioni» con tutte le sezioni adattate per tipo

### Temi visivi
Definiti in `moment-themes.js` e `worker.js`:
- Tipografia serif, scroll reveal, galleria swipe
- 11 palette + 3 varianti atmosfera
- Raccordo fondo copertina (heroCut) configurabile dall'editor: Dritto classico, Divisore con icona, Taglio ad arco, Taglio diagonale
- Sfondo sfumato chiaro-scuro globale con auree radiali luminose in tutti i 21 template
- Stili grafici premium coordinati per tutti i gruppi di categorie (Amore, Viaggi, Bambini, Feste, Famiglia, Pet, Polaroid/Ricordi, Cerimonie, Collage/Amicizia, Natale, Minimal/Generale)

---

## Upload media

| Endpoint | Metodo | Storage |
|----------|--------|---------|
| `POST /api/media/upload` | Worker | R2 bucket `khamakey-media` |
| `POST /api/media/delete` | Worker | Cancella file R2 (solo proprietario) |
| `GET /cdn/{path}` | Worker | Serve file pubblici |

Limiti server (Worker `MEDIA_LIMITS`): immagine 8 MB · video 25 MB · audio 12 MB.  
Compressione WebP client-side per immagini (max 1920px, q0.82).

### Limiti quantità (base per futuri piani a pagamento)

| Area | Limite attuale |
|------|----------------|
| Business — galleria | 10 foto |
| Business — video presentazione | 1 (R2, max 25 MB / 2 min) oppure link YouTube |
| Moments — galleria | 24 elementi, di cui max 6 video e 6 audio |
| Moments — journey | 24 tappe con foto |
| Rate limit upload | 30 file/ora per utente (Worker) |

### Fix upload Business v124 (2026-07-15, Claude Code)

Da audit upload: prima di v124 il video di presentazione Business restava un `blob:` URL
locale — mai caricato su R2, perso al reload e rotto nello snapshot pubblico. Ora:

- `onVideoUpload` carica su R2 via `__khamakeyMedia.uploadVideo` (limite allineato al
  server: 25 MB, prima il check client diceva 200 MB), `collectState`/`applyState`
  persistono/ripristinano l'URL cloud (mai i `blob:`).
- Pulizia R2 (`removeCloudMedia`): sostituzione o rimozione di logo, copertina, chi siamo,
  foto galleria, immagini voci catalogo (anche eliminazione voce/sezione/catalogo extra) e
  video ora cancellano il vecchio file dal bucket — prima restavano orfani (costo storage).
  Solo URL `/cdn/` (R2): i legacy Supabase Storage non vengono toccati.

### Limitazioni note (in attesa lock `worker.js`)

- **PDF catalogo Business**: ancora `blob:` locale non persistito — il Worker non accetta
  `application/pdf` in `MEDIA_MIME`; serve modifica Worker (lockato da Antigravity).
- **Welcome book / Documenti Business**: salvati come base64 dentro lo stato su Supabase
  (8 MB/file, quantità illimitata) — da migrare a R2 con lo stesso vincolo Worker.

---

## CSS pubblico

`pages/public-page.css` deve restare sincronizzato col Worker.

```bash
python3 ~/.codex/skills/khamakey-release-workflow/scripts/sync_public_css.py pages/
```

---

## Roadmap editor

- [ ] Wizard onboarding nuova attività (più settori)
- [ ] Più automazioni prenotazione (coda, promemoria)
- [ ] Sincronizzazione ordine blocchi editor ↔ Supabase
- [ ] UX catalogo (varianti, allergeni, disponibilità)
- [x] Tabella risposte RSVP (backend v70 + pannello editor)
- [x] Libro degli ospiti con moderazione (v108)
- [ ] Smoke test wizard 5 settori
