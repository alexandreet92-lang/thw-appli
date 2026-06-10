# PROMPT_PROGRESSION_PHASE_A

Vue « Général » de la Progression à partir de la donnée RÉELLE déjà présente.

## PARTIE 1 — Décision backfill (vérif streams)
Streams stockés = **minoritaires** (<30 %) : run 84/328, bike 36/447, gym 31,
virtual_bike 27, swim 2. → **Option C (hybride) à dominante agrégats** : calcul
précis quand streams dispo (Phase A.2, à l'import), **agrégats sinon** (fait).
Note : le **vélo n'a quasi jamais de FC** (15/447) → son « Général » est basé
**puissance / vitesse**, pas EF.

## PARTIE 2 — Migrations (appliquées sur thw-v2)
- `session_families` (+ index + RLS) — vide.
- `activities` : colonnes `ef_value`, `power_hr_ratio`, `decoupling_pct`,
  `ef_calculation_method` (+ index).
- `user_performance` (FTP/VMA/CSS… — préparée Phase B).
Fichier repo : `src/supabase/migrations/add_progression_phase_a.sql`.

## PARTIE 3 — Backfill (agrégats, via SQL)
- **Running EF** = (distance_m/moving_time_s × 60) / avg_hr → **232 séances** remplies.
- **Cyclisme Power/HR** = avg_watts / avg_hr → **31 séances** (FC vélo rare).
- `decoupling_pct` laissé NULL (calcul streams → Phase A.2).
- ⚠️ Le script `scripts/backfill_*.ts` du prompt nécessite `SUPABASE_SERVICE_KEY`
  (indispo ici) → backfill fait directement en **SQL** (équivalent, agrégats).
- ⚠️ Trigger import (calcul auto sur nouvelles activités sans toucher
  `strava.ts`) : **à faire en Phase A.2** (post-process). Le backfill couvre
  l'existant ; les nouvelles activités auront `ef_value` NULL jusque-là.

## PARTIE 4 — Frontend (colonnes/sports RÉELS)
> Le prompt suppose `sport='running'/'cycling'/'musculation'/'swimming'` et
> colonnes `avg_pace/avg_power/total_tonnage`. **Réel** : `sport_type` =
> `run/bike+virtual_bike/gym/swim` ; colonnes `avg_pace_s_km/avg_watts/
> distance_m/moving_time_s/started_at`. Adapté en conséquence.

- `src/lib/progression/sportConfig.ts` : `SPORT_CONFIGS` (mapping vers
  `sport_type` réels ; hyrox/aviron/trail `hasData:false`) + `GENERAL_CONFIGS`
  (héros/stats/colonnes réels par sport).
- `src/lib/progression/helpers.ts` : `avgRecent`, `calcDelta`, `calculateTrend`,
  `fmtDur/fmtKm/fmtRelDate` + type `ProgSession`.
- `components/GeneralView.tsx` : fetch activités (client supabase) → héros +
  badge tendance + **courbe d'évolution SVG** + 3 stats secondaires (delta) +
  **liste des séances** + **Comparer** (modal côte-à-côte inline, `createPortal`).
- `components/EvolutionChart.tsx` : SVG brut (8 dernières).
- `components/FamilyEmptyState.tsx` / `SportEmptyState.tsx` : états vides
  contextuels.
- `ProgressionSportView.tsx` réécrit : onglet **Général** (défaut) + onglets
  familles (empty state) ; sports sans données → empty state direct sans onglets.

## Intégration / sidebar
Tout reste rendu **inline dans la section Progression de `/activities`** (la vue
sport via état `progSport`) → la sous-nav Données/Analyse/Progression et la
sidebar globale restent visibles. La **comparaison est inline** (modal), pas une
route séparée (évite la perte de sidebar). Retour `←` → hub.

## VÉRIF
- Running/Cyclisme/Muscu/Natation : onglet **Général** avec **vraies données**
  (héros, tendance, courbe, stats, liste, comparer). Familles → empty state.
- Hyrox/Aviron/Trail : empty state direct (0 activité en base).
- `npm run build` passe ; mode jour/nuit, variables CSS, SVG brut, pas d'emoji.

## RESTE (Phase A.2 / B)
- Calcul EF/Power-HR **précis depuis streams** + **hook import** (post-process,
  sans toucher `strava.ts`).
- `decoupling_pct` (streams).
- Familles structurées (VMA/Seuil/FTP/…) : nécessitent des séances structurées.
- Saisie FTP/CSS dans `user_performance`.
