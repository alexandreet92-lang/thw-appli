# PROMPT_MUSCU_LAYOUT_FIX

Corriger le layout de la fiche musculation : ne plus réutiliser le template
cardio générique (Distance/Vitesse/Allure/D+, Terrain/Conditions, Courbes,
donuts) pour une séance muscu.

## INSPECTION
- Convention réelle : musculation = **`activity.sport_type === 'gym'`**
  (`'musculation'`/`'strength'` n'existent pas ; `SportType` n'a que `'gym'`).
- La fiche détail (`src/app/activities/page.tsx`) rendait pour `gym` le **layout
  générique** : Hero « Distance/Vitesse/Allure/D+ », blocs EFFORT/CARDIO/TERRAIN/
  CONDITIONS, section Courbes (Empilé/Superposé/Mono). → non pertinent en muscu.
- ⚠️ Rappel (cf. `PROMPT_MUSCU_HYROX_INTERFACE.md`) : **les données structurées
  d'exercices n'existent pas** (`activity.exercises`, séries, charges, `exerciseDb`,
  1RM, tags). Une activité `gym` ne contient que durée / FC / calories / TSS.

## CE QUI EST FAIT (réel, sans donnée inventée)
Nouveau composant **`src/components/activity/MuscuActivityView.tsx`**, rendu
**à la place** du layout générique quand `isGym` (le générique est gardé sous
`{!isGym && (…)}`, donc strictement inchangé pour les autres sports) :
- **Plus de Hero Distance/Vitesse/Allure/D+** → Hero KPIs **muscu réels** :
  Durée / FC moy / FC max / Calories / TSS / Durée Z2.
- **Plus de Terrain/Conditions** → stats **2 colonnes** : Cardio (FC max / FC moy
  / Durée Z2) + Séance (Temp. moy / Calories / TSS / Difficulté).
- **Plus de section Courbes à toggles** → **courbe FC simple** (SVG, si capteur).
- **Aucun donut**.
- Jauges **Ressenti/Difficulté** conservées (réutilisation de
  `FeelingDifficultyCard` passé en `jauges`), + badges de type (existants).
- Header/titre de la page conservé.

## CE QUI RESTE BLOQUÉ (documenté, pas de mock)
Faute de données structurées d'exercices, **non implémentables** ici :
- Hero **Tonnage / Nb exos / Nb séries / Volume max** (Σ reps×charge) → absents.
- Section **« Effort vs 1RM »** (jauges verticales) → pas d'exos ni de 1RM.
- **Tableau global des exos** + drill-down (séries/RIR) → pas d'exos/séries.
- **Blocs Circuit** → pas de timing inter-exos.
Une carte « Détail par exercice — non disponible » documente ce manque dans l'UI.
**Prérequis** (cf. PROMPT_MUSCU_HYROX_INTERFACE.md) : schéma exercices/séries +
1RM **et** une source qui les peuple (le sync Strava ne les fournit pas).

## VÉRIFICATION
- Pour `gym` : ni Distance/Vitesse/Allure/D+, ni Terrain/Conditions, ni Courbes à
  toggles, ni donuts. Hero muscu + stats Cardio/Séance + FC simple + jauges.
- Autres sports : layout générique **inchangé** (gating `!isGym`).
- Mode jour/nuit (variables CSS), aucun emoji, `createPortal` non requis ici.
- `npm run build` passe.
