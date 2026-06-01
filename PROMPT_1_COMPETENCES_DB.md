# Compétences — Structure base de données (étape 1/5)

## Objectif
Créer la structure DB Supabase + types TypeScript pour la fonctionnalité Compétences.
Aucune UI, aucun composant React, aucun changement visuel.

## Règle
Aucune table existante modifiée. Uniquement 2 nouvelles tables.

## Fichiers créés
1. `src/supabase/migrations/20260601000000_create_competences_tables.sql`
   - Table `competences` (id, nom, description_courte, bullets[], sports[], categorie, prompt_base, conflits[], is_predefined, created_by, timestamps)
     - CHECK sur `categorie` (8 valeurs) + CHECK `custom_competence_has_creator`
   - Table `user_competences` (user_id, competence_id, active, prompt_custom, activated_at, timestamps, UNIQUE(user_id, competence_id))
   - 6 index (GIN sports, categorie, is_predefined, created_by partiel, user_active partiel, user)
   - Fonction `update_updated_at_column()` (CREATE OR REPLACE — partagée) + 2 triggers
   - RLS activée sur les 2 tables
   - 5 policies sur `competences` (lecture publique prédéfinies, CRUD custom par créateur)
   - 1 policy sur `user_competences` (FOR ALL, propriétaire uniquement)

2. `src/types/competences.ts`
   - `Sport`, `CategorieCompetence`, `Competence`, `UserCompetence`, `CompetenceWithUserState`
   - `COMPETENCE_LIMITS` (free 0 / premium 3 / pro 7 / elite 20) + `PlanType`

## Application
Migration appliquée sur le projet Supabase via MCP `apply_migration`, puis vérifiée via `list_tables`.

## Convention projet
Le projet stocke ses migrations dans `src/supabase/migrations/` (workflow manuel/dashboard, pas de CLI `supabase db push`). Le fichier sert de référence versionnée.

## Hors périmètre (prompts suivants)
Pas d'insertion des 70 compétences, pas de page React, pas de modal, pas d'intégration coach IA.
