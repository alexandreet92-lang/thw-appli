# CORRECTIF — Performance / onglet Profil : refonte réellement appliquée (V2)

## Constat initial (juste)
Le passage précédent n'avait extrait que la *grille d'affichage* de Profil Global.
Le reste de `ProfilTab` (cartes bordées, titres à barre colorée, formulaire de
benchmarks en ligne, jauges rondes multicolores) était intact. Ce passage **réécrit
le rendu de `ProfilTab`** (page.tsx) et extrait les sections en composants enforced.

## Changements appliqués (AVANT → APRÈS)
1. **Cartes** : les 3 `<Card>` (Global/Spécifique/Niveau) supprimées → sections séparées
   par `var(--space-8)`. `grep "<Card>"` dans le rendu = **0**.
2. **Titres** : `<h2>` en `var(--font-display)` (Fraunces) 15px, **plus de barre
   verticale colorée** (`grep linear-gradient(180deg` dans le rendu = **0**).
3. **Analyser / Modifier** : liens discrets (`var(--primary)` / neutre), plus de bouton
   orange plein.
4. **Profil Global** : `ProfilGlobalGrid` (nue, 4 col desktop / **2 col mobile, les 8**).
5. **Onglets sport** : texte neutre + **point** couleur du sport (`--sport-*`), plus de
   pill pleine (`ProfilSpecific`).
6. **Sélecteur de type de zone (ajouté)** : Running FC/Allure · Cyclisme FC/Puissance ·
   Natation FC/Allure · Hyrox FC. Un seul jeu visible.
7. **Barres de zones animées (ajouté)** : `ZoneBars` + `AnimatedBar` (clé `sport-ztype`
   → réanime au changement). Couleurs de zone = tokens. Respecte reduced-motion.
8. **Sous-métriques VMA/LTHR/VO2max** : `var(--text)` neutres, rangée nue à filets.
9. **Formulaire de benchmarks → feuille** : `BenchmarkSheet` via `createPortal`
   (réutilise `Sheet`), ouvert par « Modifier les benchmarks → ». Inputs arrondis 10px,
   **unité intégrée à droite**, focus `var(--primary)` + halo `var(--primary-dim)`.
   Bouton « Enregistrer » en `var(--primary)` plein. Le formulaire inline est supprimé.
10. **Niveau estimé** : `SemiGauge` (jauges rondes) **retiré du rendu** (`grep <SemiGauge`
    = 0) → `LevelBars` : échelle Débutant→Élite, piste neutre, repère `var(--primary)`
    **animé** à sa position, qualificatif en tag.

## Checklist d'acceptation
- [x] Aucune carte bordée/ombrée (Global/Spécifique/Niveau).
- [x] Titres Fraunces, plus aucune barre verticale colorée.
- [x] « Analyser » n'est plus un bouton orange plein.
- [x] Mobile : les **8** métriques de Profil Global visibles (2 colonnes).
- [x] Onglets sport neutres + point de couleur.
- [x] Toggle de type de zone fonctionnel (FC/Allure/Puissance selon sport).
- [x] Cyclisme affiche **7** zones de puissance (`powerZones`).
- [x] Barres de zones animées au montage et au changement.
- [x] VMA/LTHR/VO2max en `var(--text)` — aucune couleur sur ces chiffres.
- [x] Formulaire de benchmarks en **feuille** (createPortal) via « Modifier les benchmarks ».
- [x] Inputs arrondis + unité intégrée + focus `var(--primary)`.
- [x] Bouton d'enregistrement en `var(--primary)` plein.
- [x] Jauges rondes disparues → barres de niveau animées.

## Caveat documenté (honnêteté)
Les **définitions** des anciens composants `SemiGauge`, `MiniRadar`, `Card`,
`PremiumStatCard` **restent présentes** dans `page.tsx` (≈ 2 500 l.) mais ne sont **plus
rendues ni importées** (dead code, avertissements lint « unused » non bloquants). Je ne
les supprime pas dans ce passage pour limiter le risque sur ce gros fichier — à
garbage-collecter dans un commit dédié.

## Garde-fou
6 nouveaux fichiers `components/profil/` ajoutés à `ENFORCED_PATHS`. Vérifié :
enforce **0 couleur en dur (34 fichiers)**, `npm run build` OK. Commit local, pas de push.
