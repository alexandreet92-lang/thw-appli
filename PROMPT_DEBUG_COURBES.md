# PROMPT_DEBUG_COURBES — Diagnostic courbes Vitesse et Température

## Cause identifiée
**Divergence de clé JSON entre les deux chemins de sync :**

### src/lib/sync/strava.ts (sync bulk — toutes les activités)
```ts
if (data.velocity_smooth)  streams.velocity_smooth  = data.velocity_smooth.data
// ↑ stocke la clé "velocity_smooth" dans le JSON streams
```

### src/lib/strava/streams.ts (lazy-load au clic détail)
```ts
case 'velocity_smooth':   result.velocity  = stream.data; break
// ↑ mappe vers "velocity"
```

### src/app/activities/page.tsx (lecture)
```ts
const velocity = s.velocity ? smooth(s.velocity) : null
// ↑ lit "velocity" → null pour les activités syncées en bulk
```

**Résultat** : toutes les activités syncées via le sync bulk ont
`streams.velocity_smooth` (jamais lu) — la courbe ne s'affiche pas.
Les activités ouvertes en lazy-load ont `streams.velocity` — OK.

## Corrections appliquées

### 1. strava.ts — stocker sous la clé "velocity" (future data)
```ts
if (data.velocity_smooth)  streams.velocity  = data.velocity_smooth.data
```

### 2. page.tsx — StreamData : ajouter velocity_smooth en fallback
```ts
velocity_smooth?:  number[]
```

### 3. page.tsx — SyncCharts : lire les deux clés
```ts
const velRaw = s.velocity ?? s.velocity_smooth ?? null
const velocity = velRaw ? smooth(velRaw) : null
```

## Confirmation
- Courbe Vitesse visible : OUI (après fix)
- Courbe Température : dépend de streams.temp (données Strava optionnelles)
