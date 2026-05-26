# PROMPT_TRAIL_COMPLET

## Objectif
Sport Trail complet — architecture identique à Running.
4 pages dédiées + Settings + résumé avec D-.

## Fichiers créés
- src/types/trail.ts
- src/hooks/useTrailConfig.ts
- src/hooks/useTrailSettings.ts
- src/components/record/TrailPage1.tsx (données principales)
- src/components/record/TrailPage2.tsx (carte)
- src/components/record/TrailPage3.tsx (dénivelé)
- src/components/record/TrailPage4.tsx (lap)
- src/components/record/TrailScreen.tsx
- src/components/record/TrailSettings.tsx
- src/components/record/TrailSettingsNav.tsx
- src/components/record/TrailSettingsParams.tsx

## Fichiers modifiés
- src/app/record/page.tsx : ajout view 'trail' + TrailScreen
- src/types/session.ts : ajout elevation_loss_m
- src/components/record/SessionSaveForm.tsx : TRAIL_TYPES
- src/components/record/SessionSummaryPage1.tsx : D- pour trail
- src/components/record/SessionSummaryPage2.tsx : métriques trail

## Architecture
TrailScreen rend TrailPage1/2/3/4 par index + useTrailConfig pour pagination.
TrailScreen track elevationLoss localement (gps.currentAltitude diff).
Couleur accent : #F59E0B (amber trail).
DB table : trail_settings.

## Règles
- npm run build doit passer
- Merger sur main, pas de PR
