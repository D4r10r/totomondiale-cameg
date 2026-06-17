# Totomondiale Cameg

Pagina statica gratuita per classifica pronostici 1X2 del Mondiale 2026.

## Pubblicazione gratis

1. Crea un repository GitHub.
2. Carica tutti i file di questa cartella.
3. Vai in Settings > Pages.
4. Source: Deploy from branch.
5. Branch: main, folder: /root.
6. Apri l'URL GitHub Pages generato.

## Dati pronostici

Il file da aggiornare è:

`data/pronostici.json`

Formato:

```json
[
  { "partecipante": "Mario", "match_id": "1", "partita": "Mexico - South Africa", "pronostico": "1" }
]
```

## Note importanti

- `match_id` deve corrispondere all'ID partita dell'API `https://worldcup26.ir/get/games`.
- I pronostici accettati sono solo `1`, `X`, `2`.
- La pagina si aggiorna automaticamente ogni 5 minuti.


## v7

- Riepilogo pronostici più compatto.
- Intestazioni partite su due righe, squadra sopra/sotto, per smartphone.
