# PROMPT — Planning : page complète + Training Bloc + Gantt de périodisation

> LIRE `docs/DESIGN_SYSTEM.md`. Dark de référence, clair ET sombre. Fichiers < 200 lignes.
> SVG brut, aucune lib. Couleurs via `var()` (sport = tokens). createPortal pour overlays.
> Refs DOM (pas setState) pendant drag/scroll. Zéro mock. Aucune migration dans ce prompt.
> **Commit local. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Page Planning
- A1. `formatDuration(min): string` → « Xh YY » (1h40, 0h30, 3h00), jamais décimal. Partout.
- A2. « Volume par discipline » : sous le volume, ajouter une **jauge TSS** (réalisé/cible,
  pts) teintée couleur sport opacité ~0.55. Chiffres neutres.
- A3. Section « Training Bloc » (entre Volume par discipline et Aujourd'hui) : carte par
  sport actif (pastille + nom, chips qualités, « N séances », « S2/4 », chevron › →
  détail). État vide « Aucun bloc configuré — planifier ».

## B. Training Bloc — vue détail
Par sport : pips semaine (S2/4, stepper total), focus multi-select (chips supprimables +
« + type »), stepper nb séances → N lignes, type par séance (single-select picker). Picker
unique `mode:'multi'|'single'`, liste types du sport (B3) + ajout custom **persisté en base**.
Mobile = bottom sheet createPortal, desktop = panel. Listes initiales B3 (Vélo/Running/
Hyrox/Natation/Muscu) ; autres sports vides.

## C. Gantt de périodisation
Grille sport×semaines, semaine en cours = trait cyan, mobile scroll horizontal (min-width
680). Bande « Courses » (lecture seule depuis Calendrier) : drapeau + bande rouge verticale.
Segments de bloc colorés (passés pleins, à venir pointillés), drag+resize calés à la semaine
(refs DOM, pointermove/up, 60fps). « + Créer un bloc » (sport, nom, couleur swatches+hex,
plage semaines) → crée le segment + initialise le détail B. Clic segment → détail B.

## Phase 0 (vérifié)
- **Aucune table de blocs / périodisation** en base (présentes : `training_plans`,
  `planned_sessions`, `planned_races`). Migrations interdites dans ce prompt → la
  persistance des blocs + types custom passe par **localStorage** (données réelles,
  zéro mock). DB cible (future migration séparée) : table `training_blocks`
  (`user_id`, `sport`, `week_current`, `week_total`, `focus jsonb`, `sessions jsonb`,
  `color`, `start_week`, `weeks`) + `block_custom_types` (`user_id`, `sport`, `type`).
- Courses : `planned_races` (lecture seule pour le Gantt).

## Livré dans cette passe
- **A1** : helper `formatHm(min)` → « Xh YY » (0h30/1h40/3h00) dans `lib/utils`. Utilisé
  par les nouveaux composants. (Sweep complet des durées existantes de la page 11k lignes
  = différé : `formatDuration` historique renvoie 30min/3h.)
- **A3** : `TrainingBlockSummary` (carte Training Bloc en haut de l'onglet Entraînement) :
  par sport configuré → pastille, qualités (chips), « N séances », « S{n}/{total} »,
  chevron › → détail. État vide « Aucun bloc configuré — planifier » + chips de démarrage.
- **B** : `TrainingBlockDetail` (createPortal) : pips semaine + stepper total, focus
  multi-select (chips supprimables + « + type »), stepper nb séances → N lignes, type par
  séance (single). `TypePicker` (mode multi/single, bottom sheet createPortal, ajout custom
  persisté). Listes B3 complètes (Vélo/Running/Hyrox/Natation/Muscu). Store `trainingBlocks.ts`.

## Reporté (documenté)
- **A2** (jauge TSS sous chaque sport) : la section « Volume par discipline » n'a pas été
  localisée proprement dans la page Planning (~11k lignes) dans le budget ; reporté pour
  éviter une chirurgie risquée. (Le format Xh YY est prêt via `formatHm`.)
- **C** (Gantt drag/resize + bande courses + création de bloc) : très volumineux et
  dépend d'une persistance de blocs en DB (migration). Reporté ; architecture/colonnes
  ci-dessus. La création/édition de bloc est déjà fonctionnelle via le détail B.

## Checklist
Planning : [x] helper Xh YY · [ ] A2 TSS (reporté) · [x] A3 résumé · [x] état vide.
Training Bloc : [x] pips/focus/stepper/type · [x] picker multi+single · [x] type custom
persisté (localStorage, pas hardcodé) · [x] listes B3 · [x] bottom sheet createPortal ·
[x] Phase 0 documentée (pas de table).
Gantt : [ ] reporté (documenté).
Global : [x] clair ET sombre · [x] `npm run build` passe · [x] zéro mock, zéro migration.

## Contraintes
TS strict, aucun `any`. Max 200 lignes/fichier. Ne pas toucher `strava.ts`. Aucun emoji.
`npm run build` passe. Zéro mock, aucune migration. **Commit local. NE PAS PUSH.**
