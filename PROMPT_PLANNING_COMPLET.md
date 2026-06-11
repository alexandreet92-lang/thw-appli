# PROMPT — Planning : refonte (tabs Training Bloc + cartes + overlay) 

## Phase 0 (chemins réels, confirmés)
1. Page Planning : `src/app/planning/page.tsx` (titre « Planning » = header `SectionLayout`,
   ~ligne 11337). Confirmé en prod (capture utilisateur).
2. Volume par discipline : `src/app/planning/components/VolumeByDiscipline.tsx` (rendu WeekTab).
3. Training Bloc : `TrainingBlockSummary.tsx` (+ detail/picker, store `trainingBlocks.ts`).
4. Durée : `src/lib/utils.ts` → `formatDuration(minutes)` (Xh YY) + `formatHours(hours)`.

## Livré
- `src/lib/constants/blocTypes.ts` : + `SPORT_LABELS` + `SPORT_COLORS` (hex maquette).
- Section Training Bloc à **deux onglets** (Training Bloc | Training Planification) :
  - **Training Bloc** = `BlocSummaryView` : grille de cartes 3 colonnes (sport + pips +
    chips qualités + N séances + chevron, hover cyan). Clic → overlay détail.
  - **Training Planification** = aperçu lecture seule (`FriseV1` statique) cliquable.
- `BlocDetailOverlay` : overlay zoom (scale .92→1), onglets sport, pips, focus chips ✕,
  stepper, dropdown type par séance, picker (multi/single + ajout custom), Enregistrer.

## Reporté (documenté)
- **FriseV1 complète** (mois/semaines/pilules gradient+pointillés/courses/today) : un
  aperçu statique simple est rendu ; la frise détaillée + données courses (`planned_races`)
  est un lot dédié.
- **Gantt ÉDITABLE** (drag + poignées resize calés sur 12 semaines, créer un bloc, swatches
  couleur) : reporté — composant lourd (physique pointer 60fps) ; nécessite aussi la
  persistance blocs (pas de table → localStorage). À traiter dans un prompt dédié.
- Couleurs : tokens pour les neutres (rendu sombre), `SPORT_COLORS` pour les teintes sport,
  `var(--primary)` pour le cyan (au lieu de `#22d3ee` light-only).

## Contraintes
TS strict, aucun `any`. Max 200 lignes/fichier. Aucune migration. Ne pas toucher
`strava.ts`. createPortal. Aucun emoji. **Commit local. NE PAS PUSH.**
