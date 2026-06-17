# PROMPT — Builder de blocs MUSCU & HYROX (mobile)

## PÉRIMÈTRE
MOBILE UNIQUEMENT. Suite de `PROMPT_SESSION_EDITOR_MOBILE.md`. On ajoute/affine
UNIQUEMENT le BUILDER DE BLOCS pour 2 sports : **Musculation** et **Hyrox**.
Réf : `maquette_blocs_muscu.html`, `maquette_blocs_hyrox.html`.

## CE QUI NE CHANGE PAS
Tout le haut de l'écran SessionEditor (header, sélecteur 7 sports, sous-discipline,
type, date/heure, effort perçu, durée, carte SM/SN, mini-stats, description, footer
flottant, tab bar masquée) reste identique. On ne travaille QUE sur la section
« Construction de la séance » quand le sport est Muscu ou Hyrox.

## DIFFÉRENCE CLÉ vs endurance
Muscu/Hyrox n'utilisent PAS le builder par zones/profil d'intensité. Structure =
GROUPES (échauffement / circuit / récup) → EXERCICES → champs séries/reps/charge.
Garder la notion de groupes/circuits existante.

## MUSCULATION
- Bandeau résumé (4 cases) : SN neuro · Volume (tonnage, t) · Durée estimée · nb d'exercices.
- Groupe « Séries » : en-tête type + nom éditable + ⋮.
- Exercices : #num · nom · TAG pattern coloré · ✕ ; champs Séries · Reps · Charge (kg) ·
  Repos (sec) ; Notes (option) ; filet gauche couleur du pattern.
- PATTERNS (couleurs tokens) : Push #f97316, Pull #3b82f6, Jambes #16a34a, Core #a855f7,
  Full body #64748b. Choisi par exercice ; filet + tag = couleur du pattern.
- Boutons « + Ajouter un exercice » (dans le groupe) + « + Ajouter un circuit ».

## HYROX
- Accent rouge #ef4444. Bandeau résumé : SM métab. · SN neuro · Temps cible · nb de stations.
- PRESETS 8 stations officielles en rangée scrollable (appui = ajoute la station) :
  SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Row, Farmers Carry, Sandbag Lunges,
  Wall Balls. + chip « + Libre » (exercice custom).
- Groupe « Circuit » : en-tête + nom + ⋮ + champ « Temps cible du circuit » (mm:ss).
- Exercice/station : #num · nom · tag (STATION/LIBRE) · ✕ ; champs Distance (m) · Charge (kg) ·
  Temps cible (s) · Repos (sec) ; un exercice LIBRE peut être une course → champ Allure
  (dérivée distance/temps). Course et stations dans le même circuit. Notes (option).
- « + Ajouter une station / exercice » + « + Ajouter un circuit ».

## DONNÉES / LOGIQUE
- Réutiliser le modèle existant (`ExerciseItem` : sets/reps/weightKg/distanceM/targetTimeSec/
  restSec/notes/category ; `ExoCircuit` : type/rounds/restBetweenRoundsSec/targetTimeSec).
  AUCUNE colonne ne manque : pattern = `category`, temps cible circuit = `targetTimeSec`.
  → PAS de migration. La sauvegarde passe par `exercisesToBlocks` (inchangée).
- SM/SN existant reste branché (Hyrox SM+SN, Muscu surtout SN).
- Autres sports (vélo/course/natation/row/ellip) non impactés.

## CONTRAINTES
- Mobile seulement, desktop intact. Variables CSS, pas de hex en composant (couleurs
  pattern = tokens). Pas d'emoji. Icônes Tabler. TS strict, pas de `any`.
  Max ~200 lignes/fichier → `StrengthBuilder.tsx`, `HyroxBuilder.tsx`, `ExerciseCard.tsx`,
  `strength.ts` (modèle/helpers partagés). `npm run build` lançable → vérifié.
