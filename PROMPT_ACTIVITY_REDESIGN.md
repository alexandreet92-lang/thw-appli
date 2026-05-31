# PROMPT_ACTIVITY_REDESIGN — Refonte page activité desktop

## Scope
Desktop uniquement (≥ 768px). Mobile (< 768px) : aucun changement.

## PARTIE 1 — Sidebar overlay drawer
- position:fixed, top:0, left:0, height:100vh, width:260px, z-index:100
- transform: translateX(0) ouverte / translateX(-100%) fermée
- transition: 280ms cubic-bezier(0.32,0.72,0,1)
- Contenu: margin-left:0, width:100% (sidebar ne pousse plus)
- Pull-tab bord droit : absolute right:-16px, toggle open/close
- Hamburger header toggle open/close
- Supprimer dropdown section sur desktop (garder mobile uniquement)

## PARTIE 2 — Header page activité
- Barre fine : retour (ChevronLeft cyan), titre, badge sport, date·ville
- Bouton Supprimer rouge à droite

## PARTIE 3 — Hero row (2 colonnes égales)
- Gauche : carte 280px, border-radius 10px, boutons Std/Sat/Hyb + Maximize
- Droite : grille stats 3×2 + bannière analyse verte

## PARTIE 4 — Données détaillées (4 colonnes)
- Puissance (#818CF8), Cardio (#EF4444), Terrain (#10B981), Conditions (#F97316)

## PARTIE 5 — Courbes pleine largeur (+20% hauteur)

## PARTIE 6 — Zones côte à côte (1fr 1fr)

## PARTIE 7 — Découplage | Durée cumulée côte à côte

## PARTIE 8 — Thème CSS variables (zéro hardcode fond/texte)

## Ordre final
1. Header  2. Hero  3. Données  4. Courbes  5. Zones  6. MMP  7. Découplage|Durée

## Fichiers
- `src/app/activities/page.tsx`
