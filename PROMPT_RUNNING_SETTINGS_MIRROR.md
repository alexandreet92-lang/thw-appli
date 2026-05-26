# PROMPT_RUNNING_SETTINGS_MIRROR

## Objectif
RunningSettings doit avoir exactement la même structure visuelle que CyclingSettings :
mêmes icônes SVG, mêmes sections, même navigation tiles → sous-pages.

## Fichiers créés
- components/record/RunningSettingsNav.tsx (copie CyclingSettingsNav avec RunningSettings type)
- components/record/RunningSettingsParams.tsx (copie CyclingSettingsParams, adapté running)

## Fichiers modifiés
- components/record/RunningSettings.tsx : réécriture miroir de CyclingSettings.tsx
- hooks/useRunningSettings.ts : ajout de navigation dans RunningSettings

## Sections identiques (mêmes icônes SVG)
Pages de données, Navigation, Entraînement, Notifications,
Capteurs, Affichage, Profil athlète, Enregistrement, Unités & Mesures, Après la séance

## Adaptations running
Capteurs : uniquement FC + Cadence/foulée (pas puissance ni vitesse roue)
Profil athlète : pas de FTP, ajouter VMA + allures 5k/10k/semi/marathon
Unités : ajouter option allure min/km ou min/mile
Enregistrement : seuil auto-pause en km/h adapté running (0.5 / 1 / 2 km/h)

## Règles
- npm run build doit passer
- Merger sur main, pas de PR
