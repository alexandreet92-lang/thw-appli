# PROMPT RECORD V1

## Audit pré-implémentation

| Dépendance / fichier | État |
|---|---|
| `leaflet` + `@types/leaflet` | ✅ déjà dans `package.json` |
| `react-leaflet` | ❌ à installer |
| `src/supabase/migrations/` | ✅ existe |
| `/record/page.tsx` actuelle | "Bientôt disponible" — à remplacer |
| Toast système | Existe scoped nutrition (`useToast` + `ToastContainer`). Pour record, mini Toast local (3-4 places). |
| `/logo-Xbras.png` racine | N'existe pas (vrais chemins `/logos/logo_Xbras.png`). |

## Schéma Supabase

Le user demande de créer les tables `workout_sessions` et `sport_page_configs` avec RLS. La règle CLAUDE.md est : "Ne jamais toucher au schéma Supabase sans migration SQL explicite".

Je crée le fichier SQL dans `src/supabase/migrations/create_workout_sessions.sql` mais **ne l'applique pas en base** — l'utilisateur doit l'exécuter manuellement via le SQL editor Supabase ou un outil de migration. Tant que la table n'existe pas, le `INSERT` côté code échouera silencieusement (try/catch).

## Architecture

State machine dans `/record/page.tsx` :
- `view = 'home'` → map + 2 boutons (Démarrer / Créer parcours)
- `view = 'sport-select'` → modal bottom sheet par-dessus home
- `view = 'cycling'` → écran vélo plein écran

Le fait de garder une seule route `/record` évite des hops de navigation et préserve l'état GPS.

## Fichiers créés

| Fichier | Rôle | Cible lignes |
|---|---|---|
| `src/supabase/migrations/create_workout_sessions.sql` | Schéma DB | ~30 |
| `src/hooks/useGPSTracking.ts` | GPS + Haversine + D+ | ~95 |
| `src/hooks/useStopwatch.ts` | Compteur secondes + format | ~30 |
| `src/components/record/Toast.tsx` | Toast local minimal | ~50 |
| `src/components/record/MapBackground.tsx` | Carte Leaflet plein écran | ~95 |
| `src/components/record/SportSelector.tsx` | Bottom sheet 6 sports | ~140 |
| `src/components/record/CyclingScreen.tsx` | Écran vélo principal | ~180 |
| `src/components/record/CyclingDataPage.tsx` | 3 pages données swipable | ~135 |
| `src/components/record/CyclingControls.tsx` | Boutons Start/Pause/Lap/Finish | ~95 |
| `src/components/record/LapsList.tsx` | Tableau laps | ~55 |
| `src/app/record/page.tsx` | Remplacer le contenu | ~140 |

## Dépendance installée

```
npm install react-leaflet@4
```

(v4 compatible React 18+, dynamic import obligatoire en Next.js pour éviter SSR window).

## CSS Leaflet

Import `'leaflet/dist/leaflet.css'` dans `globals.css` pour les tuiles. Le marker GPS custom (cercle cyan + halo pulsant) via `divIcon` Leaflet, animation CSS dans `globals.css`.

## Limites connues

- **GPS HTTPS obligatoire** : `navigator.geolocation.watchPosition` ne marche qu'en HTTPS. Vercel prod OK, localhost http non. La page affiche "En attente du GPS…" si non dispo.
- **Sauvegarde Supabase non testable côté worktree** : env Supabase manquant côté worktree. Test prod uniquement.
- **Migration SQL non appliquée automatiquement** : doit être exécutée par l'user.

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
- Aucune modif des autres pages
