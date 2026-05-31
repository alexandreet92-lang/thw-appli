# PROMPT_MMP_RECORDS — Cohérence courbe rouge + highlights meilleurs efforts

## FIX 1 — Courbe rouge = valeurs du tableau (personal_records)

### Source actuelle vs cible
- Avant : prMmp calculé depuis activities.streams (24m)
- Après : recordCurve construit depuis yearMmp/allTimeMmp (personal_records)
           → change quand on toggle "Cette année / All time"

### Mapping MMP_DURATIONS → MMP_TABLE_DURATIONS
Tous les points de MMP_DURATIONS sont dans MMP_TABLE_DURATIONS sauf 14400s (4h)
→ interpolation linéaire entre rec[16] (10800s) et rec[17] (21600s)

### Suppression streams fetch
Le useEffect ne fetch plus activities.streams pour la courbe rouge.
Seul recsFetch (personal_records) subsiste.

### recordCurve
useMemo dépendant de recordFilter / yearMmp / allTimeMmp.
Si rec[ti] === 0 → le point est 0 (pas de record pour cette durée).
Légende mise à jour : "Record année" / "Record all time" selon filtre.

## FIX 2 — Highlights meilleurs efforts sur courbe de puissance

### Calcul bestWindows dans SyncCharts
Pour chaque durée [300s='5', 1200s='20'', 3600s='1h'] :
  - Fenêtre glissante sur s.watts (raw, non lissé)
  - Trouve startIdx où la moyenne est maximale
  - Stocke { durationS, label, color, startIdx, endIdx, avgW }

Couleurs :
  5'  → rgba(239,68,68,0.15)
  20' → rgba(249,115,22,0.15)
  1h  → rgba(6,182,212,0.15)

### Rendu sur track "Puissance"
Avant le path de la courbe : rects colorés [startIdx→endIdx, pleine hauteur]
Détection hover : dans handleMove, si cursorPct in [startPct, endPct] → setHoveredWin
Tooltip quand hoveredWin && mousePos :
  "Meilleur 20' : 223 W"
  "1h12 – 1h32"

### Stars sur MMP
Pour chaque DURATIONS[i] où mmp[i] >= recordCurve[i] > 0 :
  SVG <text> "★" doré (#F59E0B) au-dessus du point bleu
  Quand idx === i dans le hover bar : "★ Nouveau record !" en or

## Fichiers modifiés
- src/app/activities/page.tsx (PowerCurveChart + SyncCharts)
