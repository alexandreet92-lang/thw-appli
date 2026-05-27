# PROMPT_SEGMENTS — Système de Segments GPS

## Objectif
Permettre aux utilisateurs de créer des segments GPS (tronçons de parcours), de les détecter automatiquement pendant une session, et d'afficher les performances et classements.

## Fonctionnalités

### 1. Création de segment dans RouteCreator
- Toggle "Parcours / Segment" dans le header de RouteCreator
- En mode Segment : skip ORS snap, calcul haversine direct entre waypoints
- Sauvegarde dans la table `segments` (pas `routes`)
- Ouverture d'un SegmentSaveForm au lieu de RouteSaveForm

### 2. Détection en temps réel (useSegmentDetection)
- Chargement des segments proches (<10km) au démarrage GPS
- Détection entrée dans rayon start (<30m) → début effort
- Détection arrivée end (<30m) après passage start → fin effort
- Sauvegarde automatique dans `segment_efforts`
- Retourne : activeEffort (en cours), completedEfforts (terminés)

### 3. Bandeau effort actif
- Affiché dans CyclingScreen/RunningScreen/TrailScreen quand activeEffort != null
- Nom du segment + chrono en cours

### 4. Résumé de session
- SessionSummary : section "Segments" si completedEfforts non vide
- Carte compacte par effort : nom, temps, distance

### 5. Pages Segment
- SegmentSaveForm : name, sport, is_public toggle
- SegmentLeaderboard : classement des meilleurs temps
- SegmentHistory : évolution personnelle (SVG raw)
- SegmentDetail : page complète avec carte, leaderboard, historique

## Tables SQL

```sql
CREATE TABLE segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  sport text NOT NULL DEFAULT 'cycling',
  is_public boolean DEFAULT false,
  points jsonb NOT NULL DEFAULT '[]',
  distance_m float8 DEFAULT 0,
  elevation_gain_m float8 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE segment_efforts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid REFERENCES segments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  activity_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL,
  distance_m float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);
```
