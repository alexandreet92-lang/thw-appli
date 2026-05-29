# PROMPT_FITNESS_REDESIGN — Refonte des cartes CTL/ATL/TSB

## Objectif
Remplacer les trois cartes grises séparées par une bande horizontale
unifiée, sans fond de couleur distinct (transparent = fond de page).

## Fichier modifié
`src/components/training/FitnessCards.tsx` — JSX entièrement remplacé.

## Design
- Bande unique `display: flex`, bordure `var(--info-border)`, `borderRadius: 16`
- Chaque section séparée par `borderRight: 1px solid var(--info-border)`
- `backgroundColor: transparent` → suit le fond de la page (clair/sombre)
- Valeur : `fontSize: 34, fontWeight: 800`, couleur spécifique par métrique
- Barre de progression `height: 3px` animée (600ms ease)
- Bouton `?` → BottomSheet explicatif

## Couleurs
- CTL : `#06B6D4` (cyan)
- ATL : `#F97316` (orange)
- TSB : `#10B981` (vert) si ≥ 0, `#EF4444` (rouge) si < 0

## Maxima des barres de progression
- CTL : 120 (athlète elite)
- ATL : 150
- TSB : échelle –100 → +100 → normalisé 0–100%

## Thème
- Clair : bande blanche, valeurs colorées
- Sombre : bande quasi-noire (`transparent` = `#020617`), valeurs colorées
