# Totomondiale Cameg

Sito statico gratuito per GitHub Pages.

## Pagine

- `index.html`: classifica con colonne Posizione, Nome, Punti.
- `pronostici.html`: riepilogo compatto dei pronostici, diviso per giornata come il file Excel.

## Dati

- `data/pronostici.json`: pronostici estratti dal file Excel.
- `data/risultati-auto.json`: risultati aggiornati automaticamente da GitHub Actions.

## Aggiornamento risultati

Il workflow `.github/workflows/update-results.yml` gira ogni 10 minuti e può essere avviato manualmente da:

`Actions → Aggiorna risultati Mondiale 2026 → Run workflow`

La fonte usata è `https://worldcup26.ir/get/games`.
