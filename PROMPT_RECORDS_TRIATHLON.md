# PROMPT — Refonte Records / Triathlon (page + feuille saisie course + lier activité)

> Application du Design System (`docs/DESIGN_SYSTEM.md`). App en mode sombre — tokens
> uniquement. Réutiliser les composants Vélo/Course/Natation (segmented, radar lisible,
> feuille neutre). Fichiers < 200 lignes.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Page
1. **Sélecteur de distance M / 70.3 / Full** (segmented) en haut. Profil ET records
   varient selon ce choix.
2. **Profil triathlon** (varie par distance) : radar lisible — anneaux neutres, un seul
   polygone athlète `var(--primary)`, niveau en liseré pointillé, axes scalés chacun sur
   son barème. Axes : Natation, Vélo, Course, Transitions, Endurance. Toggle M/F neutre,
   « Barème » lien cyan.
3. **Décomposition (jauges verticales)** pour le meilleur de la distance : barre **Total**
   empilée par segment (Natation / T1 / Vélo / T2 / Course, teintes sport modérées) +
   une barre par sport à côté. Légende. Chiffres neutres. Animées.
4. **Records par distance** (M, 70.3, Full) : ligne avec splits (Nat/T1/Vélo/T2/Course)
   + total + « Modifier ». Distances vides = « — ».

## B. Feuille de saisie — UN BLOC PAR SEGMENT
createPortal, en-tête neutre. Natation (Temps → vitesse /100m auto), T1 (Temps), Vélo
(Temps, Watts, NP, FC moy → vitesse auto), T2 (Temps), Course (Temps, FC moy → allure
auto). Total recalculé auto en bas. Champs neutres, focus cyan. Bouton « Enregistrer la
course » cyan.

## C. « Lier une activité » (par sport : Natation, Vélo, Course)
Bouton « + Lier une activité » par bloc → surpage createPortal listant les activités du
sport (recherche + liste). Sélection → pré-remplit les champs du segment + affiche les
données supplémentaires en puces, UNIQUEMENT les champs réellement présents en base.
État « ✓ Activité liée ».

## Implémentation
- `TriathlonRecords.tsx` : page (sélecteur distance → radar + décomposition + records).
- `RadarChart.tsx` : `TriathlonRadar` accepte un `format` contrôlé (sélecteur masqué) ;
  polygone athlète unique `var(--primary)`, anneaux pointillés neutres, axes scalés
  par barème (déjà en place dans `RadarSVG`). Chrome `RadarCard` neutralisé : toggle
  H/F en `Segmented` neutre, « Barème » en lien cyan.
- `TriathlonDrawer.tsx` + `TriSegment.tsx` : feuille de saisie neutre, un bloc/segment,
  autos (vitesse /100m, km/h, allure /km), W/kg, total recalculé, bouton `var(--primary)`.
- `LinkActivitySheet.tsx` + `triActivities.ts` : surpage « Lier une activité » par sport
  (swim → swim ; bike → bike+virtual_bike ; run → run), pré-remplit les champs + puces
  de colonnes RÉELLES de `activities` (W max, FC max, RPM moy/max, D+, temp., allure…).

## Checklist (cochée avant commit)
- [x] Sélecteur M/70.3/Full pilote profil + records (radar + décomposition suivent ;
      la distance active est surlignée dans la liste).
- [x] Radar lisible (un seul polygone `var(--primary)`, anneaux pointillés, axes scalés
      chacun sur son barème).
- [x] Décomposition : barre Total empilée par segment + barres par sport (Nat./Vélo/
      Course/T1+T2), animées au montage, chiffres neutres, légende sport.
- [x] Records par distance (M/70.3/Full) avec splits + total + Modifier.
- [x] Feuille saisie : un bloc par segment, autos (vitesse/allure), total recalculé.
- [x] « Lier une activité » : surpage par sport (createPortal), pré-remplit + puces de
      données RÉELLES uniquement (aucune inventée), état « ✓ Activité liée ».
- [x] Boutons d'action en `var(--primary)`, feuilles en createPortal.

### Réserves documentées
- **Persistance** : `personal_records` ne stocke que les splits (Nat/T1/Vélo/T2/Course)
  + le temps total. Watts / NP / FC moyennes et les données d'activité liée sont des
  **aides à la saisie / au calcul** (affichées), **non persistées** — aucune colonne
  dédiée et aucune migration autorisée.
- **XS / S** : la vue n'expose que M / 70.3 / Full (conforme au prompt) ; les formats
  XS et S ne sont plus listés ici.
- Le libellé du header de la feuille pour Full affiche « Ironman » (id de
  `TRIATHLON_FORMATS`), équivalent à Full.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji. Zéro mock.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
