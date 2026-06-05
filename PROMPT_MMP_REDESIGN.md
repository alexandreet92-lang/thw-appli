# PROMPT_MMP_REDESIGN — Refonte Courbe de puissance (MMP)

## Fichier modifié
- `src/app/activities/page.tsx` (composant `PowerCurveChart`, ~l. 764-1100)

## Diagnostic préalable
Composant SVG natif (pas Recharts/Chart.js). Pré-existant :
- Axe X : sqrt scale (durée) — **conservé** (sqrt déjà mieux que linéaire pour les durées)
- Axe Y : linear (watts) — **changé en log** par spec
- Courbe rouge dashed → suivait le `recordFilter` toggle (year / all-time) — **lockée sur All Time**
- Étoiles oranges `★` pour records battus — **remplacées par 🏆 doré/cyan**

## Changements

### 1. Échelle Y logarithmique
```ts
const Y_MIN = 50
const Y_MAX = Math.max(...allVals, 200) * 1.2
function yOf(v) {
  if (v <= 0) return H
  const clamped = Math.max(Y_MIN, v)
  return H - ((Math.log10(clamped) - Math.log10(Y_MIN)) / (Math.log10(Y_MAX) - Math.log10(Y_MIN))) * H
}
const yTicks = [100, 200, 300, 500, 1000, 1500].filter(t => t >= Y_MIN && t <= Y_MAX)
```
- 6 ticks fixes (vs gridlines tous les 200W avant) → moins surchargé
- Pas de suffixe « W » sur les labels (juste les nombres)
- Pas de bordure d'axe visible (grille pointillée discrète opacity 0.5)

### 2. Courbes & zones
- **Indigo séance** : `#6366f1` (était `#5b6fff`) — stroke 2.5px, `linecap/join: round`
- **Rouge record** : `#ef4444` — stroke 2px, `dasharray="5,3"`, **TOUJOURS All Time** (indépendant du toggle MmpTable qui ne contrôle plus que le tableau)
- **Zone séance** : `url(#mmpFill)` gradient `#6366f1` opacity 0.25 → 0.02 (devant)
- **Zone record All Time** : fill `#ef4444` opacity 0.08 (derrière)
- Z-order : zone record → zone séance → ligne record → ligne séance → trophées (au-dessus de tout)

### 3. Trophées 🏆 (remplacent les ★ oranges)
Calcul d'un array `trophies` par durée :
```ts
sess > allTimeCurve[i] → { i, kind: 'allTime' }
else sess > yearCurve[i] → { i, kind: 'year' }
```
Rendu SVG :
```jsx
<g transform={`translate(${cx},${cy - 14})`}>
  <circle r="9" fill="var(--bg-card)" stroke={kind==='allTime' ? '#eab308' : '#06B6D4'} strokeWidth="1.5"/>
  <text x={0} y={3} textAnchor="middle" fontSize="10">🏆</text>
</g>
```
- Doré `#eab308` = nouveau record All Time
- Cyan `#06B6D4` = nouveau record année (mais pas All Time)
- Position : valeur watts de la séance (sur courbe bleue, pas rouge)

### 4. Header card
```jsx
<div style={{display:'flex', justifyContent:'space-between', padding:'18px 16px 12px'}}>
  <span style={{fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-dim)'}}>
    Courbe de puissance
  </span>
  {trophies.length > 0 && (
    <span style={{fontSize:10, fontWeight:600, color:'var(--text-dim)'}}>
      N records battus
    </span>
  )}
</div>
```
- Titre simplifié (« Courbe de puissance » au lieu de « Courbe de puissance (MMP) »)
- Compteur records battus à droite (visible si > 0)

### 5. Hover bar SUPPRIMÉ
La barre `★ N records battus` au-dessus du graphique a été retirée — l'info est dans le header (compteur) + sur la courbe (trophées) + dans le tooltip.

### 6. Tooltip redesigné
```
[DURÉE]                          ← uppercase letter-spacing 0.08em color var(--text-dim)
● Séance     345 W                ← dot bleu, valeur en #6366f1 bold tabular
● Record     386 W                ← dot rouge, valeur en #ef4444 bold tabular
−41 W (89% du record)             ← delta vert #10B981 si battu, sinon var(--text-dim)
```
- Background `var(--bg-card)`, border `var(--border)`, radius 8, padding `8px 10px`
- Shadow `0 4px 16px rgba(0,0,0,0.4)`
- Position : clampée pour ne pas dépasser le conteneur

### 7. Légende compacte
```
─── Cette séance   - - - Record All Time   🏆 Record année   🏆 All Time
```
- 4 items, `gap: 14`, flex-wrap si étroit
- `border-top: 1px var(--border)`, `padding-top: 10`
- Indicateur indigo : `<span 16×2px background #6366f1>`
- Indicateur rouge pointillé : `repeating-linear-gradient(to right, #ef4444 0 4px, transparent 4px 7px)` (vrai pointillé visible vs trait plein)
- Trophée année cyan, trophée All Time doré

### 8. Dimensions & responsive
- Mobile : `height: 260px`
- Desktop : `height: 280px`
- viewBox `-32 0 ${W+32} ${H}` inchangé (W=1000, H=220) → `preserveAspectRatio="none"` stretche au display height
- Largeur 100% du container (edge-to-edge sur mobile dans le sheet, grâce au fix précédent `paddingLeft: isMobileMmp ? 0 : 32`)
- Axe X fontSize : `isMobileMmp ? 9 : 8` (compromise lisibilité mobile)
- Axe Y fontSize : 8 (spec)

### 9. Curseur
- Stroke `var(--border-mid)` opacity 0.7, `dasharray="2 3"` (plus fin et discret que l'ancien `T.text 1px 3,3`)

## Inchangé
- Logique sqrt sur l'axe X (durée) — toujours adaptée pour MMP
- Détection sqrtIdx (hover/touch position → DURATIONS index)
- `MmpTable` en bas, contrôlée par son propre toggle `recordFilter` (le toggle n'affecte plus le chart, uniquement la table)
- Markers `keyMoments` (PowerCurveChart desktop bottom) avait été retiré au commit précédent
- `useCrosshairSvg`, handlers tactiles, refs

## Couleurs sémantiques fixes (autorisées hors var())
- `#6366f1` (indigo séance)
- `#ef4444` (rouge record)
- `#eab308` (doré All Time)
- `#06B6D4` (cyan année)
- `#10B981` (vert delta positif)

Tous les autres backgrounds/borders/text via `var(--bg-card)`, `var(--border)`, `var(--border-mid)`, `var(--text-dim)`, `var(--text-mid)`.

## Vérification
- npm run build : 0 erreur TS
- Axe Y log : 100W et 1000W lisibles sans écrasement
- Courbes bleue/rouge bien distinctes
- Zones colorées subtiles, courbes lisibles dessus
- Trophées 🏆 doré (All Time) / cyan (année) sur les durées battues
- Tap/hover → tooltip avec durée + séance + record + delta
- Légende compacte en bas
- Plus d'étoiles oranges, plus de hover bar
- Mode clair/sombre : couleurs sémantiques fixes + var() pour le reste
- Mobile : edge-to-edge (paddingLeft 0)
- Desktop : intégré dans la fiche
