# Phase 5 — App packagée EN LOCAL (fluidité native, façon Strava)

Objectif : au lieu de charger `thw-appli.vercel.app` à distance dans la webview
(lent, 10-15 s au démarrage), l'app **embarque tous les écrans en local** →
démarrage instantané, navigation instantanée. Les données passent toujours par
l'API Vercel + Supabase.

## Ce qui est déjà en place (côté code, déployé)

- `scripts/build-cap.mjs` : produit `out/` = tous les écrans en statique
  (isole `/api`, `/admin`, `auth/callback`, middleware — qui restent sur Vercel).
- `next.config.js` : mode `CAP_BUILD=1` → export statique (sans toucher au build Vercel).
- `src/lib/native/apiFetch.ts` : en mode natif, les appels `/api/*` sont
  redirigés vers `NEXT_PUBLIC_API_BASE` (Vercel) + token Bearer ajouté.
- `src/lib/supabase/server.ts` : les routes API acceptent le token Bearer
  (cross-origin, car les cookies ne passent pas depuis `capacitor://`).
- Pages dynamiques (`[id]`, `[sport]`, `[slug]`) : wrapper serveur +
  `generateStaticParams` (marche pour Vercel ET l'export).

## Ce qui reste à faire sur le Mac (une fois, ~10 min)

### 1. `capacitor.config.ts` — charger le LOCAL au lieu du distant
Ouvre `capacitor.config.ts` (racine du projet) et remplace par :

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.thehybridway.app',
  appName: 'Hybrid',
  webDir: 'out',            // ← le bundle statique (généré par build:cap)
  // server: { url: ... }   ← SUPPRIMÉ : on ne charge plus le site à distance
}

export default config
```

### 2. Générer le bundle + le copier dans l'app iOS
Dans le Terminal, à la racine du projet :

```bash
npm install
NEXT_PUBLIC_SUPABASE_URL="https://sfrcnyzntgrxlwlmwifi.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<clé anon>" \
NEXT_PUBLIC_API_BASE="https://thw-appli.vercel.app" \
npm run build:cap
npx cap sync ios
```

(Ou plus simple si tu as un `.env.local` avec les 3 variables : `npm run cap:sync`.)

### 3. Rebuild dans Xcode
- Ouvre le projet dans Xcode → **▶ Run** sur ton iPhone.
- L'app démarre maintenant **en local** → instantané.

## À vérifier après le 1er lancement
- Connexion / session OK (le token Bearer part vers l'API Vercel).
- Les données se chargent (Supabase direct + API Vercel).
- OAuth Strava : le retour de connexion peut nécessiter un ajustement de
  redirect (capacitor://) — à traiter si besoin.

## Revenir en arrière (si problème)
Remets `server: { url: 'https://thw-appli.vercel.app' }` + `webDir: 'capacitor-shell'`
dans `capacitor.config.ts`, `npx cap sync ios`, rebuild → tu retrouves l'app
qui charge à distance (comportement d'avant).
