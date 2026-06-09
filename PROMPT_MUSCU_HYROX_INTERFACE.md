# PROMPT_MUSCU_HYROX_INTERFACE

Interfaces muscu & Hyrox. **Phase d'inspection lecture seule d'abord.**

## PHASE 1 — INSPECTION — VERDICT

### Conventions réelles
- Muscu = **`activity.sport_type === 'gym'`** (pas `'musculation'`/`'strength'`).
- Hyrox = **`activity.sport_type === 'hyrox'`**.
- Fiches actuelles : placeholder « Analyse spécifique … à venir » (vue résumé
  par sport) ; détail générique (HR/durée) sinon.

### ⚠️ Blocage majeur : les données structurées n'existent pas
Recherche exhaustive — **aucun** des éléments suivants n'existe dans le repo :
- **Base d'exercices** (`exercises_db`) : introuvable. La « base de la page
  Programmes » référencée par le prompt n'existe pas dans le code.
- **Tables** `muscu_exercises`, `muscu_sets`, `hyrox_segments`,
  `user_one_rep_max`, `user_hyrox_custom_types` : **absentes**.
- **Données par activité** : une activité `gym`/`hyrox` ne contient que les
  champs standards (durée, calories, FC stream éventuel). **Pas d'exercices,
  séries, charges, RIR, segments Run/Station, reps par station.**
- **Source de données** : le sync Strava (`strava.ts`, interdit de modifier) ne
  fournit **pas** le détail exo/série/segment. Rien ne peuplerait ces tables.
- Tables proches mais non applicables : `hyrox_races` (résultats de course
  **saisis manuellement**, table séparée, pas de segments par activité) ;
  `segments` (segments **GPS** type Strava, pas des stations Hyrox).
- **1RM** / **allure de référence Hyrox** : pas de champ dédié trouvé.

### Conséquence (règle « zéro mock data »)
La quasi-totalité du prompt n'est **pas réalisable** sans :
1. créer le schéma (6 tables) **ET**
2. une **source qui peuple ces tables** (import/saisie structurée).

Or créer 6 tables que **rien n'alimente** = schéma mort + risque, pour zéro
fonctionnalité. **Je ne crée donc pas ces tables** (elles resteraient vides) et
je n'invente aucune donnée. Sont **bloqués** : tableau des exos, jauges 1RM,
blocs circuit, drill-down exo, tonnage/volume, section segments, analyse des
répétitions, stats par station, bandes FC par segment, donuts Run/Stations &
Temps-par-station & Allure-vs-course.

## IMPLÉMENTÉ (réel, sans nouveau schéma, sans donnée inventée)
- **`WorkoutTypeBadges`** (nouveau composant) sur les fiches **gym & hyrox** :
  badges de type **multi-sélection MANUELLE** (muscu : Strength / Endurance /
  Explosivité / Pliométrie ; hyrox : Simulation / Ergo / Wall Ball / Sled /
  Lunges) + **création de types custom** (nom + couleur, modal `createPortal`).
  Persistance **localStorage** (pas de table dédiée). Aucun emoji.
  - La **détection automatique** des types est **non implémentée** : elle
    requiert les données exos/segments (reps, tags explosif/pliométrique,
    stations…) qui n'existent pas. Documenté ; sélection manuelle uniquement.
- Le reste de la fiche réutilise l'existant réel (jauges Ressenti/Difficulté,
  KPIs durée/FC/calories, courbe FC si capteur).

## PRÉREQUIS POUR DÉBLOQUER (à décider avec le produit)
1. **Schéma** : `exercises_db` (+ `is_base_exercise`, tags, slug),
   `muscu_exercises`/`muscu_sets`, `hyrox_segments`, `user_one_rep_max`,
   `user_hyrox_custom_types`, `user_performance.hyrox_course_pace`.
2. **Source de données** : import structuré (app de muscu, fichier, ou saisie
   manuelle dédiée) — le sync Strava actuel ne fournit pas ce détail.
Une fois (1)+(2) en place : jauges 1RM, tableau exos + drill-down, circuits,
segments Hyrox + rounds, analyse des répétitions, donuts spécifiques, allure de
référence et détection auto deviennent implémentables.

## CONTRAINTES RESPECTÉES
- Lu avant de modifier · TS strict sans `any` · zéro mock (manques documentés) ·
  pas d'emoji · portals via `createPortal` · couleurs sémantiques fixes / reste
  en `var(--*)` · `strava.ts` intact · **aucune migration appliquée** ·
  `npm run build` passe.
