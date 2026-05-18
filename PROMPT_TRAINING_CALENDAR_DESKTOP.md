# Training — Vue calendrier Apple style sur desktop aussi

## Contexte
La refonte calendrier style Apple Calendar a été appliquée 
uniquement sur mobile (< 768px). 
Appliquer le MÊME design sur desktop.

## Ce qu'il faut faire
Supprimer la condition media query / useMediaQuery qui limite 
le nouveau calendrier au mobile.
Le nouveau composant calendrier (scroll continu, mois sticky, 
dots colorés par activité, bottom sheet au clic) doit s'afficher 
sur TOUTES les tailles d'écran.

## Adaptations desktop
- Cellules jour plus grandes (min-height 90px)
- Numéros de jour : 20px
- Sous les dots, afficher aussi le texte court de l'activité 
  (type + durée, ex: "Vélo · 1h35") tronqué si trop long
- Maximum 3 activités texte visibles par cellule, 
  "+2 autres" si plus
- Au clic sur un jour : au lieu d'un bottom sheet, afficher 
  un panneau latéral droit ou un popover sous la cellule 
  avec la liste complète des activités
- Header du mois sticky : même style (gros, gras, gauche)
- Scroll continu vertical identique au mobile
- Largeur max du calendrier : 1200px, centré

## Supprimer l'ancien calendrier
L'ancien composant calendrier (avec "5 sem. / 10 sem." et 
"Précédent") n'est plus utilisé. Le supprimer ou le commenter.
Le nouveau calendrier scroll continu le remplace partout.
