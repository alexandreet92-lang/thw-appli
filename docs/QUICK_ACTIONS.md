# Actions rapides & capacités d'action de l'IA — Référence

> Cartographie exhaustive de TOUT ce que l'app peut « faire » (actions rapides UI,
> outils de l'IA coach, actions du Studio, mécanismes proactifs), avec le process
> de chacune. Sert de base au chantier IA (finir « Créer un plan d'entraînement »,
> ajouter « Analyser une activité », brancher les suggestions proactives).
>
> Dernière mise à jour : voir l'historique git. Fichiers-source cités entre parenthèses.

---

## 0. Vocabulaire

- **Action rapide (quick action)** : un bouton pré-câblé qui, en 1 tap, envoie à l'IA
  un objectif précis (souvent avec des questions de cadrage) ou déclenche un flow.

### Le « système » de chaque action rapide (priorité spec → flow → prompt)

Chaque action rapide a désormais UN système clair et homogène. Au clic, l'ordre de
résolution est (AIPanel, `renderActionButton` + `runAction`) :

1. **spec** (`QUICK_ACTION_SPECS`, `src/lib/quick-actions/specs.ts`) — le mode par défaut :
   `objective` (à quoi sert l'action) + `questions` décisives (posées via les cartes de
   clarification, l'IA saute celles dont elle connaît déjà la réponse) + `produce` (le
   livrable attendu). L'IA s'adapte à mon niveau/mes données puis génère.
2. **flow** — un assistant multi-étapes sur mesure pour les gros livrables structurés
   (`training_plan`, `nutrition`, `sessionbuilder`, `strategie_course`, `analyze_training`…).
3. **prompt** — repli historique (prompt figé). **Plus aucune action athlète n'en dépend** :
   les 53 ont soit un `flow` riche, soit une `spec` (objectif + questions + livrable).

Autrement dit : « à quoi sert l'action » = son `objective`, « comment elle réfléchit » =
ses `questions` + `produce` (ou son `flow`). Pour ajuster une action, on édite sa spec.
- **Outil (tool)** : capacité que l'IA appelle elle-même pendant sa réflexion
  (lecture de données réelles, ou écriture dans l'app après validation).
- **Action Studio** : nœud d'écriture d'un système d'agents (planning, calendrier…).
- **Mécanisme proactif** : ce qui s'exécute SANS que l'utilisateur clique (routines,
  runs autonomes du Studio, brief matinal).

Point d'entrée universel du coach depuis n'importe quelle page : l'événement
`window.dispatchEvent('thw:open-coach', { prompt? })` (écouté par les shells).

---

## 1. Actions rapides de l'accueil (dashboard)

Le dashboard est volontairement sobre — le vrai catalogue vit dans le panneau IA (§5).

| Élément | Fichier | Déclencheur → process |
|---|---|---|
| Pills « Check-in » / « Créer un plan » | `src/components/dashboard/QuickActions.tsx` | Navigation pure → `/recovery` et `/planning`. **Aucun appel IA** (à faire évoluer, cf. §7). |
| Barre « Demander au coach… » (`CoachAICard`) | `src/components/dashboard/CoachAICard.tsx` | Écrit le texte dans `sessionStorage['coach_prefill']` puis `thw:open-coach` → ouvre l'AIPanel pré-rempli. |
| « Ma vitrine » | `src/components/dashboard/DashboardContent.tsx` | Ouvre un `SlideSheet` (profil + activités). |

---

## 2. Panneau IA — modèle de résolution d'une action rapide

Dispatch : `renderActionButton` (`src/components/ai/AIPanel.tsx` ≈ ligne 12480).
Ordre de priorité quand on tape un bouton (`qa.key`) :

1. **Spec déclarative** — si `QUICK_ACTION_SPECS[key]` existe (`src/lib/quick-actions/specs.ts`) :
   `onPrepare(label, buildActionPrompt(spec))`. La spec = objectif + questions à choix
   (cartes `CoachQuestionCard`) + directive `produce`. C'est le **format cible** (le plus
   propre) — il prime sur tout le reste.
2. **Flow dédié** — sinon si `qa.flow` : `onFlow(flow)` ouvre un wizard spécifique.
3. **Enrichi** — sinon si `qa.enrichedId` : `onEnriched` précharge des données Supabase
   avant d'envoyer le prompt.
4. **Prompt libre** — sinon `qa.prompt` : `onPrepare(label, prompt)`.

Chaque bouton force le modèle recommandé (`onForceModel(qa.model)` — hermes/athena/zeus)
et affiche une estimation de tokens (`src/lib/quick-actions/models.ts`).

---

## 3. Catalogue ATHLÈTE `QUICK_ACTIONS` (`AIPanel.tsx` ≈ 13852-14246)

Regroupé par thème (`QA_THEMES`). Type de résolution indiqué : **[spec]** / **[flow]** / **[prompt]**.

### 3.1 Flows dédiés (wizards)
`training_plan` (zeus) · `weakpoints` **[spec]** · `nutrition` · `app_guide` **[spec]** ·
`analyze_training` · `strategie_course` · `sessionbuilder` · `analyser_semaine` **[spec]** ·
`analyser_recuperation` **[spec]** · `conseils_sommeil` **[spec]** · `analyzetest` ·
`recharge` · `analyser_progression` **[spec]** · `estimer_zones`.

### 3.2 Objectifs
`prise_de_masse` **[spec]** · `programme_cardio` · `perte_de_poids` · `reathletisation`.

### 3.3 Vélo
`velo_endurance` · `velo_vo2` · `velo_seuil`.

### 3.4 Course à pied
`run_ef` · `run_seuil` · `run_vo2` · `run_power`.

### 3.5 Plan
`planifier_semaine` · `reajuster_plan` · `prepa_competition` · `semaine_decharge`.

### 3.6 Séances
`seance_du_jour` · `peu_de_temps` · `sans_materiel` · `indoor` · `recup_active` · `echauffement`.

### 3.7 Force
`seance_force` · `renforcement` · `desequilibre` · `wod_hyrox`.

### 3.8 Course (perf)
`predire_chrono`.

### 3.9 Analyse
`derniere_activite` · `bilan_mois` · `surentrainement` · `derive_cardiaque` · `estimer_vo2max`.

### 3.10 Nutrition
`nutrition_effort` · `hydratation` · `repas_post` · `besoins_macros`.

### 3.11 Récupération / santé
`douleur_blessure` · `etirements` · `gestion_stress`.

### 3.12 Pédagogie
`expliquer_concept`.

### 3.13 Hors thème
« Créer un parcours » → `onPrepare('Créer un parcours', CREATE_ROUTE_PROMPT)`.

---

## 4. Catalogue COACH (multi-athlètes) `COACH_QUICK_ACTIONS` (`AIPanel.tsx` ≈ 12269)

Chaque action porte sur l'athlète ciblé (ou le roster). Thèmes `COACH_QA_THEMES`.

`co_profil` · `co_derniere_activite` · `co_semaine` · `co_charge` · `co_progression` ·
`co_points_faibles` · `co_recup` · `co_fatigue` · `co_sommeil` · `co_plan_nutrition` ·
`co_conso` · `co_macros` · `co_plan_prise_masse` · `co_plan_cardio` · `co_plan_perte` ·
`co_plan_reathle` · `co_planifier_semaine` · `co_reajuster` · `co_prepa_compet` ·
`co_seance_jour` · `co_feedback` · `co_point_hebdo`.

### 4.1 Actions rapides « par agent de page » (`src/components/ai/agentConfig.ts`)
`AGENT_CONFIGS` définit 4 quick actions par agent de page (label + prompt). Certaines
déclenchent le **Managed Agent** (`managedAgentAction`) :

- **planning** : Analyse ma semaine · Ajuste mon plan · Optimise ma charge · Semaine de récup.
- **strategy** : Définis mon objectif · Planifie mes cycles · Évalue ma progression · Prépare une compétition.
- **adjustment** : Douleurs jambes · Récup express · Stress et fatigue · Reprise après pause.
- **readiness** : Analyse mes données · Intensité du jour · Améliorer le sommeil · Signes de surmenage.
- **sessionBuilder** : Séance endurance · Fractionné intense · Récup active · Séance originale.
- **nutrition** : Mes macros du jour · Repas avant séance · Récup nutritionnelle · Créer un plan nutritionnel.
- **performance** : **Analyse une activité** · Identifie mes points faibles · Pic de forme · Analyser mes zones.
- **profiling** (Managed Agent) : `analyzeProfile` · `getLacunes` · `getProgression` · `analyzeTest`.

---

## 5. Outils de l'IA coach (`/api/coach-stream`)

Instructions : `TOOL_INSTRUCTIONS` (`src/app/api/coach-stream/route.ts` ≈ 148-272).
Définitions agrégées : `coachTools` (`src/lib/coach/tools-definition.ts`).
Les outils de **lecture** sont résolus côté serveur (boucle read→reason) ; les outils
d'**écriture** sont rendus terminaux au front → carte de validation avant d'agir.

### 5.1 Lecture (`src/lib/coach/read-tools.ts`)
`get_activities` · `analyze_sport_metrics` (courbe de puissance/FTP, profil d'allure,
durabilité) · `get_training_plan` · `get_planned_sessions` · `get_session_library` ·
`get_activity_detail` · `get_stages` · `get_parcours` · `get_races` · `get_recovery` ·
`get_injuries` · `get_nutrition` · `get_nutrition_log` · `get_personal_records` ·
`get_body_metrics` · `get_climb_records` · `search_images` · `preview_route` ·
`periodization_blueprint`.

### 5.2 Écriture — pages athlète (`src/lib/coach/write-tools.ts`)
`log_nutrition_day` · `set_nutrition_plan` · `clear_planned_sessions` · `log_body_weight` ·
`log_hydration` · `log_recovery_checkin` · `add_race` · `create_route` · `add_personal_record` ·
`duplicate_session` · `mark_session_done` · `update_profile` · `update_injury` ·
`resolve_injury` · `log_injury_progress` · `update_training_zones` · `add_stage` ·
`log_activity_feedback`.

### 5.3 Planning / profil (`src/lib/coach/tools-definition.ts`)
`add_session` · `update_session` · `delete_session` · `move_session` · `add_week` ·
`update_plan_periodisation` · `ask_clarifying_questions` (→ cartes de choix) ·
**`create_training_plan`** (crée+enregistre un plan complet périodisé) ·
`update_athlete_profile` (indices de perf estimés) · `create_injury`.

### 5.4 Mémoire (`src/lib/coach/memory-tools.ts`)
`save_memory` · `forget_memory`.

### 5.5 Mode coach — multi-athlètes (`src/lib/coach/coach-tools.ts`)
`roster_overview` · `message_athletes` · `apply_to_athletes` (`add_race` | `set_nutrition_plan`).

### 5.6 Capacités « in-message » (system prompt central, `route.ts` ≈ 530+)
Graphiques ` ```thw-chart ` (line/bar/area + kit donut/gauge/radar/zones/pmc/curve) ·
`web_search` + `search_images` (Athéna/Zeus) · analyse de parcours importé · prédiction de perf.

---

## 6. Actions du Studio d'agents (`src/lib/studio/`)

`StudioActionKey` (`graph.ts`) + implémentations (`connectors.ts`) :

| Action | Fonction | Effet |
|---|---|---|
| `planning_save` | `savePlanningSessions` | Insère des `planned_sessions` (source=ai, status=planned). |
| `planning_replace` | `replacePlanningSessions` | Remplace les séances IA planifiées des semaines couvertes. |
| `calendar_race` | `saveRaceEvent` | Insère une course dans `race_events`. |
| `nutrition_save` | `saveNutritionPlan` | Active un nouveau `nutrition_plans` (archive l'ancien). |
| `notify_report` | `saveReportNotification` | Insère une notification `studio.report`. |

Toute écriture passe par un **accord humain** (nœud Validation ou approbation), sauf
`notify_report` (sûr en autonome). Raccourci UI récent : bouton **« Ajouter au planning »**
directement depuis un rendu (`planningFromText`, `runner.ts`).

---

## 7. Mécanismes proactifs (sans clic utilisateur)

| Mécanisme | Fichier | Nature |
|---|---|---|
| **Routines** | `src/components/ai/RoutinesView.tsx`, `src/lib/routines/` | L'athlète crée des routines récurrentes qui lancent le coach seul. Templates : Bilan de forme complet, Brief matinal, Bilan hebdo, Rappel récup, Prépa course. |
| **Runs autonomes Studio** | `src/lib/studio/runner.ts`, `src/app/api/studio/tick/route.ts` | Un système autonome tourne et envoie un rapport (`notify_report`). |
| **Brief matinal** | `src/app/api/briefing/generate/route.ts` | Génère un briefing. |
| **Suggestion de repas** | `src/app/api/suggest-next-meal/route.ts` | Suggestion contextuelle côté Nutrition. |

> ⚠️ Il n'existe **pas** encore de vrai « moteur de suggestions » proactif qui pousse des
> cartes de recommandation contextuelles (readiness basse → propose repos ; test dû →
> propose de le programmer ; blessure → adapte). Les déclencheurs `coach_in.*` (notifications)
> sont posés mais le moteur qui les émet reste à construire. → chantier « Suggestions proactives ».

---

## 8. Feuille de route IA (priorités)

### P1 — « Créer un plan d'entraînement » (action rapide prioritaire)
- **Existe déjà** : flow `training_plan` (zeus) + outil `create_training_plan` (génère+enregistre
  un plan périodisé). Pill dashboard « Créer un plan » = navigation nue vers `/planning`.
- **À faire** : (a) relier la pill dashboard au vrai flow IA (pas juste `/planning`) ;
  (b) fiabiliser le cadrage (objectif, échéance, dispo, sports, niveau) via une **spec**
  `QUICK_ACTION_SPECS` plutôt qu'un prompt libre ; (c) écriture au planning en 1 validation +
  lien retour. Réutiliser `create_training_plan` / `add_week` / la périodisation.

### P2 — « Analyser une activité » (nouvelle action rapide)
- **Existe déjà** : `derniere_activite` (prompt) + `performance` agent « Analyse une activité »
  + outil de lecture `get_activity_detail` / `analyze_sport_metrics`.
- **À faire** : un point d'entrée **depuis une activité** (bouton sur la surpage activité) qui
  ouvre le coach avec l'ID réel préchargé et produit une analyse structurée (charge, zones,
  points forts/faibles, dérive cardiaque, reco) + graphes du kit. Migrer vers une **spec**.

### P3 — Suggestions proactives (`coach_in.*`)
- Construire le moteur qui détecte les signaux (readiness plancher, test dû, blessure active,
  adhérence faible, PR récent) et émet des notifications/cartes actionnables. S'appuyer sur
  `detectHealthFlags` (`src/lib/studio/living.ts`) et les émetteurs de notifications existants.

### Principe transverse
Migrer progressivement les actions à **prompt libre** vers des **specs déclaratives**
(`QUICK_ACTION_SPECS`) : cadrage par questions à choix → sortie fiable et reproductible.
