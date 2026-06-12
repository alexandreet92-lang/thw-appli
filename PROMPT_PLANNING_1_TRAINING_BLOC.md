# PROMPT — Planning · Prompt 1 : Training Bloc (complet)

## Phase 0 (diagnostic — confirmé)
1. Page Planning : `src/app/planning/page.tsx`.
2. Section « Training Bloc » : `src/app/planning/components/TrainingBlockSummary.tsx`,
   rendue dans l'onglet Entraînement via le slot `belowVolume` de `TrainingSummary`.
3. `src/lib/constants/blocTypes.ts` : **existe** (BLOC_TYPES + SPORT_LABELS + SPORT_COLORS,
   déjà conformes à la maquette).
4. `src/lib/utils/formatDuration.ts` : **absent** → créé.
5. Test « TEST123 » posé sur l'onglet, confirmé à l'écran, puis annulé.

## Fichiers créés
- `src/lib/utils/formatDuration.ts` — heures décimales → « 1h30 ».
- `src/lib/utils/weekDates.ts` — getWeekStart/End, formatWeekStart, formatBlocRange,
  isoWeekYear, getCurrentWeek, currentWeekInBloc, weekStartOptions. **getCurrentWeek est
  basé sur l'algorithme ISO canonique** (inverse exact de getWeekStart) pour éviter tout
  décalage de la semaine courante. Règle : **aucun numéro ISO affiché en UI**, uniquement
  des plages de dates réelles.
- `src/types/trainingBloc.ts` — `SessionEntry`, `TrainingBlocData`.
- `src/hooks/useWindowWidth.ts` — largeur réactive (détection mobile, SSR-safe).
- `src/components/planning/BlocSummaryView.tsx` — grille 3 colonnes de cartes.
- `src/components/planning/BlocDetailOverlay.tsx` — surpage (desktop zoom / mobile slide).
- `src/components/planning/FocusPicker.tsx` — picker centré (multi = focus, single = séance).
- `src/components/planning/BlocStartWeekPicker.tsx` — grille de lundis (dates réelles).

## Fichiers réécrits / supprimés
- `src/app/planning/trainingBlocks.ts` — store réécrit : tableau `TrainingBlocData[]`
  (plusieurs blocs par sport), CRUD (`loadBlocs/upsertBloc/deleteBloc/newBloc`),
  `blocsCountBySport`, types custom. **localStorage** (clé `_v2`).
- `src/app/planning/components/TrainingBlockSummary.tsx` — réécrit : onglets segmented sans
  encadré parent, BlocSummaryView, BlocPlanView (frise cliquable), monte BlocDetailOverlay.
- Supprimés : `TrainingBlockDetail.tsx`, `TypePicker.tsx` (remplacés).

## Persistance
Aucune table `training_blocs` en base (seulement training_plans / planned_sessions /
planned_races) et migrations hors périmètre → **localStorage** pour V1 (données réelles,
zéro mock). Si une table est créée plus tard, brancher le store dessus.

## Reporté (documenté)
- **Gantt éditable** (drag + resize) = lot « Prompt Frise » séparé. Dans ce lot, le clic sur
  la zone Planification ouvre la **surpage détail** du 1er bloc (interconnexion maintenue) ;
  la frise reste en lecture seule.

## Checklist
- [x] Phase 0 : TEST123 visible avant modification.
- [x] Onglets = segmented pill sans border/wrapper parent.
- [x] Grille 3 cartes : sport + nom + pips + plage de dates réelle + qualités + séances
      déroulantes.
- [x] Plage de dates calculée (lun.→dim.), jamais de numéro de semaine ISO en UI.
- [x] Dropdown séances : flèche → détail par séance numéroté.
- [x] Surpage : onglets sport, blocs multiples/sport, nom éditable, sélecteur date départ
      (grille de lundis), durée stepper + pips + plage calculée.
- [x] Plusieurs blocs/sport : création, sélection, suppression.
- [x] Focus picker : fenêtre CENTRÉE (scale .9→1), multi-select, ajout custom, Valider.
- [x] Mobile : surpage slide haut→bas (translateY -100%→0).
- [x] Picker Focus centré même sur mobile (par-dessus la surpage).
- [x] createPortal pour surpage + picker.
- [x] Aucun numéro de semaine ISO affiché (« sem. X/Y » = position dans le bloc, pas ISO).
- [x] formatDuration disponible pour toutes les durées.
- [x] `npm run build` passe.

## Contraintes
TS strict, aucun `any`, fichiers < 200 lignes, createPortal, aucun emoji.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
