# Base d'aliments + Recherche Open Food Facts

## Objectif
Ameliorer l'experience de recherche d'aliments pour qu'elle ressemble
a une vraie app nutrition : suggestions instantanees, aliments frequents,
recherche multilingue, resultats de qualite.

## Source de donnees
Open Food Facts — API gratuite, 3M+ produits dont nombreux francais.
Aucune installation locale. Tout en fetch HTTP.

## 1 — Aliments frequents
Fichier local `/lib/common-foods.ts` avec 20 aliments courants.
Affiches quand le champ est vide + focus.

## 2 — Logique de recherche
`/lib/food-search.ts` : recherche locale instantanee + Open Food Facts en parallele.
Fusion : locaux en premier, puis API (sans doublons), max 12 resultats.
Barcode lookup via `/api/v0/product/{code}.json`.

## 3 — UX de la liste
- Focus vide : aliments frequents + recemment utilises (localStorage)
- Recherche en cours : skeleton loader 3 lignes
- Resultats : sections separees "Aliments de base" / "Produits"
- Aucun resultat : message + bouton saisie manuelle

## 4 — Historique recent
10 derniers aliments utilises dans localStorage `recent_foods`.

## Integration
- Bouton "Rechercher un aliment" dans le formulaire d'edition de repas
- Barcode scanne → lookup automatique Open Food Facts
- Selection d'un aliment → remplit description + macros du formulaire

## Regles
- /lib/common-foods.ts fichier separe
- /lib/food-search.ts logique de recherche separee
- Aucun emoji
- npm run build doit passer
