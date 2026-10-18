Écrire dans PROMPT_TESTS_ANALYSE.md à la racine, puis implémenter.

# Tests Decaform — analyse enrichie et historique interactif

Maquettes validées par Alex (18 oct. 2026) : analyse d'un test + historique v2.

## Périmètre
1. **Analyse d'un test** (`CadencesInterpret.jsx`, étend « Ton résultat, expliqué », règles pures, zéro IA) :
   - annonce animée de passage de niveau (si le niveau dépasse celui du test précédent) ;
   - « Comment progresser » : 3 actions classées par qualité à travailler + 1 qualité à entretenir + bouton vers `/planning` (« Créer mon plan d'entraînement ») ;
   - « Analyse approfondie » réservée à Decaform (≥ 20 épreuves) : équilibre force/endurance, paires de qualités liées (force/puissance, vitesse/explosivité, endurance/VO2max), épreuve la plus forte/faible, rythme depuis le test précédent et estimation du prochain niveau (toujours présentée comme estimation).
2. **Historique** (`CadencesExplorer.jsx`, nouveau, inséré en tête de `CadHistory`) :
   - courbe SVG raw : score global, une qualité ou une épreuve ; période 1/5/10/20/30 ans ou Tout ; Général / Ajusté à l'âge ;
   - date + âge + poids sous chaque point ; courbe du poids ; objectif ; projection (≥ 3 tests, régression sur les 5 derniers) ; événements personnels ;
   - KPIs animés, rappel « prochain test conseillé » (+6 mois), radar de comparaison de deux tests, lecture automatique, export CSV ;
   - clic sur un point → détail + lien vers l'analyse de ce test.
3. **Objectifs et événements** : table `cadences_marks` (migration `supabase/migrations/20261018_cadences_marks.sql`, À APPLIQUER PAR ALEX) + route `/api/cadences/marks` (GET/POST/DELETE, RLS, tolérante si la table n'existe pas : `{ available:false }` → fonctions masquées).

## Règles
- `main` uniquement, aucune librairie de chart, SVG raw, pas de `any`, pas de mock data en prod.
- Aucune comparaison « top X % » : pas de données de population réelles.
- Nouveaux textes en français (source de traduction) ; traductions EN/ES/IT/DE à ajouter ensuite dans le dictionnaire.

## Hors périmètre (à décider)
- Analyse rédigée par IA pour Decaform (coût en tokens) ; notification push du rappel de test.
