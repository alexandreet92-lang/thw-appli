# PROMPT_SWIMMING_SPORT

## Objectif
Natation = saisie manuelle uniquement. Pas de GPS, pas de capteurs, pas de carte.
L'athlète saisit ses données après ou pendant la séance (pauses).

## Architecture
- SwimmingForm.tsx — formulaire plein écran, slide depuis le bas
- SwimmingPoolSelector.tsx — chips taille bassin (sélection unique)
- SwimmingStrokeSelector.tsx — chips type de nage (SVG, sélection unique optionnelle)
- SwimmingIntervals.tsx — liste d'intervalles avec calcul vitesse /100m
- SwimmingSummary.tsx — résumé post-save, pas de carte
- SwimmingSettings.tsx — sheet simplifié (unités, après séance)

## Accès
record/page.tsx → sport='swim' → handleStart → setView('swimming') → SwimmingForm

## Migration SQL (workout_sessions)
```sql
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS pool_size text,
  ADD COLUMN IF NOT EXISTS swim_stroke text,
  ADD COLUMN IF NOT EXISTS swim_intervals jsonb,
  ADD COLUMN IF NOT EXISTS distance_unit text default 'm';
```

## Calculs
- calories = duration_seconds / 60 * 8 (≈ 8 kcal/min)
- avg_speed_kmh = (distance_m / duration_seconds) * 3.6
- pace /100m = (duration_seconds / distance_m) * 100 → MM:SS
- longueurs = distance_m / taille_bassin (si bassin piscine)

## Couleur accent : #06B6D4 (même que cycling)
