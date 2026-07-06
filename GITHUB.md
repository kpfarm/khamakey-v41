# Collegamento GitHub — KhamaKey v41

## Stato locale

Il progetto è versionato con git sulla branch `main`.

## Creare il repository su GitHub (prima volta)

Account: **kpfarm**

1. Apri direttamente: [github.com/new?name=khamakey-v41](https://github.com/new?name=khamakey-v41&description=KhamaKey+v41+consolidato+Pages+Worker+SQL)
2. Nome: `khamakey-v41`
3. **Private** (consigliato)
4. **Non** aggiungere README, .gitignore o licenza
5. Clicca **Create repository**

## Collegare e pushare

```bash
cd /Users/user/Documents/Codex/2026-07-04/files-mentioned-by-the-user-khamakey/outputs/khamakey-v41-consolidated

git remote add origin https://github.com/kpfarm/khamakey-v41.git
git push -u origin main
```

Se `origin` esiste già:
```bash
git remote set-url origin https://github.com/kpfarm/khamakey-v41.git
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
