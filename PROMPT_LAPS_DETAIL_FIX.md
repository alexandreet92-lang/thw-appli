# PROMPT_LAPS_DETAIL_FIX — Bascule complète vers LapsDetailView

## Étape 1 — Suppression de la sélection interne dans `LapsBikeChart`

### Supprimé
- `useState<number | null>(null) selectedLap / setSelectedLap` (l. 143 d'origine)
- Composant interne `LapDetailPanel` (~50 lignes, l. 87-136 d'origine)
- Rendu conditionnel `{selectedLap !== null && laps[selectedLap] && <LapDetailPanel ... />}` (l. 343-351)
- Toutes les références à `sel` dans la map des barres : `const sel = selectedLap === i`, `const stroke = sel ? ...`, `strokeWidth={sel ? 1 : 0}`, `fill={sel ? '#7C3AED' : 'var(--text-dim)'}`
- Helpers devenus inutilisés : `fmtDist`, `fmtSpeed`, `fmtVal` (utilisés uniquement par `LapDetailPanel`)

### Gardé
- Toute la logique de rendu du graphique : SVG, ticks Y/X, ligne moyenne pointillée, watts au-dessus de chaque barre
- `darken` (toujours utilisé pour le hover)
- `powerZoneColor` (couleur de fond des barres par zone FTP)
- `hoveredLap` state pour l'effet hover (pas lié à la sélection)
- L'invisible hit area sur toute la hauteur de chaque barre

### Ajouté — prop `onLapTap`
```ts
interface Props {
  activityId:   string
  cachedLaps?:  LapData[] | null
  avgWatts?:    number | null
  streams?:     { watts?: number[] | null } | null
  ftp?:         number | null
  onLapTap?:    (lapIndex: number) => void   // NOUVEAU
}
```

Handler câblé sur chaque `<g>` de barre :
```tsx
<g
  onClick={() => onLapTap?.(i)}
  onTouchEnd={() => onLapTap?.(i)}
  onMouseEnter={() => setHoveredLap(i)}
  onMouseLeave={() => setHoveredLap(null)}
  style={{ cursor: onLapTap ? 'pointer' : 'default' }}
>
```

Si `onLapTap` n'est pas fourni → rien ne se passe au tap (curseur `default`). **Aucun fallback vers l'ancien comportement.**

## Étape 2 — Suppression du préfixe "T"

Avant (l. 335) :
```tsx
<text … fontSize="10" fill={sel ? '#7C3AED' : 'var(--text-dim)'} …>T{i + 1}</text>
```

Après :
```tsx
<text … fontSize="10" fill="var(--text-dim)" …>{i + 1}</text>
```

Numéros nus `1, 2, 3, …` — cohérent avec `LapsDetailView` qui les affichait déjà ainsi.

## Étape 3 — Branchement dans `activities/page.tsx`

State déjà en place :
```ts
const [lapsViewOpen,    setLapsViewOpen]    = useState(false)
const [lapsViewInitial, setLapsViewInitial] = useState(0)
```

**2 call sites** de `LapsBikeChart` (mobile + desktop) ont reçu la callback :
```tsx
<LapsBikeChart
  activityId={a.id}
  cachedLaps={a.laps}
  avgWatts={a.avg_watts}
  streams={a.streams}
  ftp={bikeZoneRow?.ftp_watts ?? null}
  onLapTap={i => { setLapsViewInitial(i); setLapsViewOpen(true) }}
/>
```

Bouton "Voir tous les tours ›" (existant) ouvre avec lap 0 actif :
```tsx
<button onClick={() => { setLapsViewInitial(0); setLapsViewOpen(true) }}>
  Voir tous les tours ›
</button>
```

Mount unique de `<LapsDetailView />` à la fin de `ActivityDetail` (inchangé depuis le commit précédent).

## Étape 4 — Vérification des doublons

```bash
grep -rn --include="*.tsx" --include="*.ts" "selectedLap\|setSelectedLap\|LapDetailPanel" src/
```

Résultat :
- `src/components/activity/LapsBikeChart.tsx` → **0 match** (proprement nettoyé)
- `src/app/activities/page.tsx` → 4 matches l. 2421 / 2645 / 2806 / 2942 **dans le composant `SyncCharts` orphelin (dead code)** — `selectedLap` y désigne une variable interne pour l'overlay de laps dans une ancienne courbe SVG, **sans rapport** avec le détail des tours visé par ce prompt. SyncCharts n'est plus monté nulle part (cf. `PROMPT_SELECTEUR_ARCHEOLOGIE`). Conservé pour ne pas casser des futures réutilisations potentielles.

Le spec autorise explicitement : « Plus aucune référence … sauf si réutilisé pour une autre feature non liée ».

## Autres composants Laps — non touchés
- `LapsChart` (continuous time chart, overlay laps) — pas de selection interne
- `LapsTable` — vue tabulaire pour run/swim/gym (fallback de `LapsBikeChart`)
- `LapsDetailView` (nouvelle vue) — inchangée
- `LapsList` (dans `src/components/record/`) — page record builder, hors scope

## Vérification fonctionnelle
- ✅ `npm run build` exit 0
- ✅ Tap sur une barre → ouvre `LapsDetailView` centrée sur le lap tapé (`activeLap = i` via `initialActiveLap`)
- ✅ Bouton "Voir tous les tours ›" → ouvre `LapsDetailView` avec lap 0 actif
- ✅ Plus de carte inline `LapDetailPanel` sous le graphique
- ✅ Labels `1, 2, 3, …` sans préfixe "T"
- ✅ `LapDetailsSheet` (Niveau 2) toujours déclenché depuis la nouvelle vue par le bouton "Détails du tour X ›"
- ✅ Cleanup TS : helpers inutilisés supprimés (fmtDist, fmtSpeed, fmtVal)
- ✅ Mode jour/nuit fonctionnent (palettes déjà adaptatives dans LapsDetailView)
