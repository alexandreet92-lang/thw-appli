# PROMPT_B_LAPS — Section Laps/Tours entre Courbes et Zones

## Objectif
Afficher une section Laps/Tours entre les sections Courbes et Zones.
Visible seulement si activity.laps?.length > 1.

## Composants créés
- `src/components/activity/LapsChart.tsx` — SVG chart style Garmin
- `src/components/activity/LapsTable.tsx` — tableau détaillé avec toutes les colonnes

## LapsChart
- Background : courbe de puissance brute (streams.watts) en gris clair, hauteur 140px
- Par lap : rectangle violet (rgba(129,140,248,0.65)) à hauteur avg_watts
- Ligne pointillée horizontale = avg_watts global (#475569)
- Hover : détection du lap sous le curseur → highlight rect + tooltip CSS vars
- Return null si pas de streams.watts

## LapsTable
Colonnes : Tour # | Km | Durée | Watts moy | FC moy | FC max | Cadence | Temp | EF
- Temp = avg(streams.temp[start_index..end_index])
- EF = avg_watts / avg_hr (2 décimales)
- Watts moy → #818CF8
- FC max → #EF4444 si > 90% FCmax estimé
- EF élevé (> 1.5) → #10B981
- Lap récup (avg_watts < 60% médiane autres laps) → opacity 0.5
- Ligne survolée sur le chart → fond rgba(129,140,248,0.1), bordure gauche #818CF8

## Modifications page.tsx
- LapData interface : ajout max_heartrate, avg_cadence, elapsed_time_s, max_watts
- Import des 2 composants
- Ajout state hoveredLapBar dans ActivityDetail
- Section insérée entre Courbes et Zones (desktop uniquement)
- Ancien "LAPS TABLE" (desktop) supprimé (remplacé)

## Fichiers modifiés
- `src/app/activities/page.tsx`
- `src/components/activity/LapsChart.tsx` (nouveau)
- `src/components/activity/LapsTable.tsx` (nouveau)
