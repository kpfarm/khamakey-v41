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
- Galleria media (foto, video, audio)
- RSVP configurabile per tipo evento
- Privacy (PIN opzionale)
- Lettera / messaggio speciale

### Categorie evento
21 categorie con template bilanciati (v89–v90):
- Matrimonio, compleanno, battesimo, memorial, anniversario…
- «Altre sezioni» con tutte le sezioni adattate per tipo

### Temi visivi
Definiti in `moment-themes.js`:
- Tipografia serif, scroll reveal, galleria swipe
- 11 palette + 3 varianti atmosfera
- Stili hero, pillola, contatore «insieme da»

---

## Upload media

| Endpoint | Metodo | Storage |
|----------|--------|---------|
| `POST /api/media/upload` | Worker | R2 bucket `khamakey-media` |
| `GET /cdn/{path}` | Worker | Serve file pubblici |

Limiti: dimensione e quantità per tipo (foto, video, audio).  
Compressione WebP per immagini.

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
