# PROMPT — Refonte Records / Muscu (blocs par exercice + ajouter exercice + modifier)

> Application du Design System (`docs/DESIGN_SYSTEM.md`). App en mode sombre — tokens
> uniquement. Réutiliser les composants Vélo/Course (segmented, feuille neutre). Fichiers
> < 200 lignes.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Page
1. Pills période en `Segmented` neutre.
2. Un bloc par exercice (Bench Press, Squat, Deadlift, Tractions, Dips, Dev. militaire,
   Pompes). Titre en `var(--font-display)`.
3. Dans chaque bloc, une ligne par type de record suivi (1RM, 3RM, 5RM, 10RM, Max reps
   PDC, 1RM + charge, Max charge, Max reps) : jauge horizontale teinte muscu `#8b5cf6`
   modérée + valeur (kg / reps / +kg). Type non renseigné = « — ». Chiffres neutres.
   Jauges animées.
4. Bouton « + Exercice » (lien cyan) → feuille createPortal : nom + types à suivre
   (cases) + unité par défaut.

## B. Feuille « Modifier » (createPortal, style Vélo)
En-tête neutre (tag « Muscu » + point + tag exercice + « Modifier le record » + date + ✕).
Sélecteur de type (segmented). Champ Valeur adaptatif : 1RM/3RM/5RM/10RM/Max charge → kg ;
Max reps PDC / Max reps → reps ; 1RM + charge → +kg. Champ arrondi, unité intégrée, focus
cyan. Bouton « Enregistrer ce record » cyan.

## Implémentation
- `gymShared.ts` : exercices intégrés + types, `unitKind`/`fmtValue`/`typeLabel`,
  exercices personnalisés en localStorage, fetch/upsert des records (personal_records).
- `GymRecords.tsx` : un bloc/exercice (titre `var(--font-display)`), une ligne/type avec
  jauge horizontale teinte muscu modérée (normalisée au max par type) + valeur neutre,
  animée. « + Exercice » (lien cyan) + « Modifier » par ligne.
- `GymEditSheet.tsx` : Modifier (type en `Segmented` + champ adaptatif kg/reps/+kg + date),
  bouton `var(--primary)`.
- `AddExerciseSheet.tsx` : nom + types à suivre (cases) ; l'unité est dérivée du type.
- Pills période : déjà en `Segmented` neutre (partagé, lot précédent).

## Checklist (cochée avant commit)
- [x] Un bloc par exercice, lignes par type avec jauge muscu modérée + valeur, chiffres neutres.
- [x] Jauges animées (remplissage 0,9 s au montage).
- [x] « + Exercice » ouvre une feuille (nom + types + unité), createPortal.
- [x] Feuille Modifier : type segmented + champ adaptatif (kg / reps / +kg), bouton cyan, createPortal.

### Réserves documentées
- **Exercices personnalisés en localStorage** : la définition d'un exercice ajouté (nom +
  types suivis) est stockée en local (aucune table dédiée, aucune migration autorisée).
  Les **records** eux restent dans `personal_records` (sport='gym').
- **Unité « par défaut »** : non saisie manuellement mais **dérivée du type** (kg / reps /
  +kg), ce qui évite une incohérence type/unité.
- La normalisation des jauges est **relative** (max par type parmi les exercices affichés),
  faute de barème muscu absolu.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji. Zéro mock.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
