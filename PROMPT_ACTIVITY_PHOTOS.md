# PROMPT_ACTIVITY_PHOTOS — Photos d'activité

## Objectif
Permettre à l'utilisateur de prendre des photos pendant une session d'enregistrement, de les voir dans le résumé de session, et de les retrouver dans l'historique des activités.

## Fonctionnalités

### 1. Pendant l'enregistrement
- Bouton appareil photo flottant sur les écrans de recording (Cycling, Running, Trail, Hiking, MTB, Ski)
- Aperçu miniature 60×60px après prise de vue (auto-dismiss 3s)
- Les photos sont accumulées localement pendant la session
- Upload vers Supabase Storage APRÈS la sauvegarde (une fois le session_id connu)

### 2. Résumé de session
- Grille de photos (1/2/3 colonnes selon le nombre)
- Viewer plein écran avec fermeture

### 3. Historique activités
- Badge compteur de photos sur la carte activité (si photos disponibles)

## Architecture

### Stockage
- Supabase Storage bucket `activity-photos` (public)
- Table `activity_photos` : id, session_id, user_id, url, taken_at, lat, lng

### Compression
- Canvas-based : max 1200px, qualité 0.8 JPEG
- Côté client uniquement

### Pattern timing (upload différé)
- `PhotoButton` accumule les fichiers via `useRef` (pas d'état React)
- Expose `flushToSession(sessionId)` via `useImperativeHandle`
- L'écran parent appelle `photoRef.current?.flushToSession(savedId)` après insert workout_sessions

## Fichiers créés
- `src/supabase/migrations/add_activity_photos.sql`
- `src/lib/imageCompression.ts`
- `src/components/record/PhotoButton.tsx`
- `src/components/record/PhotoPreviewToast.tsx`
- `src/components/summary/ActivityPhotos.tsx`
- `src/components/summary/PhotoViewer.tsx`

## Fichiers modifiés
- CyclingScreen, RunningScreen, TrailScreen, HikingScreen, MTBScreen, SkiScreen
- SessionSummary (+ ActivityPhotos section)
