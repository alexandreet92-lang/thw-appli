# CORRECTIF — Performance / onglet Profil (V2) : vérification + aération + nettoyage

## Constat clé (preuve, à lire en premier)
La refonte du Profil **est déjà dans le code ET sur `main`** (commit `b6b6a99`, mergé
dans `main` = `a7625c0`). Vérifié objectivement :
- `grep "<Card"` dans `page.tsx` → **0** · `grep "<SemiGauge"` → **0** ·
  `grep "linear-gradient(180deg"` → **0**.
- `ProfilSpecific` / `LevelBars` / `BenchmarkSheet` sont **câblés** dans `ProfilTab`,
  qui est rendu par `PerformancePage`.
- `git ls-tree origin/main` liste bien les 7 fichiers `components/profil/`.

→ **Le code source n'est PAS l'ancien.** Si la page affichée ressemble encore à
l'ancienne, c'est le **déploiement Vercel qui n'a pas été régénéré** (problème récurrent
de ce projet, déjà constaté : « sur vercel ça ne s'est pas mis à jour »). Le code sur
`main` est la nouvelle version ; vérifier l'onglet Deployments de Vercel pour le commit
`a7625c0` (build en cours / échoué / non déclenché). Aucune correction de code ne peut
faire apparaître la refonte si Vercel sert un ancien build.

## Ce que ce passage ajoute réellement
1. **Aération** (nouvelle exigence de cette version du prompt) : rythme vertical
   augmenté — espace entre sections `var(--space-8)` → **`var(--space-10)`** (40px),
   padding haut `var(--space-2)` → `var(--space-4)`, en-tête Profil Global +`space-5`,
   Profil Spécifique gap `space-5→space-6` et colonne contenu `space-4→space-5`, barres
   de zones `space-2→space-3`. La page respire davantage.
2. **Nettoyage (#10 « désimporter »)** : les définitions mortes `SemiGauge`, `MiniRadar`,
   `Card`, `PremiumStatCard` sont **physiquement supprimées** de `page.tsx`
   (`grep "function SemiGauge("` → 0, etc.). Plus aucun composant de jauge présent.

## Checklist d'acceptation (re-vérifiée sur le code courant)
- [x] Aucune carte bordée/ombrée (Global/Spécifique/Niveau) — `<Card`=0.
- [x] Titres Fraunces, aucune barre verticale colorée — `linear-gradient(180deg`=0.
- [x] « Analyser » = lien `var(--primary)`, plus de bouton orange.
- [x] Mobile : 8 métriques Profil Global (grille 2 colonnes).
- [x] Onglets sport neutres + point couleur.
- [x] Toggle de type de zone (FC/Allure/Puissance selon sport).
- [x] Cyclisme = 7 zones de puissance (`powerZones`).
- [x] Barres de zones animées au montage et au changement (clé `sport-ztype`).
- [x] VMA/LTHR/VO2max en `var(--text)` (aucune couleur sur ces chiffres).
- [x] Formulaire de benchmarks en **feuille** (createPortal) via « Modifier les benchmarks ».
- [x] Inputs arrondis 10px + unité intégrée + focus `var(--primary)` + halo.
- [x] Bouton d'enregistrement `var(--primary)` plein.
- [x] Jauges rondes disparues → `LevelBars` animées ; **defs SemiGauge supprimées**.

## Garde-fou
Fichiers `components/profil/` dans `ENFORCED_PATHS`. Vérifié : enforce **0 couleur en dur
(34 fichiers)**, `npm run build` OK. Commit local, pas de push.
