# PROMPT — Refonte Records / Aviron

> Application du Design System (`docs/DESIGN_SYSTEM.md`). Structure **identique à la
> Natation** (mêmes composants réutilisés) ; seules changent les distances, le barème,
> la teinte sport et l'unité d'allure. App en mode sombre — tokens uniquement.
> **Pas de radar de profil.**
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## Contenu
Distances : **500, 1000, 2000, 5000, 10000 m, Semi, Marathon**.

1. **Pills période** → `Segmented` neutre.
2. **Jauges VERTICALES par distance** : hauteur = niveau vs barème, teinte aviron
   `#14b8a6` modérée, temps au-dessus, distance en dessous, vide = « — ». Animées.
3. **Lignes détaillées + saisie** : par distance, jauge horizontale teinte aviron,
   temps, **allure /500m calculée auto**, PR, « Préc. », lien **Modifier**. Chiffres neutres.

## Feuille « Modifier » — style Vélo
Réutilise `RecordDrawer` (createPortal, déjà neutralisé) : en-tête neutre (tag « Aviron »
+ point sport + distance + date + ✕), champ Temps, **allure /500m en texte neutre**
(« → 1:48 /500m »), champs arrondis + focus `var(--primary)`, bouton « Enregistrer ce
record » en `var(--primary)`. Aucun jaune.

## Implémentation
- `DistanceRecords.tsx` : composant générique « par distance » extrait de la Natation
  (jauges verticales de niveau + lignes détaillées + allure auto + animation montage).
  Paramétré par distances / barème / teinte / unité d'allure (`paceBaseM` + `paceSuffix`).
- `SwimRecords.tsx` et `RowingRecords.tsx` : fines enveloppes (config sport).
  Natation = `/100m` genré H/F ; Aviron = `/500m` (barème type Concept2).
- `DatasTab` : bloc ROWING → `<RowingRecords>`. `ROW_DISTS` / `calcSplit500m` retirés.

## Checklist (cochée avant commit)
- [x] Pills neutres (`Segmented`, partagé avec toutes les vues Records).
- [x] Jauges verticales par distance, animées (remplissage 0,9 s au montage).
- [x] Lignes avec allure /500m auto, chiffres neutres (tokens tabulaires).
- [x] Pas de radar (`RowingRecords` n'en rend aucun).
- [x] Feuille Modifier style Vélo, createPortal, bouton `var(--primary)` (cyan) —
      via le `RecordDrawer` existant (sport `rowing` : split /500m en texte neutre).

Réserve : la formule de puissance Concept2 affichée auparavant sous le tableau aviron
(P = 2.80 / (split/500)³) n'est pas reprise dans la nouvelle vue épurée ; elle reste
disponible dans la feuille « Modifier » (estimation watts). Le barème aviron (allures
/500m par distance) est une constante sanctionnée dans `RowingRecords.tsx`.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji. Zéro mock.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
