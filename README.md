# Platteguide

Dansk webapp (PWA) til valg af platter til drejning og fræsning: materiale → bearbejdning → forslag fra Sandvik Coromant og Palbit med kvaliteter og skæredata.

- Ren HTML/CSS/JavaScript uden build-trin. Data ligger i `data/*.json`.
- Appen henter kun egne filer og sender ingen data nogen steder hen. Valg gemmes kun på enheden.
- Tallene er vejledende og stammer fra fabrikanternes kataloger og hjemmesider. Tjek altid kataloget.

## Kør lokalt

```bash
python3 -m http.server 8000
```

## Test

```bash
node tests/smoke.js
```

## Ny udgave

Ret `VER` i `app.js` og cachenavnet `C` i `service-worker.js` til samme nye nummer. Så får brugerne beskeden "Ny version klar".
