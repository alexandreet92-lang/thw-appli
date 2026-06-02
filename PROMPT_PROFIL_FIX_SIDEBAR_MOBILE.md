# Mon Profil — fix onglets mobile + sidebar rail + largeur constante

`src/app/profile/page.tsx` (`ProfileContent`).

## FIX 1 — Onglets mobile non coupés
- `min-width: 0` sur chaque onglet (autorise le shrink), padding latéral réduit
  (`14px 4px`), `font-size: 13px`, `white-space: nowrap`, pas d'ellipsis.
- Label mobile raccourci : « Réglages IA » → **« Réglages »** (le sous-titre
  desktop garde le sens). Profil / Notifications inchangés.

## FIX 2 — Sidebar desktop en mode rail (hover-to-expand)
- Repos : **56px**, icônes seules. Hover : **220px**, icône + titre + sous-titre.
- Transition `width 200ms cubic-bezier(0.4,0,0.2,1)`.
- L'aside est en **overlay** (`position:absolute` dans un spacer de 56px) → en
  s'étendant il passe AU-DESSUS du contenu sans le pousser (donc 0 décalage du
  contenu au hover, comme la page Training). Ombre portée quand étendue.
- État `expanded` via `onMouseEnter/Leave`. Texte masqué (`overflow:hidden`)
  quand replié.

## FIX 3 — Largeur de contenu identique entre onglets
- Conteneur **unique** `.profile-section-container` autour du contenu :
  `width:100%; max-width:900px; margin:0 auto`. Toutes les sections rendent
  dedans → largeur identique (Profil = Notifications = Réglages IA).
- Les blocs n'ont pas de max-width propre (cartes en 100%).

## Vérifs
- Mobile : 3 onglets entiers, ~33% chacun, soulignement gradient cyan.
- Desktop : rail 56px → 220px au hover (fluide), contenu non décalé, largeur
  identique sur les 3 onglets, centré max-width 900.
- npm run build : 0 erreur.
