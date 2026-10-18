Écrire dans PROMPT_TESTS_PERSO.md à la racine, puis implémenter.

# Tests personnalisés (privés) — Decaform / historique

Objectif : l'utilisateur crée ses propres tests (épreuves, unités, repère, objectif), passe des tests et suit sa progression. PRIVÉ : jamais publié, jamais comparé aux autres, jamais mélangé au score Decaform.

## Fichiers
- supabase/migrations/20261019_cadences_custom_tests.sql : tables cadences_custom_tests (items JSONB) et cadences_custom_runs (values_json JSONB), RLS propriétaire. À coller dans le SQL Editor Supabase.
- src/app/api/cadences/custom/route.ts : GET (liste), POST create_test / add_run, DELETE ?kind=test|run&id=. Tolérant si tables absentes ({available:false}).
- public/site/components/cadences/CadencesCustom.jsx : window.CadCustom (liste, création avec modèles, passage, historique). Monté dans CadencesHistory.jsx après le tableau.

## Notation
0 → repère : 0..60 ; repère → objectif : 60..100 ; au-delà de l'objectif : 100. Modes : values (sans note), per_item (moyenne), weighted (moyenne pondérée).

## Règles
Aucun emoji. Sobre. Jamais de barème par âge/sexe pour ces tests. Ne pas toucher au score Decaform.
