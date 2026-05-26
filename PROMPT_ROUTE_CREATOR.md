# PROMPT — Route Creator

## Objectif
Créateur de parcours interactif intégré à la page record.
Clique sur la carte → snap ORS → profil altimétrique → sauvegarde Supabase.

## Variables d'environnement
NEXT_PUBLIC_MAPTILER_KEY= (maptiler.com/cloud)
NEXT_PUBLIC_ORS_KEY= (openrouteservice.org — 2500 req/jour gratuit)

## SQL migration
```sql
CREATE TABLE IF NOT EXISTS routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  sport text not null,
  is_public boolean default false,
  distance_m numeric(10,2),
  elevation_gain_m numeric(8,2),
  elevation_loss_m numeric(8,2),
  waypoints jsonb not null default '[]',
  snapped_points jsonb default '[]',
  elevation_profile jsonb default '[]',
  surfaces jsonb default '[]',
  created_at timestamptz default now()
);
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public routes readable by all" ON routes
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own routes" ON routes
  FOR ALL USING (auth.uid() = user_id);
```

## Architecture
- RouteCreator.tsx (createPortal, plein écran) — 2 vues : creating | library
- ElevationChart.tsx — SVG raw avec scrubbing tactile
- RouteSaveForm.tsx — bottom sheet nom + visibilité
- RouteLibrary.tsx — liste + miniatures MapTiler Static Maps
- lib/openrouteservice.ts — snap via ORS directions API
- lib/gpxParser.ts — parse trkpt + calcul D+/distance

## Flux
record/page.tsx → Parcours button → RouteCreator (portal)
Library → "Utiliser" → snapped_points → MapBackground.trackPoints
