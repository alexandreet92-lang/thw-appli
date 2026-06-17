# PROMPT — Éditeur de course (Calendar) : sheet bas→haut éditorial

## OBJECTIF
Refondre l'éditeur d'événement/course de la page Calendar (« Modifier la course »)
en sheet coulissant bas→haut pleine largeur, style éditorial clair, structure
adaptative par sport (triathlon = multi-segments). Réf : `maquette_course_triathlon.html`.

## PÉRIMÈTRE
Uniquement l'éditeur de course de Calendar (composant `RaceModal`). Pas le
SessionEditor d'entraînement. Logique de sauvegarde, clés en base, upload de
parcours : INCHANGÉES. On change la présentation/ergonomie.

## 1 — Conteneur : sheet bas→haut, pleine largeur
Sheet ancré en bas, toute la largeur de la page (pas une colonne). Hauteur ~94vh,
coins sup. arrondis ~26px, grab handle. Animation translateY. Scrim assombri,
fermeture scrim + ✕. Header sticky (titre Fraunces + ✕), footer sticky, corps
scrollable. Desktop : même sheet pleine largeur mais CONTENU centré (max ~900px).

## 2 — Style éditorial clair
Fond #faf9f6, cartes #fff, texte #1a1a1a, atténué #8a8a82, filets #e7e5df, mappés
sur des tokens CSS (scope `.race-ed` surcharge les tokens globaux). Fraunces titres,
sans corps. Coins 12–16px.

## 3 — Champs communs
Sport (chips colorés : Course, Trail, Cyclisme, Natation, Hyrox, Triathlon, Aviron).
Objectif (chips). NOM + DATE. NOTES (textarea).
NOTE GTY : « GTY » est une VALEUR EXISTANTE de RaceLevel (`gty`, label « GTY »,
stockée en base). Donc CONSERVÉE → 4 chips Objectif : Principal / Important /
Secondaire / GTY (pas de suppression de donnée).

## 4 — Structure adaptative par sport
- TRIATHLON : 5 segments en cartes (Natation cyan · T1 transition · Vélo bleu ·
  T2 transition · Course vert), volume en en-tête, calculs live (allure /100m,
  vitesse, allure /km) en lecture seule (badge « calc »). Clés performanceData
  existantes réutilisées (triSwimTime, t1, triBikeTime, triBikeDist, bikeWatts,
  t2, triRunTime, triRunDist).
- AUTRES sports : une carte unique de la couleur du sport contenant les champs
  existants (`SportFields`) — zéro perte de donnée (wizard natation, stations
  hyrox, split aviron, FC/classement, etc. conservés). Pas de T1/T2.
- Trail : ajout d'une carte Course (Distance, D+, Temps, Allure calc, Classement).
- Champs calculés : dérivés temps+distance, lecture seule + badge « calc », « — »
  si donnée manquante, recalcul live.

## 5 — Parcours
Zones glisser-déposer (GPX/TCX) selon sport : triathlon = vélo + course ; autres =
une zone. Mécanisme d'upload existant conservé (mêmes paramètres onSave).

## 6 — Footer sticky
Annuler (secondaire) · Enregistrer (accent = couleur du sport). Toujours visible.

## DONNÉES
Modèle/sauvegarde inchangés. Seul ajout : clé `performanceData.elevGain` (D+ trail) —
c'est un champ d'un JSONB existant (Record<string,unknown>), donc AUCUNE migration.

## CONTRAINTES
Variables CSS, pas de hex en composant (palette centralisée dans `raceTheme.ts`).
Pas d'emoji, icônes Tabler, Fraunces + sans. TS strict, pas de `any`. Max 200
lignes/fichier → extraits : `RaceEditorSheet.tsx`, `RaceSegmentCard.tsx`,
`TriSegments.tsx`, `RaceDropZone.tsx`, `src/lib/race/computePace.ts`. `RaceModal.tsx`
ré-exporte le nouveau sheet (appels page.tsx inchangés). `npm run build` lançable → vérifié.
