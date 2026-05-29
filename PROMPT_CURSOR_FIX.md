# PROMPT_CURSOR_FIX — Barre curseur verticale

## Problème
La barre verticale de survol ne commence pas au bord supérieur du
premier graphique (Altitude). Elle part d'un mauvais point de référence.

## Cause
- `left: cursorPct * 100%` = calcul en pourcentage du container entier
  (incluant la colonne gauche 140px sur desktop) → désalignement data index
- `top: mousePos.y - 10, transform: translateY(-50%)` : le tooltip
  suit la souris en Y, causant un débordement vers le haut et une
  référence verticale instable pour la barre

## Corrections appliquées

### 1. Cursor bar → pixel exact
```tsx
// Avant
left: `${cursorPct * 100}%`
// Après
left: mousePos.x   // pixel depuis le bord gauche du container
```

### 2. Tooltip → top fixe à 80px depuis le container
```tsx
// Avant
top: Math.max(0, mousePos.y - 10), transform: 'translateY(-50%)'
// Après
top: 80    // fixe, ne dépend plus de la position Y de la souris
// (pas de transform)
```

### 3. zIndex cursor bar 10 → 50

## Résultat
- La barre part du top:0 du container (haut du premier chart)
  et descend jusqu'en bas du dernier chart
- Le tooltip reste visible à hauteur fixe quelle que soit
  la position verticale de la souris
