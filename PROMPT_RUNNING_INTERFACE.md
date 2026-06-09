# PROMPT_RUNNING_INTERFACE

Refonte de la fiche activité **running** alignée sur le pattern trail.

## Convention de sport (réelle)
`activity.sport_type` : running = **`'run'`**, trail = `'trail_run'` (inclus
dans `isRun`). Le prompt d'origine supposait `'running'` / des composants
`RunningHeroKPIs`, `DonutsSection`, `customSeries`, `lapsAuto/lapsManual` :
adaptation au code réel ci-dessous.

> ⚠️ Le modèle de données n'a qu'un seul tableau `laps: LapData[]` —
> **pas de `lapsAuto`/`lapsManual`**. Le toggle auto/manuel n'est donc pas
> branchable en l'état ; la section affiche l'unique jeu de tours. À rebrancher
> si la sync expose un jour les deux jeux.

## Cibles
- `src/app/activities/page.tsx`
- `src/components/activity/RunningLapsSection.tsx` (NOUVEAU : tours inline)
- `src/lib/utils/vap.ts` (NOUVEAU : VAP Minetti centralisée)
- `ActivityCurves` (piste VAP activée pour running)

## Parties livrées
1. **Layout** : la « Hero row (carte | stats) » existe déjà (carte à gauche,
   bloc stats à droite sur desktop ; empilé sur mobile).
2. **Hero KPIs (6 stats running)** : Distance / Allure moy. / D+ / FC moy. /
   TSS / **Allure ajustée (VAP)**.
3. **Stats** : blocs EFFORT/CARDIO/TERRAIN existants (sport-aware, sans watts en
   course) — pas de lignes trail (Au-delà 2000 m / Montées / Descentes).
4. **Courbes (ActivityCurves)** : 6 métriques running —
   Altitude / FC / Allure / **VAP** / Température / SPM. Toggles inchangés.
5. **Analyse automatique IA** : conservée telle quelle.
6. **Comparaison Allure réelle vs ajustée (VAP)** : `GapChart` (running + trail).
7. **Tours (laps) INLINE** : `RunningLapsSection` — barres vertes (hauteur ∝
   vitesse → allure, largeur ∝ durée), **profil FC en surimpression**, ligne
   d'allure moyenne pointillée, label d'allure au-dessus, n° de tour en dessous,
   puis **tableau** Tour/Km/Durée/Allure/FC moy/FC max/Cadence/Temp/**EF**
   (EF = vitesse m/s / FC). Allures rapides en vert, lentes en rouge, FC orange.
   **Pas de slide `LapsDetailView`** en course (supprimé) — tout est sur la fiche.
8. **Donuts** (3 col desktop / 1 col mobile, responsive) : FC zones / **Cadence
   SPM (6 tranches)** / Température (9 tranches). Légende **temps + %**,
   tranches 0 % masquées.

## VAP
Centralisée dans `src/lib/utils/vap.ts` (`computeVapKmh`, `gradeCostFactor`,
`avgAdjustedPaceMinKm`, `distanceFromVelocity`). Formule Minetti :
`cost = 1 + g·5.43 + g²·18.84`, bornée [0.5 ; 2.5]. Stockée en km/h
(géométrie « rapide = haut »), affichée en allure.

## Règles
- Réutilisation max (`ActivityCurves`, `GapChart`, `DonutChart`, jauges).
- `formatPace` (`src/lib/utils/pace.ts`), VAP (`src/lib/utils/vap.ts`).
- Couleurs sémantiques fixes (FC, Cadence, Température) ; reste en `var(--*)`.
- Donuts : temps + %, tranches 0 % masquées ; Température 9 tranches partout.
- `npm run build` doit passer.
