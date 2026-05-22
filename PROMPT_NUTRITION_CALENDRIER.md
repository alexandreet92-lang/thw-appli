# Historique — Vue Calendrier mensuelle

## Objectif
4e vue dans l'Historique : "Calendrier". Affiche un calendrier mensuel
avec statut de chaque jour (objectif atteint / partiel / pas de données).

## Toggle
Nouveau bouton "Calendrier" dans les pills existants (7j / 2 semaines / 4 semaines / Calendrier).
Quand actif : masquer filtres et graphiques, afficher CalendarView.

## CalendarView.tsx (< 160 lignes)
- Navigation mois précédent / suivant (bloquer navigation future)
- Grille 7 colonnes (L M M J V S D)
- Chaque jour : dot coloré + nb kcal (abrégé si > 999)
- Statuts : complete (vert, >= 85% objectif), partial (ambre), none (gris)
- Anneau ring cyan si jour = aujourd'hui
- Clic jour -> setSelectedDate + scroll vers section Repas
- Légende : 3 pills sous la grille
- Fetch interne : nutrition_meal_logs (plan_id IS NULL) + nutrition_daily_logs
- Pas de date-fns : logique vanilla JS

## Règles
- CalendarView.tsx < 160 lignes
- Aucun emoji
- npm run build doit passer
- TypeScript strict — pas de any
