# PROMPT — Correctifs header / navigation (3 points)

> Corrections du système header/navigation en place. App clair ET sombre. Tokens
> uniquement. Fichiers < 200 lignes.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## Correctif 1 — Logo IA = shuriken 4 branches existant, rien d'autre
Le bouton IA (haut droite) doit afficher l'asset shuriken 4 branches (Athéna) déjà
présent dans le repo, tel quel — aucun autre icône, placeholder ni SVG redessiné.

## Correctif 2 — Header flottant PARTAGÉ sur TOUTES les pages
Toutes les pages doivent rendre comme Nutrition : aucune barre pleine en haut, seulement
les deux boutons flottants (☰ / shuriken). Le header flottant est déjà partagé via les
shells (layout) ; il faut supprimer les barres/headers PROPRES aux pages (Training/Stats,
Calendar, Planning, etc.) et redescendre leurs contrôles utiles (toggle de vue, App⌄,
refresh, onglets Données/Analyse/Progression…) dans le contenu, sous le titre.

## Correctif 3 — Desktop : le ☰ de la sidebar ancrée doit être VISIBLE
Le ☰ doit être toujours visible et cliquable (z-index au-dessus de toute sidebar/rail),
coin haut-gauche de la zone de contenu, jamais recouvert.
Phase 0 : documenter s'il existe deux sidebars desktop (rail d'icônes global + sidebar
ancrée). Ne pas supprimer/fusionner sans validation — rendre le bouton visible + signaler.

## Phase 0 — constat desktop (documenté)
Il existe bien **deux navigations à gauche sur desktop, par conception** (non fusionnées) :
1. **Nav globale de l'app** = sidebar ancrée de `DesktopShell` (Dashboard, Planning,
   Calendar… + « Hybrid »/avatar). Contrôlée par le ☰ flottant.
2. **Sous-nav de page** = rail par page (`TabbedPageLayout` / `SectionLayout` /
   `NutritionRail`, `position:sticky`, z-index 5) qui porte les onglets de la page.
Ces deux-là sont **distincts** (global vs sous-nav) — gardés tels quels.
La VRAIE redondance était la **sidebar PROPRE à la page Training** (`activities/page.tsx`,
`position:fixed; left:0; z-index:100`) qui doublait la nav globale **et recouvrait le ☰**.
Elle est supprimée ; ses onglets (Données/Analyse/Progression) passent dans le rail
standard `TabbedPageLayout`.

## Implémentation
- **Correctif 1** : les boutons IA (`DesktopShell`/`MobileShell`) utilisent déjà l'asset
  `/logos/logo_4bras.png` (Athéna, mappé par `AIPanel`). La page Training affichait par
  ailleurs un autre chrome — supprimé.
- **Correctif 2** : `activities/page.tsx` refondue → plus de barre haute ni de sidebar
  propre ; le contenu passe par `TabbedPageLayout` (titre « Training » + onglets) et les
  contrôles (App⌄, refresh, aide, statuts de sync) sont déplacés dans `headerExtra`
  (dans le contenu). Calendar/Planning utilisaient déjà `SectionLayout` (en-tête +
  rail in-content, pas de barre pleine) → rien à retirer.
- **Correctif 3** : sidebar fixe z-100 de Training supprimée + ☰ de `DesktopShell` passé
  à **z-index 120** (au-dessus de tout rail/sidebar).

## Checklist (cochée avant commit)
- [x] Bouton IA = shuriken 4 branches existant (`logo_4bras.png`), rien d'autre.
- [x] Header flottant = layout partagé unique (shells), appliqué à toutes les pages.
- [x] Aucune barre pleine résiduelle : Training refondue ; Calendar/Planning déjà OK.
- [x] Contrôles de Training conservés mais redescendus (App⌄/refresh/aide en `headerExtra`).
- [x] Desktop : ☰ z-index 120, jamais recouvert (sidebar z-100 de Training supprimée).
- [x] Phase 0 documentée (deux navs distinctes signalées, non fusionnées sans validation).
- [x] Rendu clair ET sombre, mobile ET desktop (tokens ; `TabbedPageLayout` responsive).

### Réserve
- Calendar/Planning n'avaient pas de « barre pleine » au sens strict (elles utilisent déjà
  `SectionLayout`) ; seule la page Training en avait une — c'est elle qui est corrigée.
- Pas de vérification visuelle navigateur dans cet environnement ; validé par revue + build.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
