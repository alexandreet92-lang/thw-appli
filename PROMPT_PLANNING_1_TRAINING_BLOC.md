# PROMPT — Planning · Prompt 1 : Training Bloc + Training Planification

## Phase 0 (chemins confirmés)
1. Page : `src/app/planning/page.tsx`.
2. Section « Training Bloc » : `src/app/planning/components/TrainingBlockSummary.tsx`
   (résumé/onglets) + `TrainingBlockDetail.tsx` (overlay) + `TypePicker.tsx` ; rendue dans
   l'onglet Entraînement via le slot `belowVolume` de `TrainingSummary`.
3. `src/lib/constants/blocTypes.ts` : existe (BLOC_TYPES + SPORT_LABELS + SPORT_COLORS).
4. Store : `src/app/planning/trainingBlocks.ts` (localStorage, pas de table).

## Livré dans cette passe
- **Onglets en segmented pill** (fond translucide, actif = surface claire + ombre, pas
  d'underline).
- **Grille 3 colonnes** de cartes (sport + pips + chips + N séances + chevron, hover cyan).
- **Surpage** détail : ajout du bloc **« Durée du bloc »** (stepper `{n} sem.`) en premier,
  + onglets sport (segmented), pips, focus chips ✕, stepper séances, dropdown par séance,
  Enregistrer.
- **`FriseV1`** (lecture seule) dans l'onglet Planification : bande mois + numéros de
  semaine + trait « aujourd'hui » + une pilule par sport positionnée d'après `weekCurrent`/
  `weekTotal` du bloc (donnée réelle, relative à aujourd'hui).

## Reporté (documenté)
- **Gantt ÉDITABLE** (drag + poignées resize 60fps, créer un bloc, swatches couleur) :
  composant lourd ; nécessite une **semaine de début absolue** par bloc (donnée absente du
  store actuel) → lot dédié. La FriseV1 reste donc en lecture seule pour l'instant.
- **Courses** dans la frise : lecture depuis le Calendrier (`planned_races`) à brancher —
  reporté avec le Gantt (pour éviter tout mock).
- Couleurs : tokens (rendu cohérent) + `var(--primary)` pour le cyan (au lieu de `#22d3ee`
  littéral), pour rester aligné avec l'accent de l'app.

## Contraintes
TS strict, aucun `any`. Max 200 lignes/fichier. createPortal pour overlays. Aucun emoji.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
