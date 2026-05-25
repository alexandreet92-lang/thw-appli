# PROMPT_RUNNING_SPORT

## Objectif
Implémenter le sport Running en suivant exactement la même architecture que le cyclisme.

## Fichiers créés
- src/types/running.ts
- src/hooks/useRunningConfig.ts
- src/hooks/useRunningSettings.ts
- src/components/record/RunningPageData.tsx
- src/components/record/RunningSettings.tsx
- src/components/record/RunningScreen.tsx

## Fichiers modifiés
- src/app/record/page.tsx : view 'running' + dynamic RunningScreen
- src/components/record/SessionSaveForm.tsx : types selon sport (RUNNING_TYPES/CYCLING_TYPES)
- src/types/session.ts : champ sport dans FinishedSession
- src/components/record/SessionSummaryPage2.tsx : métriques selon sport

## Champs running
- pace, avg_pace, best_pace, lap_pace, prev_lap_pace (min/km)
- vap, avg_vap (Vitesse Ajustée au Parcours)
- stride_length, vertical_osc, ground_contact (capteur optionnel)
- vo2max_est

## Pages par défaut running
1. Données : pace(big), duration, distance, elevation_gain, hr, avg_pace
2. Carte : map
3. Lap : lap_pace(big), lap_duration, lap_distance, lap_hr, cadence, vap

## Types entraînement running
EF, Seuil, Fractionné, Côtes, Allure spé, Récup, Sortie long.

## Migration SQL
CREATE TABLE running_settings — même structure que cycling_settings

## Règles
- npm run build doit passer
- Merger sur main, pas de PR
