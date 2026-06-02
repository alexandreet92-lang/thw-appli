# Fix laps — mauvais store de token

## Cause racine (logs Vercel)
`/api/strava/activity-laps` renvoyait **503 "token Strava indisponible"**.
Il existe **deux stores de tokens** dans le projet :
- `@/lib/oauth/tokens` → `getValidToken(userId, 'strava')` lit **`oauth_tokens`**
  (nouveau store, refresh auto). **C'est celui qu'utilise la synchro** Strava
  (`src/lib/sync/strava.ts`) — donc le token de l'user y est.
- `@/lib/strava/tokens` → `getValidToken(userId)` lit **`strava_tokens`** (legacy,
  vide pour cet user). **C'est celui qu'utilisait activity-laps** → 503.

## Correctif (alignement sur la synchro)
La route `activity-laps` récupère le token EXACTEMENT comme la synchro et les
routes import-history/stats : `oauth_tokens` d'abord, **fallback legacy
`strava_tokens`**, sinon `not_connected`.

```ts
import { getValidToken } from '@/lib/oauth/tokens'
import { getValidToken as getLegacyToken } from '@/lib/strava/tokens'
let accessToken = await getValidToken(user.id, 'strava')      // oauth_tokens (+refresh)
if (!accessToken) { const legacy = await getLegacyToken(user.id); accessToken = legacy?.access_token ?? null }
if (!accessToken) return { error: 'not_connected' }           // message clair côté UI
```

Le refresh est géré par le store oauth (comme la synchro) → plus de divergence.

## ÉTAPE 4 — id d'activité
La route convertissait déjà l'UUID interne → `provider_id` (= **id Strava**,
stocké par la sync via `provider_id: String(a.id)`). On garde, + log
`console.log('[laps] strava_id résolu:', provider_id)`.

## UI
- `not_connected` → « Connecte Strava pour voir les tours » (au lieu d'un 503
  silencieux / "Aucun tour enregistré").
- autres erreurs → « Aucun tour enregistré » (cause loggée).

npm run build doit passer.
