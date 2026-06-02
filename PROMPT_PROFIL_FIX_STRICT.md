# Mon Profil — fix strict : overflow mobile + rail bord gauche

## BUG 1 — Mobile : overflow horizontal (3ᵉ onglet coupé)
Cause : le contenu débordait la largeur du viewport. Fixes :
- `.profile-shell` : `width:100%; max-width:100%; overflow-x:hidden; box-sizing:border-box`.
- `.profile-section-container` : `max-width:900px; margin:0 auto; box-sizing:border-box; overflow-wrap:break-word`.
- Onglets : `flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis`,
  labels courts (« Réglages » au lieu de « Réglages IA »), `font-size:13px`
  (12px sous 380px via media query). → 3 onglets entiers, répartis à 33 %.

## BUG 2 — Desktop : rail collé au bord gauche
Cause : tout le contenu était dans un shell centré (`max-width:1080; margin:0 auto`)
→ le rail apparaissait au milieu de la page.
Fix : sur desktop, layout **pleine largeur** (plus de shell centré) :
```
[ rail 56px (sticky, bord gauche) ] [ <main> flex:1 : header + contenu centré 900 ]
```
- Le rail est `position:sticky` collé au bord gauche du contenu (juste à droite
  de la sidebar app), `border-right`, 56px → 232px au **hover** (overlay vers la
  droite, pas de décalage du contenu).
- Le `<main>` (flex:1) contient le header « Mon Profil » + le
  `.profile-section-container` (max-width 900 centré → largeur identique sur les
  3 onglets).
- Mobile (<1024) : pas de rail, onglets en haut (BUG 1).

## Vérifs
- 375px : 3 onglets entiers, aucun texte coupé, pas de scroll horizontal.
- 1440px : rail au bord gauche, hover 56→232, contenu centré identique partout.
- npm run build : 0 erreur.
