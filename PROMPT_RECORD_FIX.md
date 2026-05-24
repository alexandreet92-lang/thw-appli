# PROMPT RECORD FIX

## Diagnostic

Le crash "Application error: a client-side exception" sur `/record` vient d'un **Temporal Dead Zone error** dans `SportSelector.tsx` :

```ts
// Ligne 14-21
const SPORTS: Sport[] = [
  { id: 'cycling',  label: 'Vélo', icon: BikeIcon() },  // ← appel immédiat
  ...
]

// ... beaucoup plus bas ...

// Ligne 110+
const stroke = { stroke: 'currentColor', ... }

function BikeIcon() {
  return <svg>... {...stroke} ...</svg>  // ← lit stroke
}
```

Lors du chargement du module :
1. Function declarations hoisted → `BikeIcon` est accessible
2. Init `const SPORTS = [...]` exécute `BikeIcon()` → tente de lire `stroke`
3. `const stroke = {...}` n'est pas encore initialisé (TDZ)
4. **ReferenceError client-side** → crash de la page

Le build TypeScript/Next.js ne détecte pas les TDZ violations.

## Fix

Déplacer `const stroke = {...}` AVANT `const SPORTS = [...]`.

## Autres patterns SSR-unsafe audités

| Fichier | Audit | Statut |
|---|---|---|
| `page.tsx` | Pas de window/document/navigator top-level | ✓ OK |
| `MapBackground.tsx` | `L.divIcon` au top mais module dynamic-imported ssr:false | ✓ OK (côté client uniquement) |
| `MapBackground.tsx` | `navigator.geolocation` dans useEffect avec guard typeof | ✓ OK |
| `CyclingScreen.tsx` | `createPortal(…, document.body)` avec `mounted` state | ✓ OK |
| `CyclingScreen.tsx` | `new Date().getHours()` dans render — OK côté client | ✓ OK |
| `useGPSTracking.ts` | `navigator.geolocation` dans useEffect | ✓ OK |
| Dynamic imports | `MapBackground` + `CyclingScreen` en ssr:false | ✓ OK |

Seul bug réel : le TDZ dans SportSelector.

## Règles

- Merge direct sur main
- `npm run build` passera (build n'a jamais été le problème, c'est le runtime)
