# Refonte de l'écran « Séance en direct »

## Objectif
Remplacer l'écran actuel de séance en direct (muscu / Hyrox) par un moteur de séance
plein écran, à phases colorées, inspiré d'un timer d'intervalles mais adapté à la muscu
(saisie de répétitions + charge). Une maquette HTML de référence est fournie
(`thw-seance-live-v3.html`) : c'est la **cible visuelle et comportementale**. Reproduis sa
hiérarchie et ses transitions, pas son code (elle est en HTML/CSS/JS inline, on réimplémente
proprement dans le stack).

## Périmètre de CE lot (ne pas déborder)
- Sports : **Muscu** uniquement.
- Modes de structure : **Lap (circuit)** et **Séries**. Le moteur doit être écrit pour
  s'étendre à Superset / EMOM / Tabata plus tard, mais on ne les implémente PAS ici.
- Boxe / Hyrox / Mobilité : hors périmètre.
Si une décision t'oblige à traiter un mode hors périmètre, arrête-toi et signale-le au lieu
d'improviser.

## Modèle (le cœur de la logique)
Une séance est une liste ordonnée de **blocs** parcourus séquentiellement. Chaque bloc est
une des deux natures d'effort, séparées par des récupérations :

1. **Effort AUX REPS** (auto-rythmé) : affiche nom d'exercice + répétitions + charge.
   Répétitions et charge sont **pré-remplies à la cible du plan** et **modifiables** par
   l'athlète. Pas de compte à rebours. L'athlète appuie sur « Valider » quand la série est
   finie → cela log la série et déclenche la récup.
2. **Effort AU TEMPS** (imposé) : affiche nom + compte à rebours géant. Pas de saisie.
   À zéro, enchaîne automatiquement la récup.
3. **Récupération** : toujours un compte à rebours, automatique, « skippable ».

Il n'y a **que 3 écrans dans la boucle**, plus un écran de résumé qui la lance. AUCUN autre
écran ne doit apparaître (en particulier : pas d'écran de logging sombre séparé — la saisie
vit DANS l'écran d'effort rouge).

### Machine à états
`résumé → préparer(10s) → [ effort → récup ] × blocs → terminé`
- Pause disponible partout (gèle tous les chronos, y compris le chrono total).
- Le chrono total tourne pendant préparer / effort / récup ET pendant l'effort aux reps.

## Les 4 écrans

### 1. Résumé (pré-séance)
- En-tête : nom de séance, durée estimée, nb de tours, nb d'exos.
- Liste **scrollable** des tours et de leurs exercices (nom + cible : `X reps · Y kg`
  ou `X reps · PDC` ou `Zs` pour un effort au temps). Icône hash pour les reps, icône
  horloge pour le temps (Tabler).
- Bouton unique « Commencer ».

### 2. Préparer (phase orange)
- Compte à rebours 10s géant. Sous-titre : « Premier · <exo> ». Auto-enchaîne.

### 3. Effort (phase rouge) — s'adapte à la nature du bloc
- Barre de progression segmentée (un segment par tour) + compteurs bas
  « X tours restants » / « X exos restants » (style plein écran, gros chiffres).
- Nature **reps** : nom en grand, puis deux **cartes de saisie sombres translucides**
  posées sur le fond de phase (répétitions et charge), chacune avec `−` / valeur / `+`.
  Tap sur la valeur → pavé numérique. Charge : afficher `PDC` (poids du corps) tant que
  charge = 0 sur un exercice au poids du corps ; masquer/neutraliser le stepper tant qu'on
  est en PDC ; dès qu'on ajoute du poids, passer en kg. Action centrale : « Valider ».
- Nature **temps** : nom + compte à rebours géant, pas de cartes. Action : « Terminer »
  (raccourci) ; sinon auto à zéro.
- Icônes en haut : pause (gauche), progression (droite). Indicateur FC discret
  (petit, non intrusif ; « indisponible » si capteur BLE absent — sur navigateur il l'est).

### 4. Récupération (phase verte)
- Compte à rebours géant, auto. Sous-titre « À suivre · <exo> ».
- **Édition en récup uniquement** (paramètres sûrs) : `−15s` / `+15s` sur la récup en cours,
  `+1 tour`. (« Remplacer l'exo suivant » et l'éditeur complet : lot ultérieur, ne pas faire.)
- Action : « Passer ».

### Écran terminé
- Récap court : nb de séries validées + volume total (kg) → bouton retour résumé/bilan.

## Surcouches (pas des écrans)
- **Pause** : overlay plein écran, « Reprendre » / « Terminer la séance ». Gèle les chronos.
- **Progression** : bottom-sheet listant Fait / En cours / À venir (dérivé de la timeline).
- **Pavé numérique** : bottom-sheet pour saisir reps / charge d'un coup.

## Couleurs de phase (design tokens — AUCUN hex en dur)
Définir des tokens dédiés, réutilisables partout :
- `--phase-prepare` = ambre, `--phase-effort` = rouge, `--phase-rest` = vert, chacun avec
  son token d'encre (`-ink`) pour le texte au-dessus.
- Prévoir une **variante B** commutable (effort = cyan de marque, repos = violet) via un
  attribut/data-thème, sans réécrire les composants. Défaut = variante A (tricolore).
Le reste de l'UI reste sombre premium avec l'accent cyan Athéna existant.

## Données (RÈGLE : zéro mock)
- La timeline doit être **générée depuis la séance planifiée réelle** (structure/type déjà
  présents dans le schéma / les types du repo). NE PAS inventer de données de séance.
  Si le contrat de données d'une séance planifiée (tours, exos, cibles reps/charge, type
  reps|temps, durées de récup) n'existe pas encore ou est ambigu, **arrête-toi et liste
  précisément ce qui manque** avant de coder — ne comble pas avec des valeurs en dur.
- La validation d'une série doit persister la série réalisée (reps + charge effectives) via
  le même chemin de données que le reste de l'app (Supabase). Si ce chemin n'existe pas,
  signale-le.
- Le volume total = somme(reps × charge) des séries validées ; PDC compte 0 kg.

## Contraintes techniques (non négociables)
- Next.js 15 / TypeScript strict / Tailwind. Mobile-first.
- **Max 200 lignes par fichier** → découper. Découpage proposé (à ajuster) :
  - `useSessionEngine.ts` (état + machine à états + timers)
  - `useSessionTimeline.ts` (génération de la timeline depuis le plan, par mode)
  - `types.ts` (Bloc, Phase, ExerciceType…)
  - `SummaryScreen.tsx`, `PhasePrepare.tsx`, `PhaseEffortReps.tsx`,
    `PhaseEffortTime.tsx`, `PhaseRest.tsx`, `SessionRunner.tsx` (orchestrateur)
  - `PauseOverlay.tsx`, `ProgressSheet.tsx`, `NumPadSheet.tsx`
- **Aucun emoji** dans l'UI. Icônes **Tabler** uniquement.
- **CSS via design tokens** — aucun code couleur hexadécimal en dur.
- `npm run build` DOIT passer. TypeScript strict, pas de `any` de complaisance.
- Réutiliser les composants existants quand pertinent (ex. la barre de zones/gauge du
  `SessionEditor` si utile) plutôt que dupliquer.
- Commit local uniquement, pas de push sur main sans validation.
- Ne pas toucher `src/lib/sync/strava.ts`.

## Détails de comportement à respecter
- Pré-remplissage à la cible + ajustement par exception (nudge ±1 ou pavé) : ne pas forcer
  l'athlète à taches `+` répétées.
- Empêcher la mise en veille de l'écran pendant la séance (Wake Lock API si dispo, sinon
  dégradation propre).
- `+1 tour` en récup doit reconstruire la timeline **sans casser l'index courant** (recalculer
  la position, ne pas décaler le bloc en cours). C'est un point sensible : traite-le
  explicitement et teste-le.
- Transitions de phase visibles mais sobres (pas d'animations gadget).

## Hors périmètre explicite (à NE PAS faire dans ce lot)
- Modes Superset / EMOM / Tabata, sports Boxe / Hyrox / Mobilité.
- Éditeur de séance complet en cours de séance (réordonner, insérer, remplacer l'exo actuel).
- Saisie post-effort pour les blocs au temps (AMRAP) — à décider plus tard.
