# Compétences — Seed des 70 compétences prédéfinies (étape 2/5)

## Objectif
Insérer les 70 compétences prédéfinies (`is_predefined=TRUE`, `created_by=NULL`) puis remplir la matrice de conflits. Aucune UI, aucun React.

## Prérequis
Tables `competences` / `user_competences` créées (prompt 1). Vérifié : table vide avant seed.

## Fichiers créés
1. `src/supabase/migrations/20260601010000_seed_competences.sql`
   - `DELETE FROM competences WHERE is_predefined = TRUE;` en garde (idempotence)
   - 70 INSERT répartis par sport : Running (10), Trail (6), Cyclisme (7), Hyrox (4), Triathlon (7), Natation (6), Rowing (6), Muscu Force (7), Muscu Hypertrophie (5), Muscu Performance (4), Nutrition (5), Récupération (3)
   - Chaque compétence : nom, description_courte, bullets[3-4], sports[1], categorie, prompt_base (4 blocs Philosophie/Règles/Exclusions/Adaptations, 80-150 mots), is_predefined=TRUE
2. `src/supabase/migrations/20260601020000_competences_conflicts.sql`
   - UPDATE par sous-requêtes basées sur `nom` (pas d'ID hardcodé) pour remplir `conflits[]` selon la matrice fournie

## Application
Les deux migrations appliquées via MCP Supabase `apply_migration` sur le projet thw-v2.

## Vérification
- `SELECT COUNT(*) FROM competences WHERE is_predefined = TRUE` → 70
- Conflits remplis (matrice running/trail/cyclisme/triathlon/natation/rowing/muscu/nutrition)

## Hors périmètre
Pas de page React, pas de modal, pas d'intégration coach IA.
