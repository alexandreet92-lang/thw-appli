# RAPPORT_PROGRESSION_AUDIT

Audit lecture seule. Projet DB interrogé : **thw-v2** (`sfrcnyzntgrxlwlmwifi`,
ACTIVE_HEALTHY ; les 2 autres projets sont pausés). Aucun fichier/DB modifié.

---

## 1. Structure de routing

**Fichiers (5) :**
```
src/app/progression/page.tsx                          # HUB (shuriken + bulles)
src/app/progression/[sport]/page.tsx                  # route sport -> ProgressionSportView
src/app/progression/components/ShurikenAnimated.tsx   # logo animé (réel, fonctionnel)
src/app/progression/components/SportBubble.tsx         # bulle (réel, fonctionnel)
src/app/progression/components/ProgressionSportView.tsx# vue sport (PLACEHOLDER)
```
**Pas de page de comparaison** (`/progression/compare` n'existe pas).

**Layouts :** un seul `src/app/layout.tsx` (root) → contient la **sidebar
globale** (`<Sidebar/>`), appliquée à toutes les routes.

**Données / Analyse / Progression** ne sont **pas des routes** : ce sont des
**sections internes de la page Training `/activities`** (`type Section =
'donnees'|'analyse'|'progression'`). Le hub est rendu **inline** dans la section
`progression` (état `progSport` ; clic bulle → `ProgressionSportView` inline,
sans navigation). La route `/progression/[sport]` existe en complément (accès
URL direct). → Même contexte/sidebar que Données/Analyse. **OK.**

---

## 2. Table `session_families`

- **Migration** : aucune (`find` migrations → rien sur `session_families`/`progression`).
- **Table** : **N'EXISTE PAS.** Requête `information_schema.tables` sur le set
  {session_families, hyrox_segments, muscu_exercises, muscu_sets,
  user_one_rep_max, user_performance, exercises_db, activities} → **seule
  `activities` existe.**
- Enregistrements / distribution : N/A (table absente).

---

## 3. Données disponibles par sport

### 3.1 Inventaire (colonne réelle = `sport_type`)
> ⚠️ Le prompt suppose `sport='running'/'cycling'/'musculation'/'swimming'`.
> Réel : `run / bike / gym / virtual_bike / swim / other / hiit`.
> **Aucune activité `hyrox`, `trail_run`, ni `rowing`.**

| sport_type | nb | avec laps | avec FC | avec watts | avec découplage |
|---|---|---|---|---|---|
| bike | 447 | **11** | 15 | 343 | 0 |
| run | 328 | **10** | 232 | 298 | 0 |
| gym | 317 | 0 | 257 | 0 | 0 |
| virtual_bike | 169 | 1 | 16 | 169 | 0 |
| other | 99 | 0 | 12 | 12 | 0 |
| swim | 50 | 0 | 47 | 0 | 0 |
| hiit | 1 | 0 | 0 | 0 | 0 |

### 3.2 Running
- 328 activités, mais **seulement 10 avec laps**. `aerobic_decoupling` jamais
  renseigné (0). `avg_watts` présent sur 298 (puissance estimée/Stryd).
- **Structure d'un lap (réelle)** : `avg_hr, avg_watts, max_watts, distance_m,
  avg_cadence, avg_speed_ms, max_heartrate, moving_time_s, elapsed_time_s,
  elevation_gain_m, start_index, end_index, lap_index`.
- **Champs requis par la détection ABSENTS** : pas de `isWorkInterval`, pas de
  `avgHrPctMax`, pas de `avgPace`. Ce sont des **auto-laps Strava** (~2 km),
  pas des intervalles « work/rest » structurés.

### 3.3 Cyclisme
- 447 (+169 virtual_bike) ; **343 avec watts** (power data OK). Mais **11 laps
  seulement** et **FTP utilisateur non stockable** (`user_performance` absente).
  → détection FTP/PMA/anaérobie/sprints (qui exige laps + FTP) **inopérante**.

### 3.4 Autres sports
| Sport | Activités | Tables dédiées | Données suffisantes |
|---|---|---|---|
| Hyrox | **0** | `hyrox_segments` absente | Non |
| Muscu (gym) | 317 | `muscu_exercises` / `user_one_rep_max` absentes | Non (0 lap, 0 structure exo) |
| Aviron (rowing) | **0** | — | Non |
| Natation (swim) | 50 | — | Partiel (FC oui, pas de structure CSS/longueurs) |

---

## 4. Composants Progression

| Composant | État |
|---|---|
| `ShurikenAnimated` | **Fonctionnel** (vrai logo `/logos/logo_4bras.png`, animé) |
| `SportBubble` / Hub | **Fonctionnel** (7 bulles, navigation/inline) |
| `ProgressionSportView` | **PLACEHOLDER** (header + onglets familles + carte « non disponible ») |
| `ProgressionHero` | **Absent** |
| `EvolutionChart` | **Absent** |
| `SessionsList` | **Absent** |
| `FamilyView` | **Absent** |
| Vue comparaison | **Absente** |

- Helpers de données attendus (`useFamilySessions`, `FAMILY_CONFIGS`,
  `detectFamilies`) : **aucun n'existe**.
- **Message placeholder** : `src/app/progression/components/ProgressionSportView.tsx`
  **ligne 61** (« Progression bientôt disponible pour cette famille. »). Il est
  rendu **inconditionnellement** (aucune branche « vraies données »).

---

## 5. Helpers et calculs

**Format (existants, réutilisables)** : `formatPace`, `speedMsToPace`,
`formatPaceSwim` (`src/lib/utils/pace.ts`), `formatSplit`
(`src/lib/utils/split.ts`), `avgAdjustedPaceMinKm` (`src/lib/utils/vap.ts`).
Pas d'export centralisé `formatDuration` (variantes `fmtDur` locales).

**Calcul progression** : `calculateOneRm`, `calculateTrend`,
`calculateSynthesis`, `estimateFtp` → **aucun n'existe.**

---

## 6. Synthèse

| Élément | État | Détails |
|---|---|---|
| Routing pages sport | **OK** | Inline dans section `/activities` + route `/progression/[sport]` |
| Table `session_families` | **MANQUE** | Pas de migration, table absente |
| Détection auto familles | **MANQUE** | Aucun sport ; champs laps requis absents |
| Composant Hero | **Placeholder** | Absent |
| Composant graphique | **Placeholder** | Absent |
| Composant liste séances | **Placeholder** | Absent |
| Vue comparaison | **MANQUE** | Inexistante |
| Données Running | **Insuffisantes** | 328 act. mais 10 laps, pas de flag work/pace, découplage 0 |
| Données Cyclisme | **Partielles** | Power OK (343) mais 11 laps + FTP non stocké |
| Données autres sports | **Hyrox/Aviron = 0 act.** ; Muscu/Natation sans structure | À ignorer pour l'instant |

### Ce qui marche
- Le **HUB** (vrai shuriken animé, bulles, navigation inline, sidebar conservée).
- Le **shell** des pages sport (header retour + onglets familles).
- Les **helpers de format** (pace/split/swim).

### Ce qui manque
- Table `session_families` (+ index) et sa migration.
- `detectFamilies*` (par sport) + trigger à l'import.
- Hooks `useFamilySessions`/`useSession`, `FAMILY_CONFIGS`.
- Composants `ProgressionHero`, `EvolutionChart`, `SessionsList`, vue comparaison.
- Helpers de calcul `calculateTrend`, `calculateOneRm`, `estimateFtp`, etc.

### Causes racines du placeholder « Bientôt disponible »
1. **Table `session_families` absente** → impossible de récupérer les séances par
   famille.
2. **Aucune détection ni composant de contenu** (Hero/chart/liste/configs).
3. **Données sous-jacentes insuffisantes** même si on codait tout : laps quasi
   absents (10–11), **sans champs work-interval/pace/%FCmax**, `aerobic_decoupling`
   non calculé, **FTP non stocké**, **0 activité hyrox/aviron/trail**, muscu sans
   structure exo/1RM.

### Recommandations (ordre d'impact)
1. **Combler les fondations data d'abord** : calculer/stocker `aerobic_decoupling`
   et l'**EF** à l'import (déjà calculables depuis les streams) ; stocker le **FTP**
   utilisateur (table `user_performance` ou profil).
2. **Familles « continues » sans laps** : commencer par **EF** (run/bike) et
   **endurance** (natation) — détectables sans intervalles (durée + zone FC) →
   1ʳᵉ progression réelle avec les données existantes.
3. **`session_families`** (table + détection EF/endurance + backfill) puis
   composants Hero/EvolutionChart/SessionsList branchés sur EF.
4. **VMA/Seuil/FTP/PMA** : nécessitent des **laps structurés** (work/rest) — à
   alimenter via une source (création de séance structurée dans l'app, ou parsing
   plus fin des laps Strava). À faire en second.
5. **Hyrox / Aviron / Muscu détaillé** : bloqués tant qu'il n'y a ni activités ni
   structures (segments / exos / 1RM) — laisser en « À venir ».

> **Aucune modification effectuée.** Ce rapport est purement descriptif.
