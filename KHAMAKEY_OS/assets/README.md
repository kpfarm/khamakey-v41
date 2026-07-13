# Assets — KhamaKey

Cartella per immagini, loghi, mockup e materiali statici del progetto.

---

## Struttura suggerita

```text
assets/
├── brand/
│   ├── logo.svg
│   ├── logo-dark.svg
│   └── palette.png
├── mockup/
│   ├── editor-business.png
│   ├── editor-moments.png
│   └── nfc-tag.jpg
├── marketing/
│   ├── asset-manifest.md
│   ├── landing/
│   ├── marketplace/
│   ├── product/
│   ├── reseller/
│   ├── social/
│   ├── video/
│   ├── source-antigravity/
│   └── README.md
└── screenshots/
    ├── admin/
    └── pubblico/
```

---

## Regole

- Preferire **SVG** per loghi e icone
- PNG/WebP per screenshot e mockup
- Nomi file in kebab-case: `editor-moments-hero.png`
- Non committare file > 5 MB (usare R2 per media utente)
- Ogni asset marketing approvato deve avere una riga in `marketing/asset-manifest.md`
- Gli output creativi di Antigravity vanno normalizzati in `marketing/`, non lasciati solo in `.gemini/` o cartelle temporanee
- Non usare link assoluti `file:///Users/...` nei documenti ufficiali: usare percorsi relativi al vault

---

## TODO

- [ ] Caricare logo ufficiale KhamaKey
- [ ] Screenshot admin v106 per documentazione
- [ ] Mockup tag NFC fisico
- [ ] Materiali rivenditori (brochure PDF)
- [x] Prime immagini marketing Antigravity importate in `marketing/`
