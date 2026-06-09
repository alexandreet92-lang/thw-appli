# PROMPT_SUPPRESSIONS_ZONES_FC

Suppressions ciblées sur les fiches activité, sans toucher au reste.

## INSPECTION
- Section **« Zones »** (jauges Z1-Z5 + toggle Jauges/Donuts via `ZonesSection`)
  rendue à **deux endroits** de `src/app/activities/page.tsx` :
  - mobile (sheet) ≈ l.7561 (`<Section title="Zones">` → Puissance/Allure/FC),
  - desktop ≈ l.8141 (bloc « ZONES »).
- Graphique **« Durée cumulée par FC »** = composant `HrCumulativeChart`
  (déf. l.1757), rendu :
  - mobile : bloc `{(isBike || isRun) && …}` avec toggle « Voir le graphique »,
  - desktop : via `showHrCum = (isBike || isRun) && …` dans le bloc
    « Distribution + Durée cumulée ».
- Donuts « Répartitions » = blocs séparés (`isRun`/`isBike`/…) + `DonutChart` —
  **non touchés**.

## MODIFICATIONS
1. **Section « Zones » supprimée** (mobile + desktop) → vaut pour running,
   cyclisme **et** trail (les blocs couvraient tous les sports). Remplacée par un
   commentaire ; espacement des sections conservé. La section « Répartitions »
   (donuts) reste **intacte**.
2. **« Durée cumulée par FC » retirée du running uniquement** :
   - mobile : condition `(isBike || isRun)` → **`isBike`**,
   - desktop : `showHrCum = (isBike || isRun) …` → **`isBike` …**.
   Le composant `HrCumulativeChart` **n'est pas supprimé** (toujours utilisé en
   cyclisme).

## VÉRIFICATION
- **Running** : ❌ section Zones, ❌ Durée cumulée par FC ; ✅ Répartitions (donuts).
- **Cyclisme** : ❌ section Zones ; ✅ Durée cumulée par FC conservée ; ✅ donuts.
- **Trail** : ❌ section Zones ; ✅ donuts + analyse montées/descentes intacts.
- `ZonesSection` n'est plus rendu (laissé défini, non supprimé pour éviter un
  retrait en cascade ; build/lint OK).
- Mode jour/nuit OK, pas de gap anormal, `npm run build` passe.
