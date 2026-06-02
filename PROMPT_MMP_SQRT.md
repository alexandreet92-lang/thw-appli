# PROMPT_MMP_SQRT — Échelle sqrt sur le graphique MMP

## Remplacement de l'échelle log par sqrt

### Formule
T_MIN = 5  (secondes)
T_MAX = actMax = Math.max(activityDurationS, DURATIONS.last, 5)

sqrtX(t) = (sqrt(t) - sqrt(5)) / (sqrt(T_MAX) - sqrt(5)) * W   [0..W SVG coords]

Inverse (cursor hit detection) :
svgX → sqrtT = svgX/W * (sqrt(T_MAX)-sqrt(5)) + sqrt(5) → dCursor = sqrtT²
→ nearest DURATION par distance sqrt

### Vérification (T_MAX=7200s)
  5s   → 0%      60s  → 6.7%    3600s → 69.9%
  10s  → 1.1%    300s → 18.2%   5400s → 86.3%
  30s  → 3.9%    1200s → 39.2%  7200s → 100%

### Changements dans PowerCurveChart
- Renommer logX → sqrtX, changer formule Math.log → Math.sqrt
- Renommer logIdx → sqrtIdx, changer inverse de log à sqrt
- Supprimer actMax commentaire "log scale"
- Mettre à jour commentaire "Log-aware" → "sqrt-aware"
- Supprimer tout usage de Math.log dans les calculs X du MMP

## Fichier modifié
- src/app/activities/page.tsx (PowerCurveChart uniquement)
