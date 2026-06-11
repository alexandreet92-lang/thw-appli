# PROMPT — Nutrition : frise 6 jours + repas (donut kcal, macros P/G/L, Photo IA)

> Évolutions de l'onglet « Aujourd'hui » de Nutrition. App clair ET sombre (dark de
> référence). Tokens (macros P/G/L = tokens dédiés). SVG/conic brut, aucune lib de chart.
> createPortal pour overlays. Fichiers < 200 lignes. Zéro mock.
>
> **Commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Frise des 6 derniers jours (haut de page)
6 jours (aujourd'hui à droite). Chaque jour : abréviation + anneau de complétion kcal
(part du target atteinte) avec la date au centre + petit % dessous. Jour actif = accent
`var(--primary)` (anneau + fond `var(--primary-dim)`). Clic → navigue vers ce jour ET le
contenu glisse latéralement (sens chronologique) + fondu ~0,3 s, `prefers-reduced-motion`
respecté. Données = totaux réels par jour (source existante). Jour sans données = anneau
vide, 0.

## B. Repas — donut kcal + jauges macros
Pour chaque repas (Petit-déjeuner, Collation matin, Déjeuner, Collation après-midi, Dîner,
Collation soir) : donut kcal (total au centre, chiffre neutre ; anneau = répartition par
macro) + 3 jauges en g : Protéines rouge, Glucides jaune, Lipides vert (chiffres neutres).
Repas vide → donut 0, jauges vides. Déplié : boutons Photo IA / Recherche / Manuel + liste
aliments. Couleurs macros = exception assumée sur donuts+jauges uniquement ; jamais sur les
chiffres ; pas étendues ailleurs.

## C. Photo IA
Phase 0 (lecture seule, documentée) : endpoint d'analyse d'image (vision) ? base CIQUAL ?
Si manque → le signaler, ne pas inventer.
Flux : Photo IA → image affichée à côté + donut qui se remplit pendant l'analyse (refs DOM,
60fps) → résultat rectifiable (description éditable + aliments avec quantités éditables g +
récap P/G/L+kcal recalculés via CIQUAL) → Annuler / Confirmer (var(--primary)). Si vision
indisponible → état clair « analyse indisponible », pas de valeurs inventées.

## Phase 0 (vérifié)
- **Vision** : `POST /api/analyze-meal-photo` existe (Claude vision) → { meal_name, items[{name,qty,unit,kcal}], totals{kcal,prot,gluc,lip}, confidence }. Utilisé en réel.
- **CIQUAL** : table `foods.source` prévoit 'ciqual' mais **aucune donnée CIQUAL seedée** ;
  source live = OpenFoodFacts. Pas de lookup CIQUAL fiable pour le recalcul → recalcul
  **proportionnel local** sur édition de quantité (et `/api/estimate-meal-macros` dispo si besoin).
- Repas : `useDailyMeals(date)` (table `nutrition_meal_logs`, plan_id NULL), totaux réels.

## Implémentation
- `MacroDonut.tsx` (SVG brut), `MealMacros.tsx` (donut + 3 jauges P/G/L), `DayStrip.tsx`
  + `useDaysTotals.ts` (frise), `PhotoMealEditor.tsx` (createPortal, analyse réelle).
- `page.tsx` : `today` devient le **jour sélectionné** (state) → repas/hydratation/séances/
  target suivent. `TodayTab` : frise en haut + slide (`prefers-reduced-motion`).
- `DayFoodJournal` : donut+jauges par repas (panneau déplié) + Photo IA via `PhotoMealEditor`.

## Checklist (cochée)
- [x] Frise 6 jours : anneaux de complétion **réels** (nutrition_meal_logs), jour actif
      accentué (`--primary`/`--primary-dim`), aujourd'hui à droite.
- [x] Changement de jour = slide latéral + fondu (sens chronologique), `prefers-reduced-motion`.
- [x] Repas : donut kcal (centre neutre, anneau réparti par macro) + 3 jauges P rouge /
      G jaune / L vert, chiffres neutres (tokens `--macro-*`).
- [x] Photo IA : image affichée + donut d'analyse animé, **description ET quantités
      rectifiables**, recalcul, Annuler / **Confirmer** (`--primary`). Analyse RÉELLE.
- [x] Phase 0 documentée ; si l'analyse échoue → état « analyse indisponible » (aucun mock).
- [x] Clair ET sombre (tokens themed).

### Réserves
- Donut + jauges s'affichent dans le **panneau déplié** du repas (UX repliable conservée ;
  l'en-tête replié garde le résumé kcal).
- Anneaux de la frise : la complétion compare chaque jour au **target du jour sélectionné**
  (todayKcalObj). Le target par-jour exact (plan.jours[date]) suit le jour sélectionné via
  l'état `today` ; pour les 6 anneaux simultanés, c'est le target courant qui sert de réf.
- Recalcul macros à l'édition de quantité = **proportionnel** (l'API ne renvoie pas les
  macros par aliment) ; l'analyse vision elle-même est réelle.

## Contraintes
TS strict, aucun `any`. Aucune migration. Ne pas toucher `strava.ts`. Couleurs via `var()`
(macros = tokens dédiés). SVG/conic brut. createPortal. `npm run build` passe. Aucun emoji.
Zéro mock. **Commit local. NE PAS PUSH.**
