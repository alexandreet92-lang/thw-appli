# Parcours → séance d'intensité (planning) — spec & avancement

Éditeur concerné : `src/components/planning/SessionEditor.tsx` (monolithe ~7200 lignes).
Persistance : `src/app/planning/page.tsx` (hook local `usePlanning`, table `planned_sessions`,
colonnes jsonb `parcours_data`, `blocks`, `nutrition_data`, uuid `parcours_id`).
Détection côtes : `src/lib/gpx/parser.ts`. Zones/FTP : `src/hooks/useTrainingZones.ts` (table `training_zones`).

## Spec validée (utilisateur)
- **Détection côte** : vraie côte = **≥ 40 m D+ ET ≥ 3 % pente moyenne**, **longueur min 600 m**,
  altitude **lissée**, **fusion** de deux bosses proches même avec léger replat/descente entre elles
  (= une seule montée si ça re-grimpe quelques centaines de m plus loin).
- **Watts cible** : affichés en **watts absolus + % FTP + zone (Z1…Z6)**. Bouton **« uniformiser »**
  = même watt cible sur toutes les côtes par défaut, **modifiable** par côte.
- **Blocs** : intervalles en **temps** (ex 30 s/15 s) posés sur une **section définie en distance** ;
  **estimer vitesse/temps** de parcours d'après pente + watts (physique). Modèle bloc =
  `{ reps, effort(s), récup(s), watts effort, watts récup }`. Blocs **calés sur le graphe**.
- **Usage** : **plan visuel seul** pour l'instant (pas de guidage temps réel /record).

## Plan par phases
- **P1 — persistance + esthétique** (EN COURS)
  - [x] `parcoursDataWithConfig()` : toujours inclure `planningConfig` (avant : seulement si `aiFlowStep==='parcours'` → config perdue).
  - [x] Hydratation à la réouverture : `segments` non persistés en base → **recalcul** via `segmentElevationProfile(elevationProfile)` avant de restaurer `planningConfig`. (effet `[parcoursData?.name]`)
  - [x] `initClimbConfigs(segsArg?)` accepte des segments frais.
  - [x] `page.tsx` load : hydrater `parcoursId` (`r.parcours_id`).
  - [ ] Esthétique du **tableau autour du profil alti** (axes distance/altitude lisibles). Renderers :
        `src/components/record/ElevationChart.tsx`, `ElevationProfile.tsx`, et `ElevationProfileChart` dans `AIPanel.tsx` (~l.16920). Le profil du planning est rendu dans SessionEditor.
- **P2 — détection 40/3 + watts**
  - [ ] `src/lib/gpx/parser.ts` : `CLIMB_THRESHOLD 2→3`, `MIN_ELEV_GAIN_M 15→40`, `MIN_LENGTH_KM 0.5→0.6`,
        augmenter `GAP_TOLERANCE_KM` (fusion bosses proches avec léger creux). Lissage déjà présent (`SMOOTH_WINDOW_KM`).
  - [ ] Affichage watts par côte : absolu + %FTP + zone (ZONES_W à `SessionEditor` ~l.5684). « Uniformiser » (bulkWatts) modifiable par côte.
- **P3 — section libre + sous-blocs**
  - [ ] Sélection libre d'une section (déjà : `SpecificBlock` startKm→endKm + `drawModeActive`).
  - [ ] Découpage en sous-blocs d'intervalles (`BlockIntervalsCfg`) posés en temps sur la section (distance) ; estimation via `estimateTimeOnSegment()`.
  - [ ] Blocs alignés sur le graphe (overlay `_startKm/_endKm`).

## Notes techniques
- `parcoursData.elevationProfile` = `Array<{ distKm, ele }>` (sortie `buildElevationProfile`), directement consommable par `segmentElevationProfile`.
- `climbConfigs[].segIdx` indexe `parcoursData.segments` → les segments doivent être stables : on les **recalcule** (mêmes seuils) au lieu de les stocker.
- Bug d'origine : la séance affichait le tracé (gpsTrace+profil bien en base) mais **perdait `planningConfig`** (jamais écrit hors flow IA) **et** ne pouvait pas restaurer les côtes (segments absents en base).
