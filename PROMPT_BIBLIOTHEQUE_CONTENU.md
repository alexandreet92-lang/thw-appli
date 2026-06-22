# PROMPT POUR CLAUDE CHAT — Contenu de la Bibliothèque (page Session)

> À copier-coller dans Claude Chat. C'est un **prompt de production de contenu**,
> pas un prompt de code. L'objectif : remplir la Bibliothèque de la page Session
> de THW Coaching, aujourd'hui à l'état « en préparation ».

---

## CONTEXTE

Je construis **THW Coaching**, une app de coaching sportif hybride (endurance +
force), benchmark UI/UX = **Strava + TrainingPeaks**. Sur la page **Session**, il
existe une **Bibliothèque** encore vide (« Bibliothèque en préparation »). On va
la remplir ensemble.

La Bibliothèque doit **séparer strictement deux notions distinctes** :

1. **EXERCICES** — un mouvement / atelier unique (ex : *Squat bulgare*, *Wall
   ball*, *Drill technique nage*). Chaque exercice est accompagné d'une
   **explication** : à quoi il sert, ce qu'il travaille, comment bien l'exécuter,
   les erreurs fréquentes.
2. **SÉANCES** — un entraînement complet, structuré en blocs (échauffement,
   corps de séance, retour au calme), avec un **objectif** clair (ex : *VMA
   10×400m*, *Sortie longue Z2*, *Sweet Spot 2×20min*).

Ne JAMAIS mélanger les deux. Un exercice n'est pas une séance.

---

## LES 7 SPORTS CONCERNÉS

La Bibliothèque couvre exactement ces sports (pas d'autre) :

1. **Muscu / Renfo** — circuits, séries, reps, charges
2. **Running** — blocs, intervalles, allure
3. **Vélo / Home trainer** — watts, zones, blocs
4. **Natation** — séries, distances, zones, 4 nages
5. **Hyrox** — ateliers, circuits, runs compromis
6. **Aviron** — blocs, seuil, distance, cadence (CPM)
7. **Triathlon** — brick, simulation, enchaînements

---

## RÈGLE DES SECTIONS (= BULLES) PAR OBJECTIF

Pour **Exercices** ET pour **Séances**, à l'intérieur de chaque sport, le contenu
doit être rangé dans **plusieurs sections distinctes** (qui deviendront des
**bulles / filtres cliquables** dans l'UI). Chaque section répond à la question :
**« qu'est-ce que je veux travailler ? »**

- Côté **Séances**, les sections = **objectifs / types de séance**. Le but n'est
  jamais le même. Exemple running : *5 km · 10 km · Semi · Marathon · Sprints* (par
  distance cible) **et** *VMA · Seuil · Aérobie · Sortie longue · Côtes* (par
  filière / type de travail).
- Côté **Exercices**, les sections = **zones / qualités travaillées** (ex muscu :
  *Push · Pull · Legs · Core · Explosivité · Gainage atypique* ; ex hyrox :
  *Sled · Ergo · Wall ball · Carry*…).

⚠️ Aligne-toi sur les types déjà présents dans l'app (à compléter, pas à
remplacer) :

| Sport | Types de séance existants (à enrichir) |
|---|---|
| Running | 1500m, 5k, 10k, Semi, Marathon, VMA, Aérobie, SL1, SL2, Côtes, Mixte |
| Vélo | Aérobie, SL1, SL2, PMA, Force, Vélocité, Sprints, Mixte |
| Muscu | Strength, Strength endurance, Explosivité, Push, Pull, Legs, Full body, Abdos / gainage |
| Natation | Technique, Seuil, Sprints, Aérobie, 70.3, Ironman |
| Hyrox | Compromised Run, Ergo, Spé wall ball, Spé sled, Simulation |
| Aviron | EF, Travail technique, Seuil, VO2max, Sprints, Race pace |
| Triathlon | Brick Run, Simulation complète |

---

## NOTRE MISSION (à toi + moi)

Trouver, **pour chaque sport, une grande variété de types de séances** couvrant
tous les objectifs (distance cible, filière énergétique, qualité physique). Le
running n'a pas le même objectif selon qu'on prépare un 5 km, un marathon ou des
sprints — fais pareil pour TOUS les sports.

**Priorité de départ (très important) :** commence par les **EXERCICES de muscu /
renfo**, en privilégiant **une multitude de mouvements atypiques** (peu connus,
originaux, correctifs, unilatéraux, anti-rotation, etc.) — pas seulement le
squat/bench/deadlift classiques. **Pour chaque exercice : son explication et son
utilité concrète** (ce qu'il muscle, pourquoi/quand le programmer, à qui il
s'adresse). **Puis on progresse sport par sport** dans le même esprit.

---

## FORMAT DE SORTIE ATTENDU

Procède **par lots**, un sport à la fois, et **commence par les exercices muscu /
renfo atypiques**. Avant chaque lot, annonce le sport + s'il s'agit d'Exercices ou
de Séances, puis liste les **sections (bulles)** que tu vas couvrir.

### Pour un EXERCICE
```
- Nom :
- Sport :
- Section (bulle) :
- Matériel :
- Niveau : débutant | intermédiaire | avancé
- Muscles / qualités travaillés :
- Utilité (pourquoi le programmer, à qui) :
- Exécution (3-5 points clés) :
- Erreurs fréquentes :
- Reps/séries de départ conseillées :
```

### Pour une SÉANCE
```
- Nom :
- Sport :
- Section (bulle) / Type :
- Objectif :
- Durée estimée (min) :
- Intensité : Faible | Modéré | Élevé | Maximum
- RPE cible (1-10) :
- Structure en blocs :
    1. Échauffement — …
    2. Corps de séance — répétitions, zone (Z1→Z5), allure/watts/cadence/distance, récup
    3. Retour au calme — …
- Pour qui / quand la placer dans la semaine :
- Tags :
```

### Repères communs (à respecter)
- **Zones** : Z1 Récup · Z2 Endurance · Z3 Tempo · Z4 Seuil · Z5 VO2max
- **Intensité** : Faible / Modéré / Élevé / Maximum
- Running/Aviron → allure (mm:ss/km). Vélo → watts + RPM. Aviron → CPM.
  Natation → allure /100m + nage (crawl/dos/brasse/papillon).
- Zéro mock générique : du contenu réaliste, exploitable directement par un athlète.

---

## COMMENCE MAINTENANT

Démarre par **LOT 1 — Muscu / Renfo : EXERCICES atypiques**. Propose d'abord la
liste des **sections (bulles)** que tu retiens pour la muscu, puis enchaîne avec
~15-20 exercices atypiques détaillés selon le format ci-dessus. On validera
ensemble avant de passer au sport suivant.
