# PROMPT_CYCLING_END_SESSION

## Objectif
Fin de session vélo : confirmation stop, sauvegarde en DB, écran de résumé 2 pages swipeable, upload Strava.

## PARTIE 1 — confirming_stop
- Étendre CyclingPhase à 'confirming_stop'
- STOP (paused) → passe à confirming_stop (ne sauvegarde pas encore)
- confirming_stop affiche REPRENDRE (→ running) + TERMINER (→ save + résumé)

## PARTIE 2 — Sauvegarde
- Écrire dans workout_sessions (GPS détaillé)
- Écrire dans activities (sport_type:'bike') pour la page historique
- Afficher le résumé même si la sauvegarde échoue

## PARTIE 3 — Résumé (SessionSummary)
- Plein écran, swipe horizontal, 2 pages
- Page 1 : 4 stats + SessionTraceMap + ElevationProfile (SVG raw)
- Page 2 : 12 métriques avancées 3 colonnes
- Header commun : date/heure, bouton Strava, bouton fermer

## PARTIE 4 — Upload Strava
- Route /api/strava/upload-activity (POST)
- Génère GPX depuis les points GPS
- Upload vers Strava API v3/uploads (requiert activity:write scope)
- Poll jusqu'à 10s pour récupérer l'activityId

## PARTIE 5 — Historique
- activities table (sport_type:'bike') = ce que lit la page Training
- Insert dans les 2 tables

## Fichiers
- src/types/session.ts (FinishedSession, SessionLap)
- src/components/record/SessionTraceMap.tsx
- src/components/record/ElevationProfile.tsx
- src/components/record/SessionSummaryPage1.tsx
- src/components/record/SessionSummaryPage2.tsx
- src/components/record/SessionSummary.tsx
- src/app/api/strava/upload-activity/route.ts
- Modifier CyclingControls + CyclingScreen
