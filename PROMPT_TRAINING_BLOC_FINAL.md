# PROMPT — Training Bloc (final) : colonnes par sport + plage surlignée

## Phase 0 (diagnostic — confirmé)
1. Grille cartes (page) : `src/components/planning/BlocSummaryView.tsx`.
2. Surpage détail : `src/components/planning/BlocDetailOverlay.tsx`.
3. Sélecteur de date de départ : `src/components/planning/BlocStartWeekPicker.tsx` ;
   stepper de durée : dans `BlocDetailOverlay.tsx`.

## Correctif 1 — Vue page : une colonne par sport (carousel)
- `BlocSummaryView` réécrit : carousel horizontal (flèches ← → masquées si inutiles,
  pas de transform au-delà des bornes), une colonne (`flex:0 0 280px`) par sport
  (`BLOC_SPORT_KEYS`), translation par pas de 290px, largeur de viewport mesurée (resize).
- Nouveau `SportColumn.tsx` : en-tête sport + **Passés** (replié, max 10, récents d'abord) +
  **En cours** (ouvert) + **À venir** (replié) + bouton « Nouveau bloc » (création par sport).
- Nouveau `BlocCurrentCard.tsx` : carte EN COURS ouverte (badge « En cours » cyan, pips,
  plage, focus, séances déroulées). Passé/futur = cartes compactes pointillées (nom + plage),
  passé grisé (opacity .55). Toutes les cartes restent cliquables → surpage (interconnexion).
- Classification par dates réelles via `blocPhase` (robuste cross-année).

## Correctif 2 — Surpage : passés limités à 10
Les onglets blocs de la surpage = `pastAll.slice(0,10)` (récents d'abord) + en cours + à venir.
Indicateur discret « +N blocs archivés » si plus de 10 passés.

## Correctif 3 — Sélecteur durée : surbrillance de la plage complète
`BlocStartWeekPicker` reçoit `startKey` + `durationWeeks` : toutes les semaines de la plage
sont surlignées — extrémités cyan plein (`#22d3ee`/`#04141a`), milieu cyan translucide
(`rgba(34,211,238,.25)`), coins arrondis aux extrémités. Recalcul immédiat au changement de
départ ou de durée. La plage sous les pips utilise désormais `formatWeekEnd` (dimanche) →
« 8 jun → 5 juil ».

## Helpers ajoutés (`weekDates.ts`)
`formatWeekEnd(year, week)` et `blocPhase(startYear, startWeek, durationWeeks)`.

## Checklist
- [x] Une colonne par sport.
- [x] Bloc « En cours » ouvert par défaut.
- [x] « Passés » replié, max 10 affichés.
- [x] « À venir » replié.
- [x] Flèches ← → si dépassement, masquées sinon.
- [x] Surpage : passés limités à 10 + « +N archivés ».
- [x] Grille de dates : toute la plage surlignée (extrémités plein, milieu translucide).
- [x] Surbrillance + plage recalculées en temps réel (start/durée).
- [x] `npm run build` passe.

## Contraintes
TS strict, aucun `any`, fichiers < 200 lignes. **Commit local. NE PAS PUSH. Aucun Vercel.**
