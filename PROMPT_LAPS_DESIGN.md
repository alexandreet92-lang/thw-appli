# PROMPT_LAPS_DESIGN — Refonte visuelle du graphique des laps

## Fichiers modifiés
- src/components/activity/LapsBikeChart.tsx  (refonte rendu SVG)
- src/app/activities/page.tsx                (passage du prop ftp)

## Analyse code
- FTP utilisateur : `bikeZoneRow.ftp_watts` (table `training_zones` sport=bike)
- LapsBikeChart est dans le bloc ActivityDetail à `~ligne 5634`, déjà sous PowerCurveChart
- Le composant actuel utilise SLOT_W fixe → barres équi-larges (à supprimer)
- La largeur conteneur est responsive : SVG en viewBox + width:100%

## Nouvelle géométrie
viewBox FIXE : `0 0 600 SVG_H` → preserveAspectRatio xMinYMid meet
- `VBW = 600`, `PAD_L = 44`, `PAD_R = 8`, `PAD_T = 22`, `PAD_B = 26`, `CH = 150`
- `innerW = VBW - PAD_L - PAD_R = 548`
- `GAP = 1.5` (entre barres)
- `totalBars = innerW - (N-1) * GAP`
- `barW_i = max(2, (lap.moving_time_s / totalTime) * totalBars)`
- `x_i = PAD_L + Σ_{j<i} (barW_j + GAP)`

Largeurs **proportionnelles à la durée** du lap.
Largeur totale fixe quel que soit N (5 ou 45) → toujours 100% du conteneur.

## Couleur par zone de puissance (% FTP)
- Z1 récup       <  55%  →  `#EDE9FE`
- Z2 endurance   55–75%  →  `#C4B5FD`
- Z3 tempo       75–90%  →  `#A78BFA`
- Z4 seuil       90–105% →  `#8B5CF6`
- Z5 VO2max     105–120% →  `#7C3AED`
- Z6 anaérobie+ >120%    →  `#6B21A8`

Fallback si FTP inconnu → tout en Z3 (`#A78BFA`).

## Conservé
- Hauteur barre = `lap.avg_watts / maxW * CH`
- Watts affichés au-dessus de la barre (si largeur ≥ 18 et hauteur ≥ 18)
- Label `T1, T2...` sous la barre (toutes les `step` si trop nombreux → step = ceil(N/10))
- Ligne moyenne pointillée (avgWatts) inchangée
- Clic sur barre → LapDetailPanel inchangé
- États selected/hovered → border foncé + halo

## Prop ajouté
- `ftp?: number | null`
- Dans activities/page.tsx : `ftp={bikeZoneRow?.ftp_watts ?? null}`

## Vérifications
- npm run build : 0 erreur
- N=5 ou N=45 → largeur globale identique
- Lap long = barre large, lap court = barre étroite
- Mode jour/nuit ok (couleurs violet en couleur fixe, fond utilise vars CSS)
