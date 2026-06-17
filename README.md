# Totomondiale Cameg

Pagina statica gratuita per GitHub Pages.

## Regole

- 1 punto per ogni pronostico 1X2 indovinato.
- Classifica: Posizione, Nome, Punti.
- Pronostici in `data/pronostici.json`.

## Pagine

- `index.html`: classifica automatica.
- `pronostici.html`: riepilogo compatto stile Excel, diviso per giornata.

## Aggiornamento risultati

La classifica legge automaticamente i risultati da `https://worldcup26.ir/get/games` e conteggia solo le partite concluse della fase a gironi presenti nel file pronostici.

Se l'API esterna non è disponibile, la pagina resta visibile ma i punteggi non vengono aggiornati fino al successivo caricamento valido.
