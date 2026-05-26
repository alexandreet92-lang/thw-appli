# PROMPT — Muscu + Hyrox (WorkoutSession engine)

## Audit préalable (résultats)

- **Table séances planifiées** : `planned_sessions` (champ `sport` = 'gym' | 'hyrox', champ `blocks` JSONB)
- **Table résultats** : `workout_sessions` (id, user_id, sport, duration_seconds, calories, status, title, training_types, rpe, comment)
- **Pas de table exercises** : les exercices sont en mémoire dans session/page.tsx (MusculaireSession, HyroxSession)
- **Modes de circuit** : series | circuit | superset | emom | tabata (depuis Block.mode dans planned_sessions)

## Architecture

WorkoutLauncher (bottom sheet) → WorkoutSession (plein écran createPortal)
WorkoutSession délègue le rendu à workout/SeriesView, LapView, SupersetView, EMOMView, TabataView
RestTimer entre chaque série.
Fin de séance → SessionSaveForm existant → SessionSummary adapté.

## Types partagés (src/types/workout.ts)

WorkoutExercise { id, name, mode, sets, reps, weightKg, restSec, durationSec?,
  circuitRounds?, circuitRestSec?, circuitExercises?,
  supersetPartnerId?, emomMinutes?, tabataRounds?, tabataWorkSec?, tabataRestSec? }

CompletedSet { exerciseId, setIndex, reps, weightKg, completedAt }

## Sauvegarde

Table workout_sessions existante.
Champs supplémentaires à ajouter (migration SQL) :
  ADD COLUMN IF NOT EXISTS exercises_detail jsonb
  ADD COLUMN IF NOT EXISTS total_volume_kg numeric
  ADD COLUMN IF NOT EXISTS sets_completed integer

## SQL migration

```sql
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS exercises_detail jsonb,
  ADD COLUMN IF NOT EXISTS total_volume_kg numeric(8,1),
  ADD COLUMN IF NOT EXISTS sets_completed integer;
```

## Fichiers créés

- src/types/workout.ts
- src/components/record/WorkoutLauncher.tsx
- src/components/record/WorkoutSession.tsx
- src/components/record/WorkoutSettings.tsx
- src/components/record/workout/SeriesView.tsx
- src/components/record/workout/LapView.tsx
- src/components/record/workout/SupersetView.tsx
- src/components/record/workout/EMOMView.tsx
- src/components/record/workout/TabataView.tsx
- src/components/record/workout/RestTimer.tsx
- src/components/record/workout/HRMiniChart.tsx
- src/components/record/workout/ExerciseSearch.tsx

## Fichiers modifiés

- src/app/record/page.tsx (routing gym/hyrox)
- src/components/record/SessionSaveForm.tsx (STRENGTH_TYPES, HYROX_TYPES)
- src/components/record/SessionSummaryPage1.tsx (no map for gym/hyrox)
