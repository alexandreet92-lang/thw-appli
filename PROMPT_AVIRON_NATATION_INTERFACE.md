# PROMPT_AVIRON_NATATION_INTERFACE

Interfaces aviron + natation (eau libre / piscine).

## Conventions de sport (réelles)
`activity.sport_type` : **`'rowing'`** (aviron), **`'swim'`** (natation).
GPS = `activity.streams.latlng: number[][]` (pas de `lat`/`lng` séparés, pas de
`swimType`). Détection :
- Aviron **outdoor** = `streams.latlng` présent (ou `summary_polyline`), sinon **indoor**.
- Natation **eau libre** = tracé GPS présent, sinon **piscine**.

## ⚠️ Blocages liés au modèle de données (règle « zéro mock data »)
Le schéma `activities` ne contient **pas** les champs requis par plusieurs
parties du prompt. Non implémentables sans évolution schéma + sync Strava :
- **Piscine** : longueurs (`lengths[]`), nage par longueur, SWOLF, strokes,
  `pool_length` éditable, regroupement en blocs, persistance Supabase
  → la section « Longueurs / blocs / drill-down » n'existe pas en données.
- **Aviron** : intervalles avec **split cible** (target) → la vue
  « cible vs réalisé / Atteint·Proche·Manqué » n'a pas de données cibles.
- **Température d'eau** dédiée, **nom de machine**, **lieu** éditable : absents.
- Édition + persistance (longueur bassin, nage, lieu, temp eau) : pas de champs.

Ces parties sont **documentées ici mais non codées** (pas d'invention de
données). Pour les débloquer : ajouter au schéma `pool_length`,
`lengths jsonb` (stroke/strokes/swolf par longueur), cibles de laps aviron,
`water_temp_c`, `location`, et les remonter via la sync.

## Implémenté (basé sur les flux réels, réutilisation maximale)
1. **Helpers** : `src/lib/utils/split.ts` (`formatSplit`, `speedMsToSplit500`,
   `speedKmhToSplit500`) ; `pace.ts` étendu (`formatPaceSwim`,
   `speedMsToSwimPace100`, `formatDistance`).
2. **Détection** : `isRowing`, `isRowingOutdoor`, `isOpenWater`, `isPool`.
3. **Bandeaux** : aviron indoor (« Aviron indoor · ergomètre ») ; natation
   (« Eau libre » / « Piscine » + temp si dispo).
4. **Hero KPIs** (bloc stats à droite de la map, existant) adapté :
   - Aviron : Distance / Durée / **Split moy /500** / **SPM moy** / FC moy / **Puiss. moy**.
   - Natation : Distance (auto m/km) / Durée / **Allure /100 m** / FC moy / Cadence / TSS.
5. **Courbes (`ActivityCurves`)** sport-aware :
   - Aviron : Vitesse → **Split /500**, cadence → spm, puissance conservée.
   - Natation : Vitesse → **Allure /100 m**, cadence → c/min, pas de puissance.
   (Affichage conditionnel : seules les métriques présentes dans les flux.)
6. **Donuts** (légende temps + %, 0 % masqués, responsive) :
   - Aviron : FC zones / **SPM aviron (6 tranches)** / Température.
   - Natation : **Cadence natation (4 tranches)** / Température (pas de FC zones).
   (Zones Split/Allure/Puissance non incluses : nécessitent des seuils
   utilisateur non définis pour ces sports.)

## Règles respectées
- Pas d'emoji, pastilles colorées + texte.
- Couleurs sémantiques fixes ; reste via `var(--*)`.
- `npm run build` doit passer.
