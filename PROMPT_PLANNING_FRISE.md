# PROMPT — Planning · Frise (Training Planification)

## Phase 0 (diagnostic — confirmé)
1. Courses : table **`planned_races`** (27 références dans le code). Colonnes :
   `id, name, sport, date, level ('secondary'|'important'|'main'|'gty'), goal, goal_time,
   run_distance, tri_distance, …` (interface `PlannedRace` dans `src/hooks/usePlanning.ts`).
   Chargement via `createClient` (`@/lib/supabase/client`), filtré `user_id`, trié `date`.
   Mapping spec → réel : `name`→name, `date`→date, `type`→`sport`, `priority`→`level`.
2. Frise existante : `src/components/planning/FriseV1.tsx` (créée au Prompt 1, lecture seule
   simple) → **réécrite** ici (mois / semaines deux lignes / courses / segments / éditable).
3. `src/lib/utils/weekDates.ts` : **existe** (getWeekStart/End, isoWeekYear, getCurrentWeek…).
4. `calendar_events` existe aussi (6 réfs) mais les courses utilisateur sont `planned_races`.

## Implémentation
- `FriseV1` réécrite, props `{ readOnly?, reloadToken?, onEdited? }` :
  - charge **blocs** depuis le store (localStorage `loadBlocs`) et **courses** depuis
    `planned_races` (Supabase). Si aucune course → ligne « Aucune course — ajoute des
    courses dans le Calendrier » (jamais de donnée inventée).
  - fenêtre de **12 semaines** ancrée sur le lundi réel (semaine courante − 2). Positions
    calculées par **différence de dates réelles** (robuste aux changements d'année), pas par
    soustraction de numéros ISO.
  - en-tête mois (groupes dynamiques) + en-tête semaines **deux lignes (jour / mois)**, aucun
    numéro de semaine ISO. Semaine courante : fond `#22d3ee`, texte blanc.
  - ligne courses : badge rouge `nom · 8–14 jun` + épingle ; bande rouge verticale sur la
    semaine de course, toute la hauteur des pistes.
  - segments blocs : plage de dates réelle dans le segment. Passé/actif = gradient plein,
    futur = pointillés. Ligne « aujourd'hui » = dot cyan + trait vertical.
  - **Mode éditable** (`readOnly=false`) : drag (move) + poignées resize gauche/droite, via
    **refs DOM + pointermove** (60 fps, jamais de setState pendant le move ; persistance
    `upsertBloc` au pointerup, calage sur la grille des semaines).
- `GanttOverlay` (`createPortal`, scale .92→1) : contient `<FriseV1 readOnly={false}/>` +
  « Créer un bloc » + swatches couleur (un par sport). Ces contrôles n'apparaissent QUE dans
  la surpage, jamais dans la frise lecture seule de la page.
- `TrainingBlockSummary` : l'onglet Planification rend `<FriseV1 readOnly/>` dans une zone
  cliquable → ouvre `GanttOverlay`.

## Checklist
- [x] Phase 0 : structure `planned_races` trouvée et documentée.
- [x] Courses chargées depuis Supabase (ou message « Aucune course » si vide).
- [x] Courses : badge rouge nom + plage « 8–14 jun », épingle, bande de fond rouge.
- [x] En-tête semaines deux lignes (jour / mois). Aucun numéro de semaine ISO.
- [x] Semaine courante : fond `#22d3ee`, texte blanc.
- [x] Segments : dates réelles ; passé/actif = gradient, futur = pointillés.
- [x] Ligne aujourd'hui : dot cyan + ligne verticale.
- [x] readOnly : aucun curseur grab, aucune poignée.
- [x] Éditable : drag move + resize L/R, refs DOM 60 fps.
- [x] Surpage Gantt via createPortal, scale .92→1.
- [x] `npm run build` passe.

## Contraintes
TS strict, aucun `any`, fichiers < 200 lignes, createPortal, aucun emoji.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
