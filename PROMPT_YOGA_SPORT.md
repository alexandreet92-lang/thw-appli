# PROMPT_YOGA_SPORT

## Objectif
Ajouter le sport Yoga/Mobilité avec :
- Bibliothèque d'exercices dans une table Supabase dédiée (yoga_exercises)
- Lanceur YogaLauncher (bottom sheet) depuis SportSelector
- Créateur de séance YogaSessionBuilder (plein écran)
- Sélecteur d'exercices YogaExercisePicker (bottom sheet)
- Écran de séance YogaSession avec chrono circulaire, transitions repos, conseils IA
- Composant AICoachingTip (appel API Anthropic claude-haiku-4-5)
- Route API /api/yoga-tip
- Réglages YogaSettings (thème + conseils IA + après séance)

## Fichiers créés
- src/types/yoga.ts
- src/hooks/useYogaSession.ts
- src/components/record/AICoachingTip.tsx
- src/components/record/YogaSettings.tsx
- src/components/record/YogaExercisePicker.tsx
- src/components/record/YogaSessionBuilder.tsx
- src/components/record/YogaLauncher.tsx
- src/components/record/YogaSession.tsx
- src/app/api/yoga-tip/route.ts
- src/supabase/migrations/add_yoga_exercises.sql

## Fichiers modifiés
- src/components/record/SportSelector.tsx — ajout sport 'yoga'
- src/components/record/SessionSaveForm.tsx — YOGA_TYPES si sport === 'yoga'
- src/app/record/page.tsx — intégration flux yoga

## Exercices par défaut
21 exercices répartis en 5 catégories : flexibility, mobility, strength, breathing, balance.
Insérés au premier lancement si la table est vide (is_custom=false, user_id=NULL).

## Architecture de l'écran de séance
- Phase 'idle' → démarre sur "Démarrer"
- Phase 'exercise' → compte à rebours circulaire (conic-gradient)
- Phase 'rest' → 10s de repos avec nom exercice suivant
- Phase 'finished' → SessionSaveForm (sport='yoga')
- Contrôles : Passer / Pause-Reprendre / +30s
- Conseils IA : appel /api/yoga-tip au démarrage de chaque exercice (toggle désactivable)
