# PROMPT_TRAIL_INTERFACE

Interface complète des activités **trail** (course en montagne). Très proche du
running, focus fort sur le **dénivelé** : VAM, VAP, montées/descentes
catégorisées, donuts Altitude + Température (9 tranches).

## Convention de sport (réelle dans ce repo)
Le sport est stocké dans `activity.sport_type` (type `SportType` dans
`src/app/activities/page.tsx`). Le trail = **`sport_type === 'trail_run'`**
(label « Trail », couleur `#f97316`). Le trail est inclus dans `isRun`
(`['run','trail_run']`) → il hérite déjà de tout le traitement running
(allure, cadence spm, pas de watts, laps, comparaison d'allure). On ajoute
`isTrail = activity.sport_type === 'trail_run'` pour les extras trail.

> Le prompt d'origine supposait `activity.sport === 'trail'` et des composants
> `TrailHeroKPIs` / `PaceComparisonSection` / `ZoneDonut` / `customSeries`.
> Adaptation au code réel : KPIs inline (blocs EFFORT/CARDIO/TERRAIN),
> `ActivityCurves` (piste VAP ajoutée), `GapChart` (= comparaison allure/VAP),
> `DonutChart` (légende temps + %).

## Cibles
- `src/app/activities/page.tsx` (wiring, ActivityCurves, donuts, stats trail)
- `src/components/activity/ClimbDescentSection.tsx` (NOUVEAU : montées/descentes
  + bottom sheet de détail via `createPortal`)
- `src/components/activity/LapsDetailView.tsx` (déjà sport-aware)

## Parties
1. **Hero/EFFORT trail** : Distance, Allure moy., D+/D−, VAM (m/h).
   VAM = D+ total / temps en montée (gradient > 2 %). Masquée si 0.
2. **Stats Terrain trail** : lignes « Au-delà 2000 m » (highlight jaune),
   « Montées » (rouge), « Descentes » (bleu).
3. **Courbes (ActivityCurves)** : 6 métriques trail —
   Altitude / FC / Allure / **VAP** / Température / SPM. Toggles inchangés.
   VAP = vitesse ajustée par la pente (Minetti) affichée en allure.
4. **Comparaison Allure vs VAP** : `GapChart` (déjà rendu pour running+trail).
5. **Montées & Descentes** (NOUVEAU, trail only) : détection auto des segments
   (≥ 400 m de D+ continu, tolérance 50 m), catégorisation Cat 4→HC selon
   `D+ × pente`, graphique altitude à zones colorées, résumé, liste à onglets,
   bottom sheet détail (8 stats).
6. **Donuts** (3 col desktop / 1 col mobile) : FC zones, Altitude (7 tranches),
   Température (**9 tranches** dont < 0 °C et > 35 °C). Légende **temps + %**,
   tranches à 0 % masquées. Format temp 9 tranches appliqué à tous les sports.
7. **Branchement** dans `page.tsx` via `isTrail` / `isRun`.
8. **Responsive** mobile (< 768 px) + desktop, mode jour + nuit.

## Catégorisation
`points = elevation × avgGradePercent` → HC > 24000, 1 > 12000, 2 > 6000,
3 > 3000, sinon 4.

## Couleurs
Montées : Cat4 `#fca5a5`, 3 `#f87171`, 2 `#ef4444`, 1 `#dc2626`, HC `#991b1b`.
Descentes : Cat4 `#93c5fd`, 3 `#60a5fa`, 2 `#3b82f6`, 1 `#2563eb`, HC `#1e40af`.
Altitude (7) : 0-500 `#10b981`, 501-1000 `#84cc16`, 1001-1500 `#eab308`,
1501-1800 `#f97316`, 1801-2000 `#ef4444`, 2001-2500 `#7c2d12`, >2500 `#1e1b4b`.
Température (9) : <0 `#1e1b4b`, 0-5 `#312e81`, 5-10 `#1e40af`, 10-15 `#3b82f6`,
15-20 `#06b6d4`, 20-25 `#10b981`, 25-30 `#eab308`, 30-35 `#f97316`, >35 `#ef4444`.

## Règles
- Lire avant de modifier, réutiliser au maximum l'existant.
- Portals via `createPortal(node, document.body)`.
- Hitbox plein hauteur + `touch-action: manipulation` pour le tap mobile.
- Légende donuts : temps + %, tranches 0 % masquées.
- `npm run build` doit passer sans erreur.
