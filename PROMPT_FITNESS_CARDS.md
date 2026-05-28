# PROMPT_FITNESS_CARDS — Refonte visuelle bloc Fitness (CTL/ATL/TSB)

## Problème
La section FITNESS de la page Training (SectionDonnees dans activities/page.tsx)
était visuellement cassée : grande bordure noire autour du bloc entier,
valeurs en noir sans couleur, pas de cartes individuelles.

## Fichier modifié
- src/app/activities/page.tsx — bloc CTL/ATL/TSB (lignes ~1777-1794)

## Solution
Suppression du div conteneur avec border + grille unique.
Remplacement par 3 cartes séparées en flex row, fond slate-100, coins arrondis.
Ajout de const [openSheet, setOpenSheet] = useState<string|null>(null) dans SectionDonnees.

## Résultat visuel
3 cartes arrondies côte à côte sur fond gris clair, pas de bordure noire.
CTL en cyan (#06B6D4), ATL en orange (#F97316), TSB en rouge (valeur négative) ou vert (valeur positive).
Chaque carte : label en petit gris uppercase + bouton ? en haut, valeur large au centre.
