# PROMPT_NEW_SPORTS

## Sport A — Padel / Tennis
Saisie manuelle (pas de GPS). Composants : PadelForm.tsx + MatchScoreInput.tsx.
8 sections : type de sport (padel/tennis/squash/badminton), adversaire(s) + toggle simple/double,
lieu + surface, résultat (victoire/défaite/nul), score par sets, durée H/M/S, RPE, commentaire.
Sauvegarde dans workout_sessions avec nouvelles colonnes (migration SQL).
Résumé inline après sauvegarde.

## Sport B — Natation Eau Libre
Basé sur CyclingScreen avec GPS actif. Composant : OpenWaterScreen.tsx.
Différences : eau (lac/mer/rivière/piscine ext.), température eau (saisie manuelle),
pas de D+/D-, affichage allure /100m. Distance calculée depuis GPS.
Résumé : page 1 (distance/durée/allure + carte tracé), page 2 (temp eau/calories/RPE).

## Sport C — Home Trainer
Basé sur CyclingScreen sans GPS. Composants : HomeTrainerScreen.tsx + HomeTrainerIntervals.tsx.
Watts manuel ajustable (+10/-10). Distance virtuelle = Math.pow(watts/2.8, 1/3) * 3.6 km/h.
3 programmes structurés (Échauffement/Sweet Spot/VO2max) avec intervalles colorés par zone FTP.
Zones FTP Z1-Z6. FTP lu depuis le profil athlète (fallback 250W).
Résumé : distance virtuelle, durée, watts moy, TSS, IF, calories.

## Fichiers créés
- PROMPT_NEW_SPORTS.md
- src/supabase/migrations/add_padel_columns.sql
- src/types/padel.ts
- src/types/openwater.ts
- src/types/hometrainer.ts
- src/components/record/MatchScoreInput.tsx (< 80 lignes)
- src/components/record/PadelForm.tsx (< 180 lignes)
- src/components/record/OpenWaterScreen.tsx (< 180 lignes)
- src/components/record/HomeTrainerIntervals.tsx (< 150 lignes)
- src/components/record/HomeTrainerScreen.tsx (< 200 lignes)

## Fichiers modifiés
- src/components/record/SportSelector.tsx — ajout padel, openwater, hometrainer
- src/components/record/SessionSaveForm.tsx — types d'entraînement pour les 3 sports
- src/app/record/page.tsx — intégration des 3 vues
