# PROMPT — Muscu/Hyrox Fix (5 corrections)

## FIX 1 — Thème : supprimer le fond noir forcé
Dans WorkoutLauncher.tsx et tous les composants muscu/hyrox,
supprimer tout fond noir forcé (#1A1A1A, #0A0A0A, bg-black).
Remplacer par les variables du thème de l'app :
- Fond : var(--bg-card)
- Texte : var(--text)
- Séparateurs : var(--border)
- Cards : var(--bg-card2)

## FIX 2 — Supprimer tous les emojis
Chercher et supprimer tous les emojis dans les fichiers
WorkoutLauncher.tsx, WorkoutSession.tsx et tous les composants
dans /components/record/workout/.
Les remplacer par du texte simple ou des SVG.

## FIX 3 — Bug d'ouverture/fermeture instantanée
Ajouter le pattern mounted dans WorkoutLauncher et WorkoutSession :
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
```

## FIX 4 — Nouvelle structure WorkoutLauncher (3 sections)
Table : planned_sessions — colonnes : id, sport, title, week_start, day_index, blocks
Section 1 "TRAINING PLANNING" : séances de la semaine courante (week_start = lundi)
Section 2 "TRAINING SESSION" : toutes les séances sans filtre date
Section 3 "NO TRAINING" : card "Créer une séance" + card "Lancer sans programme"
"Créer" → onStart([], undefined) → WorkoutSession vide, user ajoute via +
"Lancer" → onFreeMode(sport) → FreeModeScreen

## FIX 5 — FreeModeScreen.tsx
Plein écran via createPortal, mounted pattern.
Header : ← gauche, titre sport centré, ⚙ droite.
Zone centrale : chrono 72px, HR + courbe mini, calories estimées.
Bottom : Pause/Reprendre + Terminer → SessionSaveForm.
Confirmation avant fermeture si session en cours.

## Fichiers modifiés
- PROMPT_MUSCU_HYROX_FIX.md
- src/components/record/WorkoutLauncher.tsx
- src/components/record/WorkoutSession.tsx
- src/components/record/workout/ (SeriesView, LapView, SupersetView, EMOMView, TabataView, RestTimer, ExerciseSearch)
- src/components/record/FreeModeScreen.tsx (nouveau)
- src/app/record/page.tsx (ajout onFreeMode + FreeModeScreen)
