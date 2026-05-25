# PROMPT_TRAINING_DELETE

## Objectif
Ajouter la suppression d'activité dans la page Training.

## Analyse préalable
- La liste d'activités est rendue dans `SectionAnalyse` (ligne ~2993)
- La table cible est `activities` (celle lue par la page)
- `useActivities` hook expose `activities` mais pas `setActivities`

## Implémentation

### 1. `useActivities` — ajouter `removeActivity(id)`
Exposer une fonction `removeActivity` qui filtre la liste en local.

### 2. `TrainingPage` — ToastProvider + handleDelete
- Wrapper ToastProvider autour de la page
- `handleDeleteActivity(id)` : delete dans `activities` + `removeActivity(id)` + toast

### 3. `SectionAnalyse` — prop `onDelete` + swipe + confirm inline
- Nouveau prop `onDelete?: (id: string) => void`
- State `swipedId` + `confirmDeleteId` + `touchStartX` ref
- Wrapper swipeable autour de chaque `ActivityRow`
- Fond rouge visible au swipe gauche (delta < -50)
- Section confirmation inline sous la card

### Suppression
Delete dans la table `activities` (pas workout_sessions — la page lit activities).

### Règle
- npm run build doit passer
- Merger sur main, pas de PR
