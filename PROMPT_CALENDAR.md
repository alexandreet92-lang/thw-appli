# Refonte visuelle — page Calendar (vues annuelle, mensuelle, verticale, circulaire)

## Cadre
Application du langage de design (DESIGN_SYSTEM.md, section « pages denses ») à la page
Calendar. Sous-vues lourdes extraites en fichiers < 200 lignes ; **si un refactor
devient risqué, s'arrêter et documenter** (clause appliquée, voir §Décision).

## Phase 0 — Inspection LECTURE SEULE (constats)

### Structure
`src/app/calendar/page.tsx` (1 491 l.) = orchestrateur (types + config + hook
`useCalendar` inline). Composants : `GoalBanner` (GTY), `AnnualView` (12 mois),
`MonthlyView` (265 l.) et `AppleCalendarView` (220 l., grilles mensuelles),
`ClockView` (321 l., vue circulaire SVG), `EventModal`/`RaceModal`/`DayModal`
(détails/édition), `SportFields`, `NextRaceBar`, `types.ts`.

### Données (hook `useCalendar` → Supabase ; toutes « branchées »)
- `races` (`planned_races`) : nom, sport, date, **level** (`secondary|important|main|gty`),
  goalTime, distance, status (`upcoming|completed`).
- `raceStages` (`race_events`) : événements multi-jours (stages) ; **pas de champ
  catégorie** dans le type → rendus en neutre.
- `eventTypes` (`calendar_event_types`) : types perso, `category: 'pro'|'perso'`.
- `events` (`calendar_events`) : `category: 'race'|'pro'|'perso'`, date, titre.
- **Catégorie** (dimension couleur) = `race|pro|perso|gty` (`CATEGORY_CONFIG` p.82 :
  race rouge, pro bleu, perso violet ; gty sombre via `--gty-*`).
- **Priorité** (dimension SÉPARÉE, texte) = `Race.level` `secondary|important|main`
  (`Secondaire|Important|Principal`).
- **Objectif (GTY)** = race `level==='gty'` ; compte à rebours via `daysUntil`. Branché.
- **Vues** : annuelle / mensuelle / liste verticale / circulaire ; bascule de vue +
  filtres Course/Pro/Perso/Tout dans `page.tsx`. Branché.

### Couleurs en dur / monospace
`page.tsx` 43 hex + 29 mono ; `types.ts` (`RACE_CFG`, `SPORT_COLOR`) hex ;
`GoalBanner` 13, `AnnualView` 5, `MonthlyView` 5, `ClockView` 6, etc.

## Phase 1 — Réalisé (2 vues + tokens catégorie)
Tokens ajoutés à `globals.css` (sanctionnés, DS §2.1) : `--cat-race` / `--cat-pro` /
`--cat-perso`. gty utilise `--gty-*` existants.

- **GoalBanner (GTY)** — réécrit : plus de carte noire pleine ; **hero calme sur
  `--bg-card2`**, eyebrow « Objectif de l'année », nom en `var(--font-display)`, méta
  neutre, **compte à rebours en chiffre focal tabulaire** (`.tnum`) à droite. Enforced.
- **AnnualView** — réécrit : grille 12 mois sur `--bg-card2` (plus de cartes bordées) ;
  événements en **lignes** (filet catégorie 3px + nom + date + **tag priorité**) ;
  passés **atténués**, terminés cochés (✓ neutre), mois vide « Aucun » ; stages en
  filet neutre + « Stage » (emoji 🏕 retiré). Enforced.

Les deux composants gardent **la même signature de props** → `page.tsx` non modifié
(faible risque). Build vert, enforce 0 couleur (16 fichiers).

## Décision — arrêt documenté pour le reste
Les vues restantes touchent `page.tsx` (1 491 l., filtres + bascule + agrégation
d'événements `AnyEvent`) et des composants > 200 l. (`MonthlyView` 265, `ClockView`
321). Les restyler proprement + les garder < 200 l. demande extraction/découpe et
modifications de `page.tsx` à risque modéré. Conformément au cadre, on s'arrête après
les 2 vues sûres et on documente la suite.

### Plan incrémental proposé (une slice = un fichier enforced + commit)
1. ✅ GoalBanner (GTY) + tokens catégorie.
2. ✅ AnnualView.
3. ⏳ Filtres Course/Pro/Perso/Tout en onglets texte + bascule de vue + boutons
   (+ Événement / + Course en `--primary` compact, « Types » discret) — dans `page.tsx`.
4. ⏳ Vue liste verticale (sections par mois, lignes filet catégorie + tags sport/priorité,
   compte à rebours J-x en `--primary` si proche). Localiser l'implémentation actuelle.
5. ⏳ `MonthlyView` (pastille minimale = point catégorie + libellé) — découper si > 200 l.
6. ⏳ `ClockView` (cercle épuré, points catégorie à leur position angulaire, aiguille
   « aujourd'hui » en `--primary`, centre année + date, légende en points) — SVG brut,
   découper si > 200 l.

## Contraintes respectées
TypeScript strict (aucun any), zéro mock (stages sans catégorie = rendu neutre, pas
inventé), tokens uniquement dans les fichiers extraits, ≤200 lignes, `npm run build`
vert, aucun emoji, commit local, pas de push. `strava.ts` intact, aucune migration.
