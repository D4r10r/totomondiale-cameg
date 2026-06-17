# Totomondiale Cameg

Pagina statica gratuita per GitHub Pages/Netlify.

## Regole

- 1 punto per ogni pronostico 1X2 indovinato.
- Classifica ordinata per punti decrescenti.
- Colonne pubbliche: Posizione, Nome, Punti.
- I pronostici sono in `data/pronostici.json`.
- La correzione richiesta è stata applicata: MICHELE, SCO-BRA, pronostico da `3` a `2`.

## Aggiornamento automatico risultati

Il frontend chiama l'endpoint pubblico:

```text
https://worldcup26.ir/get/games
```

La fonte dichiara API gratuita/open-source, live score e assenza di API key per la lettura.
Se in futuro l'API cambia formato, va modificata solo la funzione `normalizeApiMatch()` in `assets/app.js`.

## Pubblicazione gratis con GitHub Pages

1. Crea un repository GitHub.
2. Carica tutti i file contenuti in questa cartella.
3. Vai in Settings > Pages.
4. Source: `Deploy from a branch`.
5. Branch: `main`, folder `/root`.
6. Salva e attendi l'URL pubblico.

## Nota tecnica sul matching

L'Excel usa sigle personalizzate/italiane, ad esempio `SUD`, `SVIZ`, `CAVE`, `NZEL`.
Il sito converte i nomi squadre API in queste sigle tramite `TEAM_ALIASES` dentro `assets/app.js`.
