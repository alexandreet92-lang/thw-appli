# CADENCES — Points ouverts 🔶 (à trancher par Alex)

> Ces points sont implémentés avec la valeur par défaut indiquée dans la spéc
> (`PROMPT_CADENCES.md`), mais **configurables** (jamais codés en dur) — on ne
> « corrige » rien à la place d'Alex. Tenir cette liste à jour (spéc §20).

1. **Agilité**
   - (a) Placement en **J2** (après sauts/sprints) supposé, non contesté ; ordre dans la journée.
   - (b) **Move — règle de score** : meilleur passage, moyenne ou somme des 3 ? Le barème actuel correspond à **un** passage → défaut moteur `aggregate: best`. Si « somme » retenue, recalculer le barème.
   - (c) Géométrie de *Square* et *Slalom* à valider avant de produire les schémas SVG.
   - (d) Schémas SVG à fournir / valider (Move : plots à 5, 10, 20 m + sprint 30 m).
   - (e) Barèmes **estimés, jamais mesurés** → priorité de calibrage (≥ 30 sujets).
2. **Hyrox** : (a) table des charges de thrusters (sexe × poids) à fournir ; (b) variante box / plate : correction éventuelle ; (c) barème estimé (Réf 15:00, Max 10:30 H).
3. **Haltérophilie** : Clean complet vs power clean ; Clean and press strict vs avec impulsion ; style de prise ; barème C&P de confiance faible.
4. **Force** : soulevé de terre conventionnel / sumo ; dead hang (prise) ; dead hang non normalisé au poids de corps.
5. **Sprints 30 / 100 m** : barèmes à recaler ; chronométrage manuel vs cellules (enregistré, non corrigé en v1).
6. **Natation** : poussée au mur au départ, type de nage, longueur de bassin ; barème 200 m de confiance faible.
7. **AMRAP** : convention de fraction (÷ 35) ; tractions strictes vs kipping.
8. **Barèmes femmes** : dérivés par ratios (force ≈ 65 % des hommes, sauts ≈ 80 %, course ≈ 1,2×), pas par données.
9. **Coefficients d'âge** : valeurs estimées ; Endurance = VO2max ; Coordination = Vitesse ; **exposants d'âge des chronos** : seul le 30 m est calé sur Alex, les autres (§9) sont des propositions.
10. **Corrections d'équipement** (3 / 3 / 2 / 1 % pointes, 7 % ceinture) : estimations.
11. **Poids des qualités par épreuve** : estimations, à challenger épreuve par épreuve (éditables en admin).
12. **Points max par épreuve** : remis à l'échelle (×0,917) pour sommer à 1000 → valeurs non rondes.
13. **Épreuves non passées** : règle de normalisation du score (défaut proposé : `points ÷ pts_max_passés × 1000`).
14. **Âges > 80** et personnes hors catégories M/F : > 80 non défini (message) ; M/F → barème choisi enregistré, sans justification.
15. **G8** (profils animés) : validé par Alex ; remplacer la source UMass (force) par une étude.
16. **Percentiles / classements** : interdits avant **100 testeurs** consentants (campagne clôturée) ; groupe de comparaison à confirmer. Calibrage des barèmes estimés : ≥ 30 sujets/épreuve.
17. **Jours de repos** : non bloquants (à confirmer).
18. **VO2max en ml/kg/min** : volontairement absente en v1.
19. **Rappel de retest annuel** et **outils de test** (chronos) : suggestions de Claude, non validées.

---
_Barème : `scale_version` v1.0. Source de vérité des chiffres : `src/lib/cadences/cadences.config.json`._
