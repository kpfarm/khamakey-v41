# Collegamento GitHub — KhamaKey v41

## Stato locale

Il progetto è versionato con git sulla branch `main`.

## Creare il repository su GitHub (prima volta)

1. Vai su [github.com/new](https://github.com/new)
2. Nome consigliato: `khamakey-v41` (o `khamakey-consolidated`)
3. **Private** (consigliato — contiene config produzione)
4. **Non** aggiungere README, .gitignore o licenza (già presenti localmente)
5. Clicca **Create repository**

## Collegare e pushare

Sostituisci `TUO-USERNAME` con il tuo account GitHub:

```bash
cd /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated

git remote add origin git@github.com:TUO-USERNAME/khamakey-v41.git
# oppure HTTPS:
# git remote add origin https://github.com/TUO-USERNAME/khamakey-v41.git

git push -u origin main
```

## Workflow quotidiano

```bash
git status
git add -A
git commit -m "Descrizione breve di cosa è cambiato"
git push
```

## Cosa NON va in git

- File `.env` / `.dev.vars` con secret Worker
- Zip di deploy (`*.zip`) — rigenerabili
- Chiavi service_role Supabase (solo publishable key in `config.js` è OK)

## Clone su un altro Mac / Codex

```bash
git clone git@github.com:TUO-USERNAME/khamakey-v41.git
cd khamakey-v41
```

Poi leggi `README.md`, `ROADMAP.md`, `CODEX-COLLAB.md`.
