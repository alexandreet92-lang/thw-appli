# PROMPT — Nutrition : frise 6 jours + repas (donut kcal, macros P/G/L, Photo IA)

> Évolutions de l'onglet « Aujourd'hui » de Nutrition. App clair ET sombre (dark de
> référence). Tokens (macros P/G/L = tokens dédiés). SVG/conic brut, aucune lib de chart.
> createPortal pour overlays. Fichiers < 200 lignes. Zéro mock.
>
> **Commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Frise des 6 derniers jours (haut de page)
6 jours (aujourd'hui à droite). Chaque jour : abréviation + anneau de complétion kcal
(part du target atteinte) avec la date au centre + petit % dessous. Jour actif = accent
`var(--primary)` (anneau + fond `var(--primary-dim)`). Clic → navigue vers ce jour ET le
contenu glisse latéralement (sens chronologique) + fondu ~0,3 s, `prefers-reduced-motion`
respecté. Données = totaux réels par jour (source existante). Jour sans données = anneau
vide, 0.

## B. Repas — donut kcal + jauges macros
Pour chaque repas (Petit-déjeuner, Collation matin, Déjeuner, Collation après-midi, Dîner,
Collation soir) : donut kcal (total au centre, chiffre neutre ; anneau = répartition par
macro) + 3 jauges en g : Protéines rouge, Glucides jaune, Lipides vert (chiffres neutres).
Repas vide → donut 0, jauges vides. Déplié : boutons Photo IA / Recherche / Manuel + liste
aliments. Couleurs macros = exception assumée sur donuts+jauges uniquement ; jamais sur les
chiffres ; pas étendues ailleurs.

## C. Photo IA
Phase 0 (lecture seule, documentée) : endpoint d'analyse d'image (vision) ? base CIQUAL ?
Si manque → le signaler, ne pas inventer.
Flux : Photo IA → image affichée à côté + donut qui se remplit pendant l'analyse (refs DOM,
60fps) → résultat rectifiable (description éditable + aliments avec quantités éditables g +
récap P/G/L+kcal recalculés via CIQUAL) → Annuler / Confirmer (var(--primary)). Si vision
indisponible → état clair « analyse indisponible », pas de valeurs inventées.

## Checklist
- [ ] Frise 6 jours : anneaux réels, jour actif accentué, aujourd'hui à droite.
- [ ] Changement de jour = slide + fondu, prefers-reduced-motion.
- [ ] Repas : donut kcal (centre neutre, anneau par macro) + 3 jauges P/G/L, chiffres neutres.
- [ ] Photo IA : image + donut d'analyse, description ET quantités rectifiables, recalcul, Annuler/Confirmer.
- [ ] Phase 0 documentée (vision + CIQUAL) ; aucun résultat inventé si manque.
- [ ] Clair ET sombre.

## Contraintes
TS strict, aucun `any`. Aucune migration. Ne pas toucher `strava.ts`. Couleurs via `var()`
(macros = tokens dédiés). SVG/conic brut. createPortal. `npm run build` passe. Aucun emoji.
Zéro mock. **Commit local. NE PAS PUSH.**
