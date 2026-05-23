# Responsive Global — Layout adaptatif toutes pages

## Objectif
Rendre toute l'application veritablement responsive.
>= 1280px : plus de donnees cote a cote.
<= 768px : layout compact, 1 colonne.

## 3 etats de largeur
- Mobile (< 768px) : 1 colonne, navigation bas
- Desktop reduit (768–1279px) : 2 colonnes, navigation laterale
- Desktop large (>= 1280px) : 2-3 colonnes, plus de donnees visibles

## Container principal
Chaque page : `max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8`

## Nutrition
- Bilan du jour + Seance du jour : `grid grid-cols-1 xl:grid-cols-2`
- Poids : graphique (xl:col-span-2) + formulaire (xl:col-span-1) dans `grid xl:grid-cols-3`
- Repas types : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

## Autres pages
- Audit et grilles xl:grid-cols-2 pour sections independantes cote a cote

## Regles
- Uniquement changements CSS/Tailwind, zero logique
- Pas de window.innerWidth dans JSX
- npm run build doit passer
