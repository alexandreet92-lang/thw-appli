# Nutrition Smart — 3 fonctionnalités d'intelligence

## FEATURE 6 — Repas récents suggérés (priorité 1)
Section "Récemment consommé" dans le modal repas (onglet Manuel),
avant la zone de recherche. Chips scroll horizontal cliquables.
Query : `nutrition_meal_logs` WHERE `meal_slot = slot` AND `plan_id IS NULL`
Déduplique par meal_name, limite 4. `prefillFromRecent` init les ingredients.

## FEATURE 12 — Score de qualité nutritionnelle
Calcul purement client. Dot coloré 8px top-right des cartes repas remplies.
- good  #10B981 : prot >= 20% kcal ET lip <= 45% kcal
- medium #F59E0B : autres cas
- poor  #EF4444 : prot < 10% kcal OU lip > 60% kcal
Tooltip au hover/press-long.

## FEATURE 5 — Bilan hebdomadaire IA
Route POST /api/nutrition-weekly-summary (MODELS.fast = haiku).
Composant WeeklySummary.tsx dans l'Historique (vue 7j uniquement).
Bouton "Générer le bilan" → loading skeleton → texte Claude 4-5 phrases.
Pas de sauvegarde en base.

## Fichiers
- FoodSuggestions.tsx (< 80 lignes)
- MealScoreDot.tsx (< 40 lignes)
- /api/nutrition-weekly-summary/route.ts
- WeeklySummary.tsx
- MealModalManual.tsx — init ingredients depuis seed
- MealModal.tsx — ajouter FoodSuggestions
- MealSlotGrid.tsx — ajouter MealScoreDot
- page.tsx — ajouter WeeklySummary

## Règles
- Aucun emoji
- npm run build doit passer
- TypeScript strict — pas de any
