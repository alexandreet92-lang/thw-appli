# Suppression du TSS → SM (métabolique) / SN (neuromusculaire)

Branche `claude/nutrition-mobile-layout-sitzpl`. `src/lib/sync/strava.ts` **non touché**.
`docs/DESIGN_SYSTEM.md` relu. Migration autorisée (étapes 1 & 4).

---

## ÉTAPE 0 — INVENTAIRE (vérifié)

### Calcul charge / PMC (CTL/ATL/TSB)
- `src/lib/training/pmc.ts` — **source unique** EWMA : `buildPmc` (K_CTL=1-e^(-1/42),
  K_ATL=1-e^(-1/7)), `latestPmc`, `tsbColor`, `tsbVerdict`, `daysToOptimal`. Entrée = TSS/jour.
- `src/app/recovery/components/types.ts` — `estimateTss(row)` (approx TSS), types `ActivityRow`/`PmcPoint`.
- **Pas de hook `useTrainingLoad`** : tout passe par `pmc.ts` + `estimateTss`.
- `src/app/recovery/components/TrainingLoad.tsx` — tss7/tss28, ACWR, monotony, strain + libellés « TSS 7j / 28j ».
- `src/components/planning/SessionEditor.tsx` — `computeParcoursFlowTSS` (NP/IF/TSS séance **planifiée** vélo).
- `src/components/record/HomeTrainerScreen.tsx` — TSS live home-trainer.

### Lecture `tss` (DB/objets)
`api/activities/route.ts`, `useDashboardActivities.ts`, `LastActivityCard.tsx`, `TodayCard.tsx`,
`planning/page.tsx`, `usePlanning.ts`, `performance/DatasTab.tsx`, `briefing/page.tsx`,
`session/page.tsx` (tss_estime), `activities/page.tsx`, `AIPanel.tsx` (≈30 accès), `SessionEditor.tsx`,
`VolumeByDiscipline.tsx`, `TrainingSummary.tsx`, `MuscuActivityView.tsx`.

### Affichage « TSS » (UI) — à remplacer
- **Activité (résumé)** : `components/activity/ActivityCard.tsx:191`, `MuscuActivityView.tsx:87/99`,
  `activities/page.tsx:5091,7456,7853,7868,7877,8063`.
- **Dashboard** : `LastActivityCard.tsx:43`, `TodayCard.tsx:61`, `dashboard/LoadKpis.tsx` (CTL/ATL/TSB).
- **Training** : `training/FitnessCards.tsx` (CTL/ATL/TSB).
- **Recovery** : `recovery/components/TrainingLoad.tsx:104-105` + PMC.
- **Planning** : `planning/page.tsx:893`, `training/TrainingSummary.tsx:151`.
- **Performance** : `RacesSection.tsx:1318`, `DatasTab.tsx:3030`.
- **Briefing** : `briefing/page.tsx:698`.
- **Record / Session builder** : `HomeTrainerScreen.tsx:94`, `SessionSummaryPage2.tsx:57`,
  `SessionEditor.tsx:6297,6440`.
- **Coach IA** : `AIPanel.tsx` (≈8 cartes « TSS » + KPIs) — fichier 20k lignes.
- **Config** : `types/cycling.ts:77` (champ data home-trainer « TSS »).

### Types `tss`
`lib/types/index.ts`, `recovery/components/types.ts`, `ActivityCard.tsx`, `TodayCard.tsx`,
`LastActivityCard.tsx`, `lib/coach-engine/schemas.ts` (×4), `AIPanel.tsx` (×6),
`planning/page.tsx` (Week), `session/page.tsx`.

### Données disponibles (vérifié en base, projet `thw-v2`)
- `activities` : `normalized_watts`, `avg_watts`, `ftp_at_time`, `avg_hr`, `max_hr`,
  `avg_temp_c`, `elevation_gain_m`, `elevation_loss_m`, `total_descent_m`, `distance_m`,
  `moving_time_s`, `sport_type`, `streams`, `laps`. Sports : bike, run, gym, virtual_bike,
  other, swim, hiit.
- `athlete_performance_profile` : `ftp_watts`, `hr_max`, `hr_rest`, `vma_km_h`, `css_s_100m`,
  `threshold_pace_s_km` + (ajoutés) `p5s_watts`, `one_rm_estimates`.

---

## DÉCISIONS / FALLBACKS (du spec)
- Température absente → `kHeat = 1`. p5s absente (vélo) → `SN = fcRel × min × 0.4`.
  1RM absent (muscu) → `SN_muscu = 0` (**signalé**, saisie manuelle requise). FC absente →
  `SM = min × 0.5` marqué « estimé ». Jamais de zéro/valeur inventée affichée comme réelle.
- **SM/SN ne sont PAS bornés 0–100** : les formules produisent des points de charge (ordre de
  grandeur TSS). On stocke l'entier. (Le « 0-100 » initial ne s'applique pas à ces formules.)
- Vélo : `NP = normalized_watts`, `FTP = ftp_at_time ?? profil`. `min_above_120%FTP` depuis
  `streams.watts` (sinon repli fcRel).

---

## ARCHITECTURE
- `src/lib/metrics/smSnTypes.ts` — types `ActivityMetricsInput`, `AthleteBenchmarks`, `SmSn`.
- `src/lib/metrics/smSnCycling.ts` / `smSnRunning.ts` / `smSnOther.ts` — formules par sport.
- `src/lib/metrics/smSn.ts` — dispatcher `computeSmSn(activity, profile)`.
- `src/lib/metrics/p5s.ts` — `maxRolling5s(watts[])` + persistance `athlete_performance_profile.p5s_watts`.
- `src/hooks/useSmSn.ts` — profil + calcul pour une liste d'activités.
- `src/lib/training/pmc.ts` — `buildPmcDual` (CTL/ATL/TSB sur SM **et** SN) + verdict combiné.
- `src/hooks/useTrainingLoad.ts` — expose `{ CTL_SM, ATL_SM, TSB_SM, CTL_SN, ATL_SN, TSB_SN, seriesSM, seriesSN }`.
- `src/components/metrics/InfoSmSn.tsx` — petit « ? » + modale centrée (createPortal).
- `src/components/metrics/SmSnStat.tsx` — affichage « SM x · SN y » réutilisable (chiffres neutres).

---

## STATUT DE LIVRAISON (honnête — chantier volumineux, livré en plusieurs passes)

### ✅ FONDATION (faite, build vert)
- Étape 1 : migration `sm_score`/`sn_score` + `p5s_watts`(numeric)/`one_rm_estimates`
  **appliquée en base** (`thw-v2`, vérifié).
- Étape 2 : moteur déterministe `src/lib/metrics/smSn*.ts` (cyclisme/course/natation/aviron/
  muscu/hyrox/générique) + mapper `smSnFromRow` + fallbacks propres (aucun zéro/inventé).
- Étape 3 : `src/lib/training/pmcDual.ts` (CTL/ATL/TSB sur SM **et** SN) + `combinedVerdict`
  (5 verdicts du spec) + `src/hooks/useTrainingLoad.ts` exposant CTL/ATL/TSB SM & SN.
- Étape 4 : `src/lib/metrics/p5s.ts` (`maxRolling5s`, `bestP5sFromActivities`).
- Étape 6 : `src/components/metrics/InfoSmSn.tsx` (modale centrée createPortal) +
  `SmSnStat.tsx` (affichage « SM x · SN y » neutre).
- Hook `src/hooks/useSmSn.ts` (benchmarks + `compute`).
- **UI câblée** : `ActivityCard` (résumé d'activité) affiche désormais **SM · SN** (calcul réel
  par activité) à la place du TSS, avec « ? » d'aide.

### ✅ PASSE UI 1 (faite, build vert) — « TSS » retiré de :
- `ActivityCard` (SM·SN réel), `LastActivityCard` (SM·SN réel), `TodayCard` (chip charge retiré,
  séance planifiée), `MuscuActivityView` (SM/SN réel), `LoadKpis` (CTL/ATL/TSB **SM + SN** via
  `useTrainingLoad` + verdict), `FitnessCards` (textes d'aide), `recovery/TrainingLoad`
  (labels SM 7j/28j…), `types/cycling` (champ home-trainer), `planning/TrainingSummary` +
  `planning/page` (chip), `briefing`, `performance/RacesSection` + `DatasTab`,
  `record/HomeTrainerScreen` + `SessionSummaryPage2`.

### ⏳ RESTE À CÂBLER (TSS encore présent — prochaine passe)
- **Page Activités** (monolithe ~9k lignes) : grilles de détail par activité (run/bike/swim/gym/
  other), totaux « TSS période/Total », **heatmap** + **PMC propre** (`computePMCSeries`),
  tooltip TSS, prompts IA internes. → calculer SM·SN par `a` (un `useSmSn` par composant de détail)
  + sommes SM/SN ; PMC/heatmap sur SM.
- **Dashboard `PmcChart`** + **recovery `PmcChart`** : passer sur `pmcDual` (2 courbes SM/SN).
- **AIPanel.tsx** (~20k lignes, ~50 réf.) : surtout des **prompts** envoyés au LLM (contexte
  charge) + ~8 cartes UI « TSS ». À convertir prudemment (change le comportement du coach).
- **SessionEditor** : TSS de séance **planifiée** (`computeParcoursFlowTSS`) = formule SM
  puissance → relabel « SM » (séance future, pas d'actuals).
- **Chart PMC 2 courbes** (SM cyan / SN violet) : `pmcDual`/`PMC_COLORS` prêts, SVG à écrire.
- **Backfill p5s** : job serveur.
- **Page Activités** : grilles stats inline (`5091,7456,7853,7868,7877,8063`) + **son PMC/heatmap
  propre** (`computePMCSeries` basé `tss`) → à brancher sur `useTrainingLoad`/`pmcDual`.
- **Recovery** (`TrainingLoad.tsx`, PMC), **Training** (`FitnessCards`), **Dashboard**
  (`LoadKpis`, `LastActivityCard`, `TodayCard`) → consommer `useTrainingLoad` + `SmSnStat`.
  (Note : `pmc.ts` historique basé TSS encore utilisé par ces vues — à remplacer par `pmcDual`.)
- **Composant PMC 2 courbes** (SM cyan / SN violet) : `pmcDual` + `PMC_COLORS` prêts, **chart
  SVG à écrire**.
- **AIPanel.tsx** (20k lignes, ≈8 cartes + KPIs coach) — gros volume, contexte IA.
- **TSS de séance PLANIFIÉE** (`SessionEditor.computeParcoursFlowTSS`, `planning/page`,
  `briefing`, `TodayCard`, `session_library.tss_estime`) : concept distinct (pas d'actuals
  HR/puissance/streams) — le spec SM/SN ne le couvre pas ; **à redéfinir avec toi**.
- **Record live** (`HomeTrainerScreen`, `SessionSummaryPage2`), `performance/RacesSection` &
  `DatasTab`, `types/cycling.ts`.
- **Backfill p5s** (étape 4) : job serveur à brancher (charger tous les streams vélo côté
  client = trop lourd). `bestP5sFromActivities` prêt à l'emploi.

## Checklist
- [x] Étape 0 : inventaire complet
- [x] Étape 1 : migration appliquée
- [x] Étape 2 : moteur SM/SN par sport + fallbacks
- [x] Étape 3 : PMC dual + verdict combiné (lib + hook)
- [x] Étape 4 : fonctions p5s (backfill serveur à brancher)
- [~] Étape 5 : ActivityCard en SM·SN ✓ ; **reste** page Activités/Dashboard/Recovery/Training/
  Planning/Performance/Briefing/Record/AIPanel + chart PMC 2 courbes
- [x] Étape 6 : modale « ? » réutilisable (createPortal)
- [x] Verdict combiné SM+SN (lib)
- [x] Aucun any ; var() only ; build OK
- [ ] Validation visuelle mobile + desktop (env headless) ; purge TSS complète (passes suivantes)
