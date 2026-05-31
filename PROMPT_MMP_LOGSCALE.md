# PROMPT_MMP_LOGSCALE — Axe X logarithmique correct sur le graphique MMP

## Diagnostic

Le code utilise déjà Math.log10 pour logX, MAIS :

1. logMax = log10(DURATIONS[last]) — dernier point MMP prédéfini (ex: 1800s
   pour une séance de 51min), pas la durée réelle de la séance.

2. Les labels X sont dans un <div> HTML séparé sous le SVG, avec
   left: (logX(d)/W)*100%. Le SVG a paddingLeft:32 + viewBox="-32 0 1032 220",
   ce qui crée un décalage pixel entre les labels HTML et les courbes SVG.
   Le label "5s" apparaît 32-50px à gauche de l'axe réel.

## Correction

### 1. logX utilise activityDurationS comme maxSec
  actMax = Math.max(activityDurationS, DURATIONS.last, 5)
  logX(d) = (Math.log(d) - Math.log(5)) / (Math.log(actMax) - Math.log(5)) * W

### 2. Labels X dans le SVG (pas dans un div HTML)
  <text> à y=H+14, textAnchor="middle" — parfaitement alignés avec les courbes
  SVG a overflow:visible → les textes sous y=H sont visibles sans changer H

### 3. Correction du hit-detection curseur (logIdx)
  pct (linear) → svgX = -32 + pct*(W+32) → dCursor = 5*exp(svgX/W*log(actMax/5))
  → index du DURATION le plus proche en espace log
  Remplace `idx` de useCrosshairSvg partout dans PowerCurveChart

## Résultat
  5s → 10s : petit espace (facteur ×2, Δlog=0.69)
  1h → 2h  : grand espace (facteur ×2, même Δlog — mais 3600s de plus visuellement)
  Standard TrainingPeaks / intervals.icu

## Fichier modifié
- src/app/activities/page.tsx (PowerCurveChart uniquement)
