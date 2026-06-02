# PROMPT_LOADING_STATES — Skeletons + Spinners

## Fichiers créés
- src/app/globals.css — keyframes shimmer, fadeUp, spin + classes
- src/components/ui/Shimmer.tsx
- src/components/ui/Spinner.tsx
- src/components/ui/skeletons/SkeletonStatCard.tsx
- src/components/ui/skeletons/SkeletonFitnessCards.tsx
- src/components/ui/skeletons/SkeletonActivityRow.tsx
- src/components/ui/skeletons/SkeletonChart.tsx
- src/components/ui/skeletons/SkeletonPage.tsx (SkeletonTrainingPage + SkeletonAnalysePage)

## Fichiers modifiés
- src/app/activities/page.tsx :
  - useMetricsDaily → retourne loading: boolean
  - SkeletonTrainingPage remplace les divs skeleton-shimmer
  - fade-up sur les sections après chargement
  - SkeletonFitnessCards pendant dbMetrics.loading
  - Spinner dans top bar (syncing Strava, syncingPolar)
  - État syncingPolar ajouté
  - Spinner sur bouton reload ↻

## Pattern utilisé
Loading → skeleton → data loaded → fade-up
