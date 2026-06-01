# Page Données (activities) — Adaptation mobile

Adapter les onglets **Général** et **Spécifique** de la page Données
(`src/app/activities/page.tsx`) pour mobile (< 768px). Desktop inchangé.

## Mécanisme
Le hook `useWindowWidth()` existe déjà. On ajoute `const isMobile = width < 768`
dans `SectionDonnees` et `SectionDonneesSpecifiques`, et on bascule les grilles
fixes en 1 (ou 2) colonnes sur mobile. `box-sizing: border-box` est global → le
padding ne provoque pas d'overflow.

## GÉNÉRAL (`SectionDonnees`)
- **Button bar** : sur mobile, colonne ; rangée période en scroll horizontal
  (`flex-wrap: nowrap`, `overflow-x: auto`, scrollbar masquée) ; boutons
  Général/Spécifique EN DESSOUS, pleine largeur ; divider masqué.
- **Hero** `1fr 1fr` → `1fr` (empilé). CTL/ATL/TSB restent en 3 colonnes (petits).
- **PMC** : hauteur 160 (déjà). HOVER → TOUCH via listener natif
  `touchstart/move/end` `{ passive: false }` (preventDefault pour ne pas
  scroller la page) qui pilote la ligne verticale + tooltip.
- **4 stats** `repeat(4,1fr)` → `repeat(2,1fr)` (2×2).
- **Volume + Polarisation** `1fr 1fr` → `1fr` (empilés). Deltas par sport conservés.
- **Heatmap** : déjà `overflow-x: auto` ; cases un peu plus petites sur mobile.
- **Zones (3 cards)** `repeat(3,1fr)` → `1fr` (empilées).

## SPÉCIFIQUE (`SectionDonneesSpecifiques`)
- **Sélecteur de sport** : `flex-wrap: nowrap` + `overflow-x: auto` + scrollbar
  masquée sur mobile (pills lisibles).
- **4 stats** : déjà `repeat(auto-fill, minmax(140px,1fr))` (→ 2 col. en mobile) ;
  forcé `repeat(2,1fr)` sur mobile.
- **Tableau zones avec FC** (`ZoneTableWithHR`) : les 2 tables (zones / FC) passent
  de `1fr 1fr` à `1fr` (empilées) sur mobile.
- Donuts / records / splits : conservés, lisibles (SVG `width:100%`).

## Commun
- `overflow-x: hidden` sur les conteneurs racine des deux sections.
- Scrolls horizontaux locaux (boutons, sélecteur) ne scrollent pas la page.
- Thème jour/nuit respecté (variables conservées).

npm run build : 0 erreur.
