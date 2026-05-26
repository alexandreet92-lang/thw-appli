# PROMPT — Ski Sport

## Objectif
Ajouter le sport Ski / Snowboard à la page record.
Architecture identique à TrailScreen / CyclingScreen.

## Fichiers créés
- src/types/ski.ts
- src/hooks/useSkiConfig.ts
- src/hooks/useSkiSettings.ts
- src/hooks/useSkiTracking.ts (détection phases run/lift/pause)
- src/components/record/SkiPage1.tsx (vitesse + stats principales)
- src/components/record/SkiPage2.tsx (carte)
- src/components/record/SkiPage3.tsx (stats descentes)
- src/components/record/SkiSettings.tsx
- src/components/record/SkiScreen.tsx (< 200 lignes)
- src/components/record/SkiSummary.tsx

## Fichiers modifiés
- src/components/record/SportSelector.tsx → ajouter 'ski'
- src/app/record/page.tsx → view ski + SkiScreen

## Détection phases
detectPhase(speedKmh, gradientPct) → 'run' | 'lift' | 'pause'
Transitions : lift/pause → run = incrément runCount + reset chrono
run → lift/pause = accumule stats descente

## Sélecteur ski/snowboard dans SkiScreen header
skiType state ('ski' | 'snowboard') → sauvegardé avec la séance
