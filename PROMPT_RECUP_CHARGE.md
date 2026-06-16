# PROMPT — Onglet "Charge & forme" (Récupération)

## Objectif
Rendre l'onglet "Charge & forme" fonctionnel, branché sur les données de charge déjà
calculées par l'app. Ne RIEN recalculer.

## PHASE 0 — diagnostic (lecture seule)
- Hook/source de charge (`useTrainingLoad`, `useSmSn`, `ctl`, `atl`, `tsb`).
- CTL/ATL/TSB simples OU séparés SM (métabolique) / SN (neuromusculaire) ?
- Combien de jours d'historique ?
- Forme EXACTE des données dispo avant câblage.

## PHASE 1 — câblage (s'adapter au diagnostic)
- Cartes du haut : vraies valeurs de charge exposées par le hook.
  - SM/SN séparés → afficher les deux jeux (CTL/ATL/TSB SM et SN), pas un générique inventé.
  - Tags qualitatifs dérivés des seuils DÉJÀ utilisés ailleurs (pas de nouveaux seuils).
- PMC : tracer les vraies courbes CTL/ATL sur l'historique dispo (SVG brut), ligne TSB.
- Réutiliser les composants de graphe/cartes existants si présents.

## Contraintes
- Aucune logique de calcul de charge dupliquée : on consomme le hook existant.
- Variables CSS projet uniquement. SVG brut. TS strict, pas de `any`. Max 200 lignes/fichier.
- Dire si le rendu correspond à la maquette recuperation (onglet Charge).

**Commit local. NE PAS PUSH.**
