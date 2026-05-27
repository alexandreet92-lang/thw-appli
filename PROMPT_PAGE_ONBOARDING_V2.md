# PROMPT_PAGE_ONBOARDING_V2

## Objectif
Remplacer entièrement l'onboarding précédent (PROMPT_PAGE_ONBOARDING.md).
L'onboarding prend désormais TOUTE la page — position:fixed, inset:0, plein écran total.
Plus de modal, plus de carte centrée. L'utilisateur ne voit plus la page derrière.

## Fichiers modifiés / créés
- `src/onboarding/system/types.ts` — ajout `badge` et `keyPoints` dans OnboardingSlide
- `src/onboarding/system/OnboardingOverlay.tsx` — refait entièrement, plein écran
- `src/onboarding/system/AnimatedBackground.tsx` — fond animé avec particules (< 80 lignes)
- `src/onboarding/system/ProgressBar.tsx` — barre de progression top (< 30 lignes)
- `src/onboarding/system/visuals/ChartVisual.tsx` — types ajoutés : triple_line, ctl_atl_tsb, bar_with_target, weight_area, progression_line, elevation_with_scrub
- `src/onboarding/system/visuals/MockupVisual.tsx` — nouveaux mockups : weekly_grid, planned_vs_done, session_library_list, live_workout, activity_feed, segment_leaderboard, swipe_delete, nutrition_rings, meal_slots, strava_sync_flow, zone_distribution, month_grid, day_detail
- `src/onboarding/system/visuals/IconGridVisual.tsx` — icônes supplémentaires
- `src/onboarding/configs/*.config.ts` — 8 configs remplacées (version 2, slides enrichis)
- `src/app/globals.css` — animations : slide-up, slide-in-right, slide-in-left, pulse-slow, float-particle, draw-path, counter-pop
- `src/app/activities/page.tsx` — ajout `<PageHelp config={TRAINING_ONBOARDING} />`

## Layout plein écran
- `position:fixed, inset:0, zIndex:99998`
- Background : `linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)`
- Zone visuelle : 58% de la hauteur (`58vh`)
- Zone contenu : reste (flex:1), avec gradient de fondu vers le bas
- Bouton "Passer" : top-right, petit et discret (12px, fond transparent)
- ProgressBar : top, height:2px, gradient cyan→bleu

## Animations
- `slide-up` : translateY(20px)→0 + opacity, utilisé sur titre/desc/keyPoints
- `pulse-slow` : scale 1→1.15→1 pour les halos lumineux
- `float-particle` : mouvement flottant multi-axe pour les particules
- `draw-path` : stroke-dashoffset 1000→0 pour les chemins SVG animés
- `counter-pop` : scale 0.7→1.1→1 pour les compteurs

## Convention d'auto-update
À chaque modification fonctionnelle d'une page :
1. Ouvrir le fichier config onboarding correspondant
2. Mettre à jour `features[]` et slides si nécessaire
3. Incrémenter `version`
4. La prochaine ouverture de la page re-déclenchera l'onboarding
