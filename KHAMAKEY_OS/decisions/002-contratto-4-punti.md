# ADR-002: Contratto pagina pubblica a 4 punti

**Data:** 2026-07-06  
**Stato:** Accettata

## Contesto

L'editor mostra un'anteprima live, ma la pagina reale è renderizzata dal Worker. Senza un contratto esplicito, i campi si disallineano facilmente.

## Decisione

Ogni campo che impatta `/p/`, `/m/` o `/k/` va aggiornato in **4 punti**:

1. Controllo UI in `editor.html` / `moments.js`
2. Anteprima in `renderPublicPreview()` / equivalente Moments
3. Whitelist in `publicStateFromEditor()` (`app.js`)
4. Renderer in `worker/worker.js`

Per Moments, aggiungere `moments.js` e `renderMomentPage`.

## Conseguenze

- Più lavoro per ogni nuovo campo, ma zero sorprese in produzione
- Tutti gli agenti AI devono conoscere questa regola
- Documentata in `AGENTS.md` e `CODEX-COLLAB.md`
