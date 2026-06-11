# PROMPT — Planning : format horaire + jauge TSS + Training Bloc (complément)

> LIRE `docs/DESIGN_SYSTEM.md`. Ne pas toucher au thème/couleurs de fond. Fichiers < 200
> lignes. SVG/CSS brut, aucune lib de chart. createPortal pour bottom-sheet/modal.
> **Commit local. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Format horaire (sweep global Planning)
`formatDuration(hours: number): string` → « Xh YY » (1.5→1h30, 1.667→1h40, 0.5→0h30,
6.8→6h48, 0→0h00). Appliquer partout sur Planning : métriques, Volume par discipline,
cartes de séance, tooltips. Zéro décimale.

## B. Volume par discipline — 2 barres (VOL. + TSS)
Par sport : barre VOL. (couleur sport, 6px) avec « réalisé / cible » en Xh YY, + barre TSS
(même couleur opacity 0.55, 6px) avec « réalisé / cible pts ». Labels VOL./TSS 10-11px
uppercase gris. TSS absent → « 0 / -- pts ». Valeurs réelles.

## C. Training Bloc (complément du lot précédent)
- C1 résumé : tous les sports avec bloc actif (point sport, nom 600/min-90, chips qualités
  arrondies, « N séances » chiffre foncé, « SX/Y », chevron ›). Vide → « Aucun bloc actif
  · + Créer un bloc ». Clic ligne → détail.
- C2 détail : pips **rectangles 18×5** (passées+courante = `--primary`, à venir gris),
  « SX/Y ». Focus multi-select (chips ✕ + « + type »). Stepper séances. Type par séance =
  dropdown → picker single.
- C3 picker : multi (focus) / single (séance), `BLOC_TYPES` (velo/running/hyrox/natation/
  muscu), champ « Nouveau type… » + Ajouter (local/persisté), « Valider » plein `--primary`.

## Livré + checklist (honnête)
- [x] **A** : `formatDuration` (lib/utils) renvoie maintenant **toujours « Xh YY »**
  (0h30/1h40/3h00/0h00) → tous les affichages Planning qui l'utilisent sont conformes,
  zéro décimale. Variante `formatHours(hours)` ajoutée (1.5→1h30).
- [x] **B** : `VolumeByDiscipline` (2 barres VOL.+TSS, réalisé/cible **réels** : `status==='done'`
  = réalisé, `tss` = source existante, « 0 / -- pts » si absent), rendu dans l'onglet
  **Semaine** (`WeekTab`) car c'est là que vivent les séances réelles avec `status`/`tss`.
  *Réserve* : la section « Volume par sport (plan complet) » reste à une barre — son type
  `AiPlanSessionAgg` n'a NI `status` NI `tss` (agrégat de plan), donc impossible d'y mettre
  du réalisé/TSS réel sans inventer. La jauge réelle est donc dans la vue Semaine.
- [x] **C1** : résumé Training Bloc (tous sports actifs, chips qualités, N séances, SX/Y,
  chevron ›). Vide → « Aucun bloc actif · + Créer un bloc ».
- [x] **C2** : détail — pips **rectangles 18×5** (passées+courante `--primary`, à venir gris),
  focus multi-select (chips ✕ + « + type »), stepper séances, type par séance (dropdown → picker single).
- [x] **C3** : picker multi/single, types par sport (`trainingBlocks.ts` = BLOC_TYPES des 5
  sports), ajout custom persisté. *Réserve* : bouton « Valider » en ligne (pas pleine largeur) — mineur.
- [x] Clic ligne résumé → détail du bon sport. [x] `npm run build` passe.
- Persistance blocs/types = localStorage (Phase 0 lot précédent : pas de table, zéro migration).

## Contraintes
TS strict, aucun `any`. Max 200 lignes/fichier. Aucune migration. Ne pas toucher
`strava.ts`. createPortal. Aucun emoji. Aucune lib de chart. **Commit local. NE PAS PUSH.**
