# Refonte visuelle — page Planning (onglets Entraînement + Semaine)

## Cadre
Application du langage de design (docs/DESIGN_SYSTEM.md, section « pages denses ») à
la page Planning et ses deux onglets. Sous-tâches indépendantes ; extraire chacune
dans des fichiers < 200 lignes ; **si un refactor devient risqué, s'arrêter et
documenter** (clause appliquée ici, voir §Décision).

## Phase 0 — Inspection LECTURE SEULE (constats)

### Structure réelle
`src/app/planning/page.tsx` = **11 407 lignes**, monolithe d'un seul tenant
(86 `useState`, drag-to-create, zoom, plan A/B). Composants clés (ligne de départ) :
- `SportBadge` (581), `SPORT_BORDER/SPORT_BG/SPORT_LABEL` (41-43, hex), `ZONE_COLORS`
  (hex), `INTENSITY_CONFIG` (types de jour).
- `TrainingTab` (3322, ~1 200 l.) = **onglet Entraînement**.
- `WeekTab` (9980, ~800 l.) = **onglet Semaine**.
- `RaceYearTab` (10964), `SessionEditor` (6224, ~3 590 l.), nombreux modals/builders.
- `PlanningPage` (export défaut, 11349).

### Données (toutes « branchées », hook `usePlanning` → Supabase)
- `sessions`, `tasks`, `races`, `intensities`, `weekStart` + CRUD.
- Volume prévu/réalisé, séances prévu/fait, TSS prévu/réalisé : **calculés** dans
  TrainingTab (`plannedMin/doneMin`, `plannedN/doneN`, `plannedTSS/doneTSS`, L3628-3638).
- Volume par discipline : `sportStats` (L3647) ; `sportCounts` (L3640). **Branché.**
- Types de jour Low/Mid/Hard : table `day_intensity` (`intensities` + `setDayIntensity`),
  `INTENSITY_CONFIG`. **Branché.**
- Séances du jour : `week[todayIdx].sessions` (L3654). **Branché.**
- Sélecteur Plan A/B (`activePlan`), navigation de semaine (`currentWeekStart`),
  tâches (onglet Semaine, `tasks` CRUD) : **branchés.**

### Couleurs en dur / monospace à remplacer
`planning/page.tsx` : **~423** littéraux hex + **~235** refs `DM Mono`/`Syne`/`monospace`.
Décoratif typique : chiffres KPI colorés (`#06B6D4`, `#5b6fff`, `#ffb340`), badges
« Last 10W » teintés, blocs séance à fond sport plein (`SPORT_BG`), gradients.

## Phase 1 — Réalisé (slice 1 : bandeau résumé Entraînement)
Extrait dans `src/app/planning/components/training/TrainingSummary.tsx` (< 200 l.,
**enforced**, tokens uniquement, présentationnel — valeurs passées en props) :
- **KPI Volume / Séances / TSS** en rangée nue (plus de cartes bordées) ; chiffres
  **neutres** (`var(--text)`), barres **neutres** `var(--text-mid)` animées (AnimatedBar,
  respecte `prefers-reduced-motion`). Badge « Last 10W » réduit à un lien discret « 10 sem. ».
  Détail Séances : un **point de la couleur du sport** (fonctionnel) + `done/planned`.
- **Volume par discipline** : point sport + label + barre **remplie à la couleur du
  sport** (fonctionnel) + `x,x h / y,y h` neutre, animée.
- **Aujourd'hui** : lignes avec **filet vertical 3px** à la couleur du sport (pas de
  bloc teinté plein) + meta neutre + statut « À faire / Fait » en tag discret.
Le bloc inline correspondant de `TrainingTab` (ancien KPI + discipline + Aujourd'hui)
est remplacé par `<TrainingSummary … />`. Build vert, enforce 0 couleur (14 fichiers).

## Décision — arrêt documenté pour le reste (clause « stop & document »)
L'extraction **complète** de `TrainingTab` (~1 200 l.) et `WeekTab` (~800 l.) en
fichiers < 200 lignes est un refactor à **fort risque** sur un fichier de 11 407 lignes
(86 `useState`, drag-to-create, zoom, plan A/B, grilles multi-semaines, `SessionEditor`
de 3 590 l.). Le faire en une passe produirait un diff massif et fragile. Conformément
au cadre, on s'arrête après la slice 1 et on documente la suite.

### Plan incrémental proposé (une slice = un fichier enforced + un commit)
1. ✅ Bandeau résumé Entraînement (fait).
2. ⏳ `WeekGrid` (la semaine 7 colonnes) : type de jour en **point** low/mid/hard,
   séances en **chips** à filet sport ; conserver le toggle Vertical/Horizontal.
   Risque moyen (couplé au drag et au view toggle).
3. ⏳ Barre de semaine + sélecteur d'onglets + toggle de vue : pilules discrètes,
   couleurs neutralisées. Risque faible-moyen.
4. ⏳ Onglet Semaine — grille calendrier (colonne d'heures + 7 jours, blocs filet+teinte
   très légère, ligne « maintenant » en `var(--primary)`, zone passée hachurée, scroll
   60fps via refs). Risque plus élevé.
5. ⏳ Barre « Ajouter une tâche » + sélecteur Sport : déplacer l'édition lourde en
   **bottom sheet** (DS §3.1).

## Contraintes respectées
TypeScript strict (aucun any), zéro mock (toutes les données sont branchées), SVG/CSS
bruts, tokens uniquement dans le fichier extrait, ≤200 lignes, `npm run build` vert,
aucun emoji, commit local, pas de push. `strava.ts` non touché, aucune migration.
