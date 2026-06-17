# Totomondiale Cameg

Sito statico gratuito per GitHub Pages.

## Pagine

- `index.html`: classifica Posizione / Nome / Punti
- `pronostici.html`: riepilogo compatto stile Excel, diviso per giornata

## Dati

- `data/pronostici.json`: pronostici esportati dal file Excel
- `data/risultati-auto.json`: risultati scaricati automaticamente da GitHub Actions

## Aggiornamento risultati

Il sito non chiama più direttamente l'API dal browser. La chiamata viene fatta da GitHub Actions ogni 10 minuti e salvata in `data/risultati-auto.json`, così si evitano blocchi CORS e caricamenti infiniti.

Per avviare subito l'aggiornamento:

1. Repository GitHub → Actions
2. Seleziona `Aggiorna risultati Mondiale 2026`
3. Clicca `Run workflow`

La classifica assegna 1 punto per ogni pronostico 1X2 corretto.
