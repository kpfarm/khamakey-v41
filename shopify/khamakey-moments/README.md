# KhamaKey Moments — Tema Shopify

Tema **Online Store 2.0** standalone per il negozio Moments.  
Non si collega al software KhamaKey (Worker / Supabase): vende solo su Shopify.

## Cosa include

- **Landing homepage** con hero full-bleed, storia prodotto, come funziona (3 step), collezione in evidenza, punti di forza, FAQ, CTA finale
- **Scheda prodotto** (galleria, varianti, quantità, add to cart, Shop Pay se attivo)
- **Collezione**, **carrello**, **ricerca**, **pagine**, **404**
- Palette brand Moments (Rosa Ricordo / Blu Notte / Avorio)
- Copy di vendita già precompilato (modificabile dal theme editor)
- Lingue: **italiano + inglese** (`locales/it.default.json`, `locales/en.json`) con switch IT/EN in header
- Posizionamento vendita: **portachiavi Moments** in 3 collezioni (**Love**, **Wedding**, **Amicizia/Friendship** — 4 prodotti ciascuna). Copy orientato al regalo, senza tecnicismi sul software.

## Caricare il tema su Shopify

### Opzione A — ZIP (consigliata)

1. Comprimi la cartella `khamakey-moments` (il contenuto deve avere `layout/`, `sections/`, ecc. alla radice dello zip).
2. Shopify Admin → **Negozio online → Temi → Aggiungi tema → Carica file zip**.
3. Apri il tema → **Personalizza**.
4. Carica logo e immagine hero; collega la collezione nella sezione “Collezione in evidenza”.
5. Pubblica quando sei soddisfatto.

Da terminale (dalla cartella padre):

```bash
cd shopify
zip -r khamakey-moments-theme.zip khamakey-moments \
  -x "*.DS_Store" -x "*/README.md"
```

### Opzione B — Shopify CLI

```bash
cd shopify/khamakey-moments
shopify theme push
```

## Setup negozio (minimo)

1. Crea 12 prodotti portachiavi (4 Love + 4 Wedding + 4 Amicizia) con foto, prezzo, varianti
2. Crea 3 collezioni Shopify (`love`, `wedding`, `amicizia`) e assegna i prodotti; collega la collezione in evidenza in homepage
3. In **Navigazione**:
   - `main-menu`: Home → Shop/collezione → Contatti
   - `footer`: Home, Prodotti, Contatti
4. **Impostazioni → Policy**: Privacy, Termini, Spedizione, Reso/rimborso
5. Crea pagina **Contatti** con handle `contatti` e assegna template `page.contact`
6. Nel tema: Impostazioni → logo + link social
7. Checkout Shopify Payments / PayPal come preferisci
8. Dominio custom (opzionale): es. `shop.khamakey.it` o `moments.khamakey.it`

## Asset consigliati

Dal vault KhamaKey:

- Logo: `KHAMAKEY_OS/assets/brand/khamakey-moments-wordmark-on-light.png`
- Prodotto: `KHAMAKEY_OS/assets/marketing/product/khamakey-love-keyring.png`
- Lifestyle: `KHAMAKEY_OS/assets/marketing/product/moments-wedding-lifestyle.png`

## Note

- Tutti i testi delle sezioni si editano da **Personalizza tema** senza toccare il codice.
- La homepage è in `templates/index.json`: puoi riordinare/aggiungere sezioni dall’editor.
- Questo tema non gestisce codici NFC né sync con Admin KhamaKey: dopo l’acquisto, i processi interni restano fuori Shopify (email manuale, altro canale, ecc.) a tua scelta.

## Aggiornare un tema già online

1. Carica il nuovo `khamakey-moments-theme.zip` come tema aggiuntivo (o sostituisci gli asset).
2. **Pubblica** il tema aggiornato.
3. In Personalizza → Logo: se vedi testo serif, rimuovi il logo caricato a mano (così compare il wordmark ufficiale).
4. Hard refresh / finestra privata per vedere favicon e immagini.

## Pagine da creare una volta (2 minuti) — i testi sono già nel tema

Shopify non crea pagine dal solo file zip (vivono nel database del negozio). Dopo aver pubblicato il tema:

1. **Negozio online → Pagine → Aggiungi pagina**
2. Crea queste 3 pagine (titolo libero, **handle** esatto):
   - Titolo `Spedizioni` → handle `spedizioni` → template tema **spedizioni**
   - Titolo `Resi e rimborsi` → handle `resi` → template **resi**
   - Titolo `Termini e condizioni` → handle `termini` → template **termini**
3. Pagina **Contatti** (già esiste come `contact`): aprila → in basso a destra **Tema** → template **contact**
4. Pagina **Come funziona** (già esiste): template **come-funziona**

I testi legali sono già dentro i template del tema (bozza): poi li migliori tu.

Checklist breve: vedi `shopify/DEPLOY-CHECKLIST.txt`.
