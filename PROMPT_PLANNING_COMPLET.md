# PROMPT — Planning : implémentation exacte des maquettes validées

## Phase 0 — diagnostic (chemins réels)
1. **Page Planning** : `src/app/planning/page.tsx` (pas de route-group `(app)`).
2. **Volume par discipline** : `src/app/planning/components/VolumeByDiscipline.tsx`
   (rendu dans `WeekTab`, données réelles status/tss). NB : une vue plan-agrégat
   « Volume par sport » inline existe aussi (page.tsx ~3146, type `AiPlanSessionAgg`
   sans status/tss → une seule barre, laissée telle quelle).
3. **Training Bloc** : `TrainingBlockSummary.tsx` (résumé) + `TrainingBlockDetail.tsx`
   (détail) + `TypePicker.tsx` (picker) + store `src/app/planning/trainingBlocks.ts`.
4. **Helper durée** : `src/lib/utils.ts` → `formatDuration(minutes)` (toujours « Xh YY »,
   zéro décimale) + `formatHours(hours)`.

## Implémentation (alignement maquettes)
- `src/lib/constants/blocTypes.ts` : `BLOC_TYPES` (velo/running/hyrox/natation/muscu),
  réutilisé par `trainingBlocks.ts`.
- VolumeByDiscipline : VOL. + TSS, labels 36px, valeur « **réalisé** / cible » à droite.
- TrainingBlockSummary : carte bordée, lignes (point sport, nom 90px, chips qualités,
  N séances, S{cur}/{tot}, chevron ›), vide « Aucun bloc actif · + Créer un bloc ».
- TrainingBlockDetail : header (nom + pips 18×5 à droite « Semaine … cur/tot »), focus
  (chips `--primary-dim` + ✕, « + type »), entraînements (stepper pilule, lignes numérotées
  + dropdown ▾).
- TypePicker : lignes case à cocher (carré 18 + ✓), ajout custom, « Valider la sélection »
  plein `--primary`.

## Notes
- Couleurs via **tokens** (var(--text-dim), var(--border), var(--primary-dim)) et non les
  hex `#666`/`rgba(0,0,0,..)` des maquettes (qui sont light-only) — pour le rendu sombre.
- `formatDuration(hours)` des maquettes ↔ `formatHours(hours)` ici (le `formatDuration`
  existant prend des minutes, utilisé partout). Sortie identique « Xh YY ».

## Contraintes
TS strict, aucun `any`. Max 200 lignes/fichier. Aucune migration. Ne pas toucher
`strava.ts`. createPortal. Aucun emoji. Aucune lib de chart. **Commit local. NE PAS PUSH.**
