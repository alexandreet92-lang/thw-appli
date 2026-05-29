# PROMPT_MAP_FIX — Diagnostic et correction de la carte GPS

## Diagnostic

### ✅ Vérification 1 — 'use client' et dynamic import
`ActivityMapCard.tsx` commence par `'use client'`.
`ActivityMapInner` est chargé via `dynamic({ ssr: false })`. ✓

### ✅ Vérification 2 — Hauteur explicite
`ActivityMapCard` passe `height: 220` (desktop) au conteneur.
`MapContainer` a `style={{ width: '100%', height: '100%' }}`. ✓

### ✅ Vérification 3 — CSS Leaflet importé
`import 'leaflet/dist/leaflet.css'` présent dans `ActivityMapInner.tsx`. ✓

### ❌ Vérification 4 — Données GPS manquantes (CAUSE RACINE)
Pour "Le Four" : `raw_data = {}` (vide).
Le sync Strava (`strava.ts`) ne sauvegarde pas `map.summary_polyline`.
La fonction `extractPoints()` retournait `null` → le composant retournait `null`.

## Fix appliqué

### 1. Migration DB
Ajout colonne `summary_polyline TEXT` dans la table `activities`.

### 2. Backfill "Le Four"
Polyline récupéré depuis Strava API (activité 18688236572) et sauvegardé
directement en DB. `length = 1264 chars` ✓

### 3. `ActivityMapCard.tsx` — extractPoints() mis à jour
Priorité de lecture :
1. `activity.summary_polyline` (nouvelle colonne dédiée)
2. `activity.snapped_points` (activités enregistrées dans l'app)
3. `activity.raw_data.map.summary_polyline` (imports complets)

### 4. `activities/page.tsx` — interface Activity
`summary_polyline: string | null` et `raw_data: Record<string, unknown> | null`
ajoutés explicitement à l'interface.

### 5. Webhook (`/api/strava/webhook/route.ts`)
`summary_polyline` sauvegardé lors de chaque nouvelle activité reçue via push.

### 6. Backfill endpoint (`/api/strava/sync-maps/route.ts`)
À appeler une fois après déploiement pour peupler les activités existantes :
  `GET https://thw-appli.vercel.app/api/strava/sync-maps`

## Résultat
La carte GPS s'affiche pour "Le Four" et toutes les activités Strava
ayant un tracé GPS. La colonne `summary_polyline` est la source de vérité.
