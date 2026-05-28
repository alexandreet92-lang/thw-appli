# PROMPT_TRAINING_FULL — Refonte complète page Training

## CONTEXTE

THW Coaching (Next.js 15, TS, Tailwind, Supabase).
Page : `/activities` (src/app/activities/page.tsx)
Nav : "Stats → Training" dans MobileTabBar

---

## RÉSULTATS D'EXPLORATION

| Sujet | Trouvé | Détail |
|-------|--------|--------|
| Garmin | ❌ Absent | Aucune intégration OAuth Garmin |
| Polar | ✅ v4 | `src/lib/sync/polar.ts` + `/api/sync/polar` POST |
| Polar mécanisme | Manuel (bouton) | Pas d'auto-sync au chargement |
| Hauteur nav mobile | 64px barre + safe-area | `paddingBottom: env(safe-area-inset-bottom)` dans MobileTabBar |
| Parse FIT/GPX | ✅ `/api/parse-activity-file` | Pur TS, sans dépendance externe |

---

## FIX GLOBAL — SAFE AREA iOS

- `layout.tsx` : `viewportFit: 'cover'` dans `generateViewport()`
- `globals.css` : `--safe-b: env(safe-area-inset-bottom, 0px)` dans `:root`
- `MobileTabBar` : déjà `paddingBottom: env(safe-area-inset-bottom)` ✓
- `layout.tsx` mobile main : déjà `calc(80px + env(safe-area-inset-bottom))` ✓

---

## TRAINING — HEADER

- Supprimer `background: T.surface` → `background: T.bg`
- Supprimer `borderBottom` et `boxShadow` du header sticky
- Supprimer bouton "Analyser" et tout le code IA (state, fonction, display)
- Remplacer `activities.length` par `totalCount ?? activities.length`
- Garder : titre "Training", bouton Strava, refresh, "?"

---

## PAGINATION

- `useActivities` remplacé : `PAGE_SIZE = 50`, `.range(from, to)`, `{ count: 'exact' }`
- Retour : `{ activities, totalCount, loading, loadingMore, hasMore, error, reload, loadMore, removeActivity }`
- `busyRef` pour éviter les doubles requêtes
- Sentinel div en bas de liste → IntersectionObserver → `loadMore()`

---

## POLAR AUTO-SYNC

- `useEffect` sur mount dans `TrainingPageInner`
- Cooldown 5 min (localStorage `polar_last_sync`)
- Appel `POST /api/sync/polar` en background
- Indicateur discret via `setSyncMsg('Polar…')`
- Si `exercises_synced > 0` → `reload()` + afficher compte
- Erreur → silence

---

## GARMIN (absent) → IMPORT FIT/GPX

- Bouton "Import" dans le header ouvre un `<input type="file" accept=".fit,.gpx">`
- `POST /api/parse-activity-file` avec FormData
- Retour `{ activity: ParsedActivity }` → mapper vers table `activities`
- Mapping : `name→title`, `date→started_at`, `duration_seconds→moving_time_s`, `distance_km*1000→distance_m`, etc.
- `provider: 'manual_import'`, `sport_type: 'other'` par défaut
- Toast "Activité importée" après insertion

---

## CTL/ATL/TSB — REDESIGN + BOTTOM SHEETS

- Container : gradient subtle cyan, `borderRadius: 20px`, padding aéré
- Valeurs : `fontSize: 32, fontWeight: 800`
- CTL color : `#00c8e0` | ATL color : orange si > 80, rouge sinon | TSB : vert si ≥ 0, rouge si < 0
- Bouton "?" par indicateur → ouvre `BottomSheet`
- `BottomSheet` : slide-up depuis le bas, `backdrop-filter: blur(20px)`, drag handle, icône info, texte mixed case

---

## FICHIERS MODIFIÉS

| Fichier | Changements |
|---------|------------|
| `src/app/layout.tsx` | `viewportFit: 'cover'` |
| `src/app/globals.css` | `--safe-b` dans `:root` |
| `src/app/activities/page.tsx` | Tout le reste |
