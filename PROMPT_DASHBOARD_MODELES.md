# PROMPT_DASHBOARD_MODELES — Dashboard à deux modèles + sélecteur

> Lecture préalable : `docs/DESIGN_SYSTEM.md`. `src/lib/sync/strava.ts` non touché.
> Commit local, pas de push, pas de déploiement. Prérequis (correctif Modèle 1 :
> routing + pleine largeur desktop) **confirmé** : build vert sur la branche.

## Étape 0 — Vérif données (état RÉEL, base `thw-v2`)

> Base mono-utilisateur (compte créateur) → reflète ses données.

### CTL / ATL / TSB & PMC — **OK (dérivé)**
- **Pas de hook `useTrainingLoad`.** Le PMC est calculé **côté client à partir de
  `activities`** (TSS) par `buildPmc()` dans `src/app/recovery/components/PmcChart.tsx`
  (EWMA : `K_CTL = 1-e^(-1/42)`, `K_ATL = 1-e^(-1/7)`, `TSB = CTL-ATL`), avec
  `estimateTss()` (`src/app/recovery/components/types.ts`) en repli quand `tss` est nul.
- Données : `activities` = 1412 lignes (47 sur 60 j ; 30 avec `tss` explicite, le reste
  estimé). → CTL/ATL/TSB du jour et série PMC **calculables et significatifs**.
- **Réutilisation** : on extrait `buildPmc` dans `src/lib/training/pmc.ts` (source unique)
  et on refactore `PmcChart.tsx` pour l'importer — **aucun recalcul divergent**.
- **Verdict TSB** : il n'existe PAS de helper « Très fatigué… » sur Training (vérifié).
  La seule convention Training est `getTSBColor()` (`src/lib/utils.ts`, seuils **5 / -10 /
  -25**) + `scoreStatus()` (score de récup, autre chose). On construit `tsbVerdict()` calé
  **exactement sur ces seuils** (couleurs cohérentes Training) avec libellés FR
  (Frais / Forme correcte / Fatigué / Très fatigué).

### Sommeil — **VIDE** (le point critique)
- `health_data` data_type='sleep' = **7 lignes** (dernière 2026-05-22), mais **toutes les
  colonnes de stades ET la durée totale sont NULL** : `deep_duration_min`,
  `rem_duration_min`, `light_duration_min`, `awake_duration_min`, `sleep_duration_min`
  → 0 ligne renseignée. Aucune nuit exploitable (stades / interruptions).
- ⇒ `SleepCard` affiche **un état vide** (« Pas de données de sommeil · connecte une
  montre »). **JAMAIS de zéros.** Le rendu en barres empilées n'apparaît que si une nuit
  réelle existe (null-safety stricte).

### Nutrition — **PARTIEL** (comme Modèle 1)
- `nutrition_plans` actif = 1 ; `nutrition_meal_logs` = 24. Objectif kcal du jour
  (plan) + consommé (logs) **dispo**. **Pas de repas horodaté** (`meal_timing` = enum
  `pre_training|…`, pas une heure) → pas de ligne « prochain repas ». `NutritionCard`
  (Modèle 1) réutilisé tel quel, conditionnel.

## Sélecteur de modèle
- `DashboardModelSwitch` : segmented control discret (fond `--bg-card2`, segment actif
  `--bg-elev`), 2 segments « Classique » / « Datas ».
- Desktop : rangée du haut, près du badge plan (slot droit de la salutation). Mobile :
  sous la salutation, compact. Bascule **en direct, sans reload**.
- **Persistance** : pas de mécanisme de préférences serveur réutilisable simple
  (`useTheme` = localStorage ; `user_settings` existe mais demanderait une migration).
  → **localStorage** (`thw:dashboard-model`) pour cette version. ⚠ **La synchro
  multi-appareils nécessitera une migration `user_settings` plus tard.**

## Modèle 2 « Datas » — 9 blocs (cf. dashboard_modele2.html)
1. **Forme du jour (héros)** `FormeArc` — arc TSB SVG brut + verdict (`tsbVerdict`) +
   « CTL · ATL » + « forme optimale dans ~X j » (projection au repos : TSB→+5).
2. **Trio CTL / ATL / TSB** `LoadKpis` — valeurs colorées cyan/orange/rouge + filet coloré
   (convention Training), surfaces sans bordure (design system).
3. **PMC compact** `PmcChart` (dashboard) — CTL/ATL/TSB ~4 sem, SVG brut, tap → `/activities`.
4. **Sommeil** `SleepCard` — total + barre empilée des stades + interruptions ; durées
   NEUTRES, stades colorés. **Vide aujourd'hui → état vide.**
5. **Aujourd'hui** — `TodayCard` (réutilisé Modèle 1).
6. **Nutrition** — `NutritionCard` (réutilisé, conditionnel).
7. **Cette semaine** — `WeekSummary` (réutilisé).
8. **Prochaine compétition** — `NextRaceCard` (réutilisé).
9. **Coach IA** — `CoachAICard` (réutilisé).
- **PAS** de « Dernière activité », ni Records, ni Prochaines séances dans le Modèle 2.

## Architecture
- `src/lib/training/pmc.ts` (hors scan couleurs) : `buildPmc`, `latestPmc`, `tsbColor`,
  `tsbVerdict`, `daysToOptimal`, `LOAD_COLORS` (convention CTL/ATL/TSB).
- `PmcChart.tsx` (recovery) refactoré → importe `buildPmc` (source unique).
- `useDashboardModel` (localStorage) ; `useDashboardActivities` (fetch activities PMC).
- `DashboardContent` devient le **switcher** : Salutation + `DashboardModelSwitch`, puis
  `ClassiqueGrid` ou `DataGrid`. Nouveaux : `FormeArc`, `LoadKpis`, `PmcChart` (dashboard),
  `SleepCard`, `DashboardModelSwitch`, `ClassiqueGrid`, `DataGrid`.
- Chaque fichier < 200 lignes, TS strict, 0 `any`, `var()` only (sauf convention CTL/ATL/
  TSB centralisée dans `src/lib`, non scanné), clair + sombre, arcs/jauges animés +
  `prefers-reduced-motion`. Aucune migration de schéma.
