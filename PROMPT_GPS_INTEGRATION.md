# PROMPT_GPS_INTEGRATION

## Objectif
Intégration GPS complète dans l'écran de compteur vélo : statut riche, indicateur visuel, écran de refus, wake lock, centrage carte en temps réel.

---

## FIX 1 — Réécriture de `useGPSTracking`

Fichier : `src/hooks/useGPSTracking.ts`

### GPSStatus enum
```ts
export enum GPSStatus {
  idle        = 'idle',
  requesting  = 'requesting',
  acquiring   = 'acquiring',
  good        = 'good',       // accuracy < 20m
  approximate = 'approximate',// accuracy 20–50m
  poor        = 'poor',       // accuracy > 50m
  denied      = 'denied',     // permission refusée
  unavailable = 'unavailable',// pas de géolocalisation
  error       = 'error',
}
```

### GPSState interface
```ts
export interface GPSState {
  status: GPSStatus
  accuracy: number | null
  points: GPSPoint[]
  currentSpeed: number
  maxSpeed: number
  distance: number
  elevationGain: number
  currentAltitude: number | null
  gradient: number
  currentLat: number | null
  currentLng: number | null
}
```

### Nouvelle signature
```ts
export function useGPSTracking(isActive: boolean): {
  gps: GPSState
  stopWatching: () => void
  resetTracking: () => void
}
```

### Logique
- Démarre watchPosition dès `isActive=true`, status passe à `requesting` puis `acquiring`
- Sur chaque position reçue : accuracy < 20 → `good`, 20–50 → `approximate`, > 50 → `poor`
- Filtre de distance : n'ajoute le point que si distance > 0.5m ET < 200m depuis le dernier point
- Calcul gradient = (deltaAlt / distH) * 100 sur les 2 derniers points
- `stopWatching` : clearWatch + ne remet pas à zéro les données accumulées
- `resetTracking` : remet points/distance/elevationGain/maxSpeed à 0 (appelé au démarrage de session)

---

## FIX 2 — Hook `useWakeLock`

Nouveau fichier : `src/hooks/useWakeLock.ts`

```ts
export function useWakeLock(active: boolean): void
```

- Utilise `navigator.wakeLock.request('screen')` quand `active = true`
- Libère le lock quand `active = false`
- Reacquiert le lock sur `visibilitychange` (navigateur peut le libérer automatiquement)
- Pas d'erreur si l'API n'est pas disponible (try/catch silencieux)

---

## FIX 3 — Composant `GPSIndicator`

Nouveau fichier : `src/components/record/GPSIndicator.tsx`

Props :
```ts
{ status: GPSStatus; accuracy: number | null; isDark?: boolean }
```

Rendu :
- Un point coloré (6×6px, borderRadius 50%) + label textuel à droite
- Animation `gps-blink` CSS sur le dot quand status = `requesting` ou `acquiring`
- Couleurs : `good` → #10B981, `approximate` → #F59E0B, `poor` | `error` → #EF4444, `denied` → #EF4444, `requesting` | `acquiring` → #06B6D4, `idle` → gris
- Label : "Bon signal (±Xm)" / "Signal approximatif (±Xm)" / "Signal faible (±Xm)" / "Connexion…" / "GPS refusé" / "GPS indisponible"
- Compact : hauteur ~24px, font 11px

---

## FIX 4 — Composant `GPSPermissionScreen`

Nouveau fichier : `src/components/record/GPSPermissionScreen.tsx`

Overlay plein écran (zIndex 10010) affiché quand status = `denied` :
- Icône GPS SVG (48px)
- Titre : "Accès GPS refusé"
- Message explicatif + instructions iOS (Réglages > Safari > Position)
- Bouton "Recharger la page" → `window.location.reload()`
- Respecte `isDark` pour les couleurs

---

## FIX 5 — Mise à jour `CyclingControls`

Fichier : `src/components/record/CyclingControls.tsx`

Changements props :
- Remplacer `gpsReady: boolean` par `gpsStatus: GPSStatus` + `gpsAccuracy: number | null`

Logique bouton start :
```ts
const canStart = gpsStatus === GPSStatus.good || gpsStatus === GPSStatus.approximate
const gpsLoading = gpsStatus === GPSStatus.requesting || gpsStatus === GPSStatus.acquiring
```

Bouton start :
- `disabled={!canStart}`, opacity 0.5 si `!canStart && !gpsLoading`
- Si `gpsLoading` : spinner SVG animé (border rotating) au lieu de l'icône play
- Si `canStart` : icône play normale

Au-dessus des boutons (phase === 'ready') : afficher `<GPSIndicator>` centré

---

## FIX 6 — Mise à jour `CyclingScreen`

Fichier : `src/components/record/CyclingScreen.tsx`

- Passer `useGPSTracking(true)` (GPS toujours actif dès mount)
- Destructurer : `const { gps, stopWatching, resetTracking } = useGPSTracking(true)`
- Appeler `resetTracking()` dans `handleStart` avant de changer la phase
- Ajouter `useWakeLock(phase !== 'ready')` 
- Passer `gpsStatus={gps.status}` et `gpsAccuracy={gps.accuracy}` à CyclingControls
- Rendre `<GPSPermissionScreen>` quand `gps.status === GPSStatus.denied`
- `trackPoints` depuis `gps.points`

---

## FIX 7 — Mise à jour `MapBackground`

Fichier : `src/components/record/MapBackground.tsx`

- Ajouter prop `currentPosition?: [number, number] | null`
- Si `currentPosition` fourni, utiliser comme centre initial et pour FlyToPosition
- Supprimer le `getCurrentPosition` interne si `currentPosition` est fourni
- Garder le fallback `PARIS` si pas de position
- `<Marker>` sur `currentPosition` quand disponible

---

## Règle
- `npm run build` doit passer
- Merger sur `main`, pas de PR
