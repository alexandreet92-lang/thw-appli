# PROMPT_MMP_FULLWIDTH — MMP edge-to-edge sur mobile

## Fichier modifié
- `src/app/activities/page.tsx` (composant `PowerCurveChart`, l. 764+)

## Diagnostic du composant
- Le graphique MMP est un **SVG natif** (pas Recharts/Chart.js)
- viewBox `-32 0 W+32 H` avec `W = 1000`, `preserveAspectRatio="none"` → la zone -32 à 0 dans le viewBox sert aux labels d'axe Y (`<text x={-6}>`)
- Container : `position:relative; cursor:crosshair; paddingLeft:32` — **le vrai padding qui réduit la zone de tracé sur mobile, pas du tout l'axe Y interne du SVG**
- Axe X : labels à `fontSize="8"` (un peu petits sur mobile)
- Axe Y : labels à `fontSize: 9`

## Changements (mobile-only)

### 1. Détection mobile dans le composant
```ts
const isMobileMmp = useWindowWidth() < 768
```
`useWindowWidth` est défini ligne 370 dans le même fichier, déjà utilisé ailleurs (l. 2632, 2688). Pas d'import supplémentaire requis.

### 2. Container edge-to-edge
```ts
paddingLeft: isMobileMmp ? 0 : 32
```
Sur mobile, retire les 32 px de padding gauche → le SVG (et donc tout le graphique) gagne 32 px de largeur. Sur 343 px de viewport-sheet, c'est +10 % de zone de tracé.

### 3. Bump fontSize axe Y (mobile)
```ts
style={{ fontSize: isMobileMmp ? 10 : 9, ... }}
```
Les labels watts (1000W, 800W, …) passent de 9 à 10 px sur mobile pour rester lisibles malgré le rétrécissement de la zone d'affichage.

### 4. Bump fontSize axe X (mobile)
```ts
fontSize={isMobileMmp ? 10 : 8}
```
Les labels durées (5s, 1', 3', 5', 10', 30', 1h, 1h30) passent de 8 à 10 px sur mobile (8 px était illisible à la main).

## Inchangé
- viewBox (`-32 0 ${W + 32} ${H}`) → le système de coordonnées reste constant, les positions internes Y/X restent valides
- preserveAspectRatio="none" inchangé
- Couleurs : bleu séance (#5b6fff), rouge pointillé All Time (#EF4444), grise via var(--text-dim) / var(--border)
- Logique data : courbes mmp, recordCurve, recordStars
- Hover bar, tooltip, légende, gestion crosshair
- Branche desktop : strictement intouchée (condition `< 768`)

## Vérification
- npm run build : 0 erreur TS
- Mobile (< 768 px) :
  - Graphique MMP edge-to-edge dans le sheet (plus de padding gauche)
  - Labels axe Y (watts) à 10 px, plus lisibles qu'avant
  - Labels axe X (durées) à 10 px, plus lisibles qu'avant
  - Zone de tracé ~10 % plus large
- Desktop (≥ 768 px) :
  - Container garde `paddingLeft: 32`
  - Labels Y à 9 px, X à 8 px (état précédent inchangé)
