# PROMPT_OFFLINE_MODE — Mode hors ligne

## Objectif
Permettre à l'athlète de continuer à enregistrer sa séance sans réseau (montagne, zone blanche) et synchroniser automatiquement quand le réseau revient.

## Fonctionnalités

1. **Service Worker / PWA** — next-pwa pour cache map tiles (CacheFirst 7j) + NetworkFirst Supabase
2. **Détection réseau** — hook useNetworkStatus (navigator.onLine + events online/offline)
3. **Stockage local** — lib/offlineStorage.ts avec localStorage `pending_sessions`
4. **Sync automatique** — lib/syncPendingSessions.ts, appelé au retour en ligne + au mount du layout
5. **Indicateur visuel** — bandeau rouge discret en haut de l'app quand hors ligne
6. **Intégration screens** — CyclingScreen, RunningScreen, TrailScreen : save offline si !navigator.onLine

## Fichiers

- `next.config.js` — withPWA (@ducanh2912/next-pwa, compatible Next.js 16)
- `public/manifest.json` — manifest PWA
- `src/hooks/useNetworkStatus.ts`
- `src/lib/offlineStorage.ts`
- `src/lib/syncPendingSessions.ts`
- `src/components/shared/OfflineIndicator.tsx` — client component
- `src/app/layout.tsx` — ajouter OfflineIndicator + SyncOnMount
- `src/components/record/CyclingScreen.tsx` — save offline
- `src/components/record/RunningScreen.tsx` — save offline
- `src/components/record/TrailScreen.tsx` — save offline
