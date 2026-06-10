# PROMPT_PROGRESSION_AUDIT

Audit **lecture seule** de la fonctionnalité Progression (aucune modif code/DB,
pas de build, pas de migration). Livrable : `RAPPORT_PROGRESSION_AUDIT.md`.

Méthode : inspection système de fichiers (find/grep) + requêtes **SELECT** via
Supabase MCP sur le projet actif **thw-v2** (`sfrcnyzntgrxlwlmwifi` ; les projets
`thw-coaching` et `thw-coaching-db` sont INACTIVE/pausés).

Sections : 1 Routing · 2 `session_families` · 3 Données par sport · 4 Composants ·
5 Helpers · 6 Synthèse. Voir le rapport pour les résultats.
